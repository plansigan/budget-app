import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeDayMetricsFromEntries } from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import { createNewUserState, PersistedBudgetState } from '../state/defaults';
import {
  loadPersistedStateWithStatus,
  normalizePersistedState,
  savePersistedState,
  STORAGE_KEY,
} from '../state/persistence';
import { applyMidnightRollover } from '../state/rollover';
import {
  getDaysUntilDayOfMonth,
  getPaydayMatchKey,
  TransactionEntry,
} from '../types/budget';
import {
  buildTransactionsCsv,
  parseBackupJson,
  serializeBackupJson,
  summarizeBackupJson,
} from '../utils/backupExport';
import { computeSpendingBreakdown } from '../utils/insightsEngine';

function makeRolloverState(
  overrides: Partial<PersistedBudgetState> = {}
): PersistedBudgetState {
  const base = createNewUserState('2026-12-31');
  return {
    ...base,
    hasCompletedOnboarding: true,
    settings: {
      monthlyIncome: 31000,
      fixedBills: 10000,
      monthlySavingsGoal: 6000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    },
    billItems: [
      { id: 'bill-1', name: 'Rent', icon: 'home', amount: 10000, dueDay: 1 },
    ],
    activeTreatId: '',
    treats: [],
    monthlySaved: 1800,
    rolloverBalance: 0,
    ...overrides,
  };
}

describe('hardening & edge-case guarantees', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('archives December and resets monthlySaved on Dec 31 -> Jan 1 year rollover', () => {
    const decState = makeRolloverState({
      lastActiveDate: '2026-12-31',
      monthlySaved: 4200,
      streakDays: 10,
      entries: [
        {
          id: 'sp-dec-31',
          type: 'spend',
          amount: 100,
          label: 'Year-End Coffee',
          icon: 'coffee',
          timestamp: '2026-12-31T08:00:00.000Z',
          dateKey: '2026-12-31',
          category: 'cafe',
        },
      ],
    });

    // Dec has 31 days: (31000 - 10000 - 6000) / 31 = 483.87/day; spent 100 -> 383.87 left -> 191.94 split
    const res = applyMidnightRollover(decState, '2027-01-01', 0);

    expect(res.nextState.lastActiveDate).toBe('2027-01-01');
    expect(res.nextState.monthlySaved).toBe(0);
    expect(res.nextState.rolloverBalance).toBe(res.rolloverNext);
    expect(res.nextState.monthlyArchives).toHaveLength(1);
    expect(res.nextState.monthlyArchives[0].monthKey).toBe('2026-12');
    expect(res.nextState.monthlyArchives[0].totalSaved).toBe(
      Math.round(4200 + res.vaultAdded)
    );
    expect(res.nextState.monthlyArchives[0].totalSpent).toBe(100);
  });

  it('handles Feb 28 -> Feb 29 -> Mar 1 leap-year rollover and payday clamping', () => {
    const leapState = makeRolloverState({
      lastActiveDate: '2028-02-28',
      monthlySaved: 2500,
    });

    // Feb 28 -> Feb 29 (still February 2028, must NOT reset monthlySaved or archive yet)
    const feb29Res = applyMidnightRollover(leapState, '2028-02-29', 0);
    expect(feb29Res.nextState.lastActiveDate).toBe('2028-02-29');
    expect(feb29Res.nextState.monthlySaved).toBeGreaterThan(2500);
    expect(feb29Res.nextState.monthlyArchives).toHaveLength(0);

    // Feb 29 -> Mar 1 (archives 2028-02 and resets monthlySaved)
    const mar1Res = applyMidnightRollover(feb29Res.nextState, '2028-03-01', 0);
    expect(mar1Res.nextState.lastActiveDate).toBe('2028-03-01');
    expect(mar1Res.nextState.monthlySaved).toBe(0);
    expect(mar1Res.nextState.monthlyArchives).toHaveLength(1);
    expect(mar1Res.nextState.monthlyArchives[0].monthKey).toBe('2028-02');

    // Payday 30th/31st clamping in leap Feb 2028 vs non-leap Feb 2026
    const settings30 = {
      monthlyIncome: 30000,
      fixedBills: 10000,
      monthlySavingsGoal: 5000,
      salaryFrequency: 2 as const,
      payday1: 15,
      payday2: 30,
    };

    expect(getDaysUntilDayOfMonth(30, new Date(2028, 1, 28))).toBe(1);
    expect(getPaydayMatchKey(settings30, new Date(2028, 1, 28))).toBeNull();
    expect(getPaydayMatchKey(settings30, new Date(2028, 1, 29))).toBe(
      '2028-02-29'
    );

    expect(getDaysUntilDayOfMonth(30, new Date(2026, 1, 27))).toBe(1);
    expect(getPaydayMatchKey(settings30, new Date(2026, 1, 28))).toBe(
      '2026-02-28'
    );
  });

  it('recovers safely from corrupted storage payloads and returns false on storage write failures', async () => {
    // Empty storage -> non-corrupted null
    const emptyRes = await loadPersistedStateWithStatus();
    expect(emptyRes).toEqual({ state: null, corrupted: false });

    // Corrupted JSON -> flagged cleanly without throwing
    await AsyncStorage.setItem(STORAGE_KEY, '{not-valid-json');
    const badJsonRes = await loadPersistedStateWithStatus();
    expect(badJsonRes).toEqual({ state: null, corrupted: true });

    // Non-object JSON array -> flagged cleanly
    await AsyncStorage.setItem(STORAGE_KEY, '[1, 2, 3]');
    const arrayJsonRes = await loadPersistedStateWithStatus();
    expect(arrayJsonRes).toEqual({ state: null, corrupted: true });

    // Partial/malformed fields sanitized via normalizePersistedState
    const sanitized = normalizePersistedState({
      settings: {
        monthlyIncome: Number.NaN,
        fixedBills: -500,
        monthlySavingsGoal: Number.POSITIVE_INFINITY,
        salaryFrequency: 2,
        payday1: 99,
        payday2: -4,
      },
      cashOnHand: -250,
      disciplineScore: 100,
      lastBackupAt: 'invalid-date',
      entries: 'corrupted' as unknown as TransactionEntry[],
      banks: null as unknown as PersistedBudgetState['banks'],
      envelopes: undefined,
    });
    expect(sanitized.settings.monthlyIncome).toBe(35000);
    expect(sanitized.settings.monthlySavingsGoal).toBe(5000);
    expect(sanitized.settings.payday1).toBe(31);
    expect(sanitized.settings.payday2).toBe(1);
    expect(sanitized.cashOnHand).toBe(0);
    expect(sanitized.disciplineScore).toBe(700);
    expect(sanitized.lastBackupAt).toBeUndefined();
    expect(sanitized.entries).toEqual([]);
    expect(Array.isArray(sanitized.banks)).toBe(true);
    expect(Array.isArray(sanitized.envelopes)).toBe(true);

    // Storage write rejection returns false instead of throwing
    vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(
      new Error('QuotaExceededError')
    );
    const writeOk = await savePersistedState(createNewUserState('2026-11-20'));
    expect(writeOk).toBe(false);
  });

  it('processes 1,200+ transaction entries accurately across metrics, breakdown, and CSV export', () => {
    const entries: TransactionEntry[] = [];
    for (let i = 0; i < 1200; i += 1) {
      const dayNum = (i % 30) + 1;
      const dateKey = `2026-11-${String(dayNum).padStart(2, '0')}`;
      entries.push({
        id: `tx-${i}`,
        type: i % 4 === 0 ? 'envelope_spend' : 'spend',
        amount: 100,
        label: i === 0 ? '=CMD()' : `Purchase #${i}`,
        icon: 'shopping-bag',
        timestamp: `${dateKey}T05:00:00.000Z`,
        dateKey,
        category: i % 2 === 0 ? 'food' : 'cafe',
        paymentSourceId: 'cash',
        paymentSourceLabel: 'Cash',
      });
    }

    // On day 15 (i % 30 === 14): 30 % 4 === 2, so i % 4 alternates 2 ('spend') and 0 ('envelope_spend') -> 20 spends = 2,000
    const daySummary = computeDayMetricsFromEntries(
      entries,
      '2026-11-15',
      500,
      0,
      '2026-11-15',
      '2026-11-15'
    );
    expect(daySummary.entriesCount).toBe(40);
    expect(daySummary.spent).toBe(2000);

    // Both spend (900) and envelope_spend (300) are included in spending category breakdown -> 1200 entries * 100 = 120,000
    const breakdown = computeSpendingBreakdown(
      entries,
      'month',
      new Date(2026, 10, 15),
      '2026-11'
    );
    expect(breakdown.count).toBe(1200);
    expect(breakdown.totalSpent).toBe(120000);

    const csv = buildTransactionsCsv(entries);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1201);
    expect(csv).toContain("'=CMD()");
  });

  it('preserves full state fidelity across serialize -> parse -> summarize -> normalize round-trip', () => {
    const richState: PersistedBudgetState = {
      ...createNewUserState('2026-11-20'),
      hasCompletedOnboarding: true,
      hasSeenTutorial: true,
      lastBackupAt: '2026-11-20T09:00:00.000Z',
      billItems: [
        {
          id: 'bill-net',
          name: 'Fiber Internet',
          icon: 'wifi',
          amount: 1699,
          dueDay: 18,
          lastPaidMonth: '2026-11',
        },
      ],
      envelopes: [
        {
          id: 'env-date',
          name: 'Date Fund',
          icon: 'heart',
          amountPerCycle: 7500,
          cadence: 'per_payday',
          rolloverMode: 'rollover',
          balance: 6250,
          lastRefillKey: '2026-11-15',
        },
      ],
      installments: [
        {
          id: 'inst-1',
          name: 'Laptop',
          provider: 'BDO 0%',
          monthlyAmount: 3000,
          totalMonths: 12,
          paidMonths: 5,
          includeInBudget: true,
        },
      ],
      entries: [
        {
          id: 'e-1',
          type: 'envelope_spend',
          amount: 1250,
          label: 'Dinner Date',
          icon: 'heart',
          timestamp: '2026-11-19T12:00:00.000Z',
          dateKey: '2026-11-19',
          envelopeId: 'env-date',
        },
      ],
    };

    const json = serializeBackupJson(richState);
    const parsed = parseBackupJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(typeof parsed.exportedAt).toBe('string');

    const summaryRes = summarizeBackupJson(json);
    expect(summaryRes.ok).toBe(true);
    if (summaryRes.ok) {
      expect(summaryRes.summary.entriesCount).toBe(1);
      expect(summaryRes.summary.envelopesCount).toBe(1);
      expect(summaryRes.summary.billItemsCount).toBe(1);
      expect(summaryRes.summary.installmentsCount).toBe(1);
    }

    const restored = normalizePersistedState(
      parsed.data as Partial<PersistedBudgetState>
    );
    expect(restored.lastBackupAt).toBe('2026-11-20T09:00:00.000Z');
    expect(restored.billItems[0].lastPaidMonth).toBe('2026-11');
    expect(restored.envelopes[0].balance).toBe(6250);
    expect(restored.envelopes[0].amountPerCycle).toBe(7500);
    expect(restored.installments[0].paidMonths).toBe(5);
  });

  it('handles Track 2 edit actions and MARK_BACKUP_EXPORTED without losing balances or history', () => {
    let state: PersistedBudgetState = {
      ...createNewUserState('2026-11-20'),
      billItems: [
        {
          id: 'b-1',
          name: 'Internet',
          icon: 'wifi',
          amount: 1500,
          dueDay: 15,
          lastPaidMonth: '2026-11',
        },
      ],
      banks: [{ id: 'bank-1', name: 'BPI', balance: 42000 }],
      creditCards: [
        { id: 'cc-1', name: 'BDO Visa', limit: 50000, used: 12345, cutoffDay: 10 },
      ],
      installments: [
        {
          id: 'inst-1',
          name: 'Phone',
          provider: 'BPI',
          monthlyAmount: 2000,
          totalMonths: 12,
          paidMonths: 4,
          includeInBudget: true,
        },
      ],
    };

    state = budgetReducer(state, {
      type: 'UPDATE_BILL_ITEM',
      billId: 'b-1',
      name: '  Converge Fiber  ',
      icon: 'zap',
      amount: 1699,
      dueDay: 20,
    });
    expect(state.billItems[0]).toMatchObject({
      id: 'b-1',
      name: 'Converge Fiber',
      icon: 'zap',
      amount: 1699,
      dueDay: 20,
      lastPaidMonth: '2026-11',
    });
    expect(state.settings.fixedBills).toBe(1699);

    state = budgetReducer(state, {
      type: 'UPDATE_BANK',
      bankId: 'bank-1',
      name: 'BPI Payroll',
    });
    expect(state.banks[0]).toEqual({
      id: 'bank-1',
      name: 'BPI Payroll',
      balance: 42000,
    });

    state = budgetReducer(state, {
      type: 'UPDATE_CREDIT_CARD',
      cardId: 'cc-1',
      name: 'BDO Gold',
      limit: 80000,
      cutoffDay: 45,
    });
    expect(state.creditCards[0]).toEqual({
      id: 'cc-1',
      name: 'BDO Gold',
      limit: 80000,
      used: 12345,
      cutoffDay: 31,
    });

    state = budgetReducer(state, {
      type: 'UPDATE_INSTALLMENT',
      id: 'inst-1',
      params: {
        name: 'iPhone 16 Pro',
        provider: 'BDO 0%',
        monthlyAmount: 3500,
        totalMonths: 6,
        paidMonths: 10,
        includeInBudget: false,
      },
    });
    expect(state.installments[0]).toEqual({
      id: 'inst-1',
      name: 'iPhone 16 Pro',
      provider: 'BDO 0%',
      monthlyAmount: 3500,
      totalMonths: 6,
      paidMonths: 6,
      includeInBudget: false,
    });

    state = budgetReducer(state, {
      type: 'MARK_BACKUP_EXPORTED',
      exportedAt: '2026-11-20T14:30:00.000Z',
    });
    expect(state.lastBackupAt).toBe('2026-11-20T14:30:00.000Z');
  });
});
