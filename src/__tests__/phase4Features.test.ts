import { describe, expect, it } from 'vitest';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
} from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import { createDemoState, createNewUserState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import {
  resolveThemeShade,
  VELVET_DARK_SHADE,
  VELVET_SHADE,
} from '../theme/palette';
import {
  getExpectedPaycheckAmount,
  getExpectedPaycheckSavingsSlice,
  getPaydayMatchKey,
  MonthlyArchiveSnapshot,
} from '../types/budget';
import { buildTransactionsCsv } from '../utils/backupExport';
import { buildWrapUpFromArchive, formatMonthKeyLabel } from '../utils/insightsEngine';
import { generatePersonalizedTips } from '../utils/savingsCoach';

describe('Phase 4 features', () => {
  describe('Dark Mode', () => {
    it('resolves theme shades cleanly for system, light, and dark modes', () => {
      expect(resolveThemeShade('dark', 'light')).toBe(VELVET_DARK_SHADE);
      expect(resolveThemeShade('dark', 'light').dark).toBe(true);
      expect(resolveThemeShade('light', 'dark')).toBe(VELVET_SHADE);
      expect(resolveThemeShade('light', 'dark').dark).toBe(false);
      expect(resolveThemeShade('system', 'dark')).toBe(VELVET_DARK_SHADE);
      expect(resolveThemeShade('system', 'light')).toBe(VELVET_SHADE);
      expect(resolveThemeShade('system', null)).toBe(VELVET_SHADE);
    });

    it('updates themeMode in reducer and normalizes invalid persisted themeMode values', () => {
      const initial = createNewUserState('2026-04-10');
      const next = budgetReducer(initial, { type: 'SET_THEME_MODE', mode: 'dark' });
      expect(next.themeMode).toBe('dark');

      const normalized = normalizePersistedState({
        themeMode: 'invalid' as unknown as 'system',
      });
      expect(normalized.themeMode).toBe('system');
    });
  });

  describe('Historical Months', () => {
    it('formats month keys and builds archive wrap-ups with privacy mode redaction', () => {
      expect(formatMonthKeyLabel('2026-03')).toBe('Mar 2026');
      expect(formatMonthKeyLabel('2026-12')).toBe('Dec 2026');
      expect(formatMonthKeyLabel('bad')).toBe('bad');

      const snapshot: MonthlyArchiveSnapshot = {
        monthKey: '2026-03',
        monthTitle: 'MARCH 2026 WRAP-UP',
        totalSpent: 12450,
        totalSaved: 6200,
        savingsRatePct: 18,
        monthlyIncome: 35000,
        monthlySavingsGoal: 5000,
        streakDays: 14,
        disciplineScore: 845,
        topCategoryLabel: 'Food',
        topCategoryAmount: 5400,
        topSourceLabel: 'GCash',
        txCount: 25,
        grade: 'A+',
        headline: 'Strong saving month!',
      };

      const pub = buildWrapUpFromArchive(snapshot, false);
      expect(pub.shareText).toContain('Saved: ₱6,200.00');
      expect(pub.shareText).toContain('Spent: ₱12,450.00');

      const priv = buildWrapUpFromArchive(snapshot, true);
      expect(priv.shareText).not.toContain('6,200');
      expect(priv.shareText).not.toContain('12,450');
      expect(priv.shareText).toContain('Grade: A+');
      expect(priv.shareText).toContain('Savings Rate: 18%');
      expect(priv.shareText).toContain('Streak: 14 days');
    });

    it('seeds two prior archived months in createDemoState', () => {
      const demo = createDemoState('2026-04-15');
      expect(demo.monthlyArchives.map((a) => a.monthKey)).toEqual([
        '2026-03',
        '2026-02',
      ]);
    });
  });

  describe('Actionable Bills', () => {
    it('adds/updates due days, marks bills paid with 0-clamped wallet restoration on undo, and keeps daily budget intact', () => {
      let state = createNewUserState('2026-04-10');
      state = budgetReducer(state, {
        type: 'ADD_BILL_ITEM',
        name: 'Condo Dues',
        icon: 'home',
        amount: 2500,
        dueDay: 45, // clamped to 31
      });
      const addedBill = state.billItems[state.billItems.length - 1];
      expect(addedBill.dueDay).toBe(31);

      state = budgetReducer(state, {
        type: 'UPDATE_BILL_DUE_DAY',
        billId: addedBill.id,
        dueDay: 12,
      });
      expect(
        state.billItems.find((b) => b.id === addedBill.id)?.dueDay
      ).toBe(12);

      // Clear due day
      state = budgetReducer(state, {
        type: 'UPDATE_BILL_DUE_DAY',
        billId: addedBill.id,
        dueDay: undefined,
      });
      expect(
        state.billItems.find((b) => b.id === addedBill.id)?.dueDay
      ).toBeUndefined();

      // Pay bill larger than cash balance (2000 cash < 8000 rent) -> clamps cash to 0, records delta 2000
      state = { ...state, cashOnHand: 2000 };
      const rentId = state.billItems[0].id;
      const beforeDailyBase = computeBaseDailyAllowance(
        state.settings,
        0,
        new Date(2026, 3, 10)
      );

      state = budgetReducer(state, {
        type: 'MARK_BILL_PAID',
        billId: rentId,
        paymentSourceId: 'cash',
        amountOverride: 8000,
        todayKey: '2026-04-10',
      });
      expect(state.cashOnHand).toBe(0);
      expect(state.billItems[0].lastPaidMonth).toBe('2026-04');
      expect(state.entries[0].type).toBe('bill_paid');
      expect(state.entries[0].appliedWalletDelta).toBe(2000);

      // Daily safeRemaining ignores bill_paid
      const summary = computeDayMetricsFromEntries(
        state.entries,
        '2026-04-10',
        beforeDailyBase,
        0,
        '2026-04-10',
        '2026-04-10'
      );
      expect(summary.spent).toBe(0);
      expect(summary.safeRemaining).toBe(beforeDailyBase);

      // Double paying same bill in same month is ignored
      const duplicateAttempt = budgetReducer(state, {
        type: 'MARK_BILL_PAID',
        billId: rentId,
        paymentSourceId: 'bank-bpi',
        todayKey: '2026-04-12',
      });
      expect(duplicateAttempt).toBe(state);

      // CSV exports bill_paid as negative
      const csv = buildTransactionsCsv(state.entries);
      expect(csv).toContain(',bill_paid,Paid Bill: Rent / Housing,Cash,-8000');

      // Undo restores exact applied delta (2000, not 8000) and restores previousBillPaidMonth
      state = budgetReducer(state, {
        type: 'UNDO_ENTRY',
        entryId: state.entries[0].id,
      });
      expect(state.cashOnHand).toBe(2000);
      expect(state.billItems[0].lastPaidMonth).toBeUndefined();
    });

    it('emits unpaid bill due reminder tip in Coach and masks amount in privacyMode', () => {
      const todayDay = new Date().getDate();
      const base = createNewUserState('2026-04-10');
      const unpaidDueBill = {
        id: 'bill-test',
        name: 'Maynilad Water',
        icon: 'droplet',
        amount: 987,
        dueDay: todayDay,
      };

      const pubTips = generatePersonalizedTips({
        settings: base.settings,
        monthlySaved: 0,
        baseDailyAllowance: 500,
        safeToSpendToday: 500,
        cashOnHand: 2000,
        banks: base.banks,
        creditCards: [],
        treats: [],
        entries: [],
        streakDays: 1,
        privacyMode: false,
        billItems: [unpaidDueBill],
        currentMonthKey: '2026-04',
      });
      const billTipPub = pubTips.find((t) => t.id === 'bill-due-bill-test');
      expect(billTipPub?.title).toContain('due today');
      expect(billTipPub?.body).toContain('987');

      const privTips = generatePersonalizedTips({
        settings: base.settings,
        monthlySaved: 0,
        baseDailyAllowance: 500,
        safeToSpendToday: 500,
        cashOnHand: 2000,
        banks: base.banks,
        creditCards: [],
        treats: [],
        entries: [],
        streakDays: 1,
        privacyMode: true,
        billItems: [unpaidDueBill],
        currentMonthKey: '2026-04',
      });
      const billTipPriv = privTips.find((t) => t.id === 'bill-due-bill-test');
      expect(billTipPriv?.body).toContain('₱••••');
      expect(billTipPriv?.body).not.toContain('987');
    });
  });

  describe('Payday Check-In', () => {
    it('matches paydays accurately including February end-of-month clamping and paycheck math', () => {
      const settings = {
        monthlyIncome: 40000,
        fixedBills: 15000,
        monthlySavingsGoal: 6000,
        salaryFrequency: 2 as const,
        payday1: 15,
        payday2: 30,
      };

      expect(getExpectedPaycheckAmount(settings)).toBe(20000);
      expect(getExpectedPaycheckSavingsSlice(settings)).toBe(3000);

      expect(getPaydayMatchKey(settings, new Date(2026, 3, 15))).toBe(
        '2026-04-15'
      );
      // Feb 2026 has 28 days -> payday2=30 clamps to 28
      expect(getPaydayMatchKey(settings, new Date(2026, 1, 28))).toBe(
        '2026-02-28'
      );
      expect(getPaydayMatchKey(settings, new Date(2026, 3, 14))).toBeNull();
    });

    it('credits salary, savings allocation, discipline score, and restores cleanly on undo & dismiss', () => {
      let state = createNewUserState('2026-04-15');
      const startBankBal = state.banks[0].balance; // 12000

      state = budgetReducer(state, {
        type: 'LOG_PAYDAY_CHECKIN',
        amount: 17500,
        sourceId: state.banks[0].id,
        savingsAllocation: 2500,
        note: 'Mid-month Salary',
        todayKey: '2026-04-15',
      });

      expect(state.banks[0].balance).toBe(startBankBal + 17500);
      expect(state.monthlySaved).toBe(2500);
      expect(state.disciplineScore).toBe(815);
      expect(state.lastPaydayCheckInKey).toBe('2026-04-15');
      expect(state.entries[0]).toMatchObject({
        type: 'wallet_deposit',
        isPaydayCheckIn: true,
        savingsDelta: 2500,
        amount: 17500,
      });

      // Undo reverses bank balance, monthlySaved, disciplineScore, and lastPaydayCheckInKey
      state = budgetReducer(state, {
        type: 'UNDO_ENTRY',
        entryId: state.entries[0].id,
      });
      expect(state.banks[0].balance).toBe(startBankBal);
      expect(state.monthlySaved).toBe(0);
      expect(state.disciplineScore).toBe(800);
      expect(state.lastPaydayCheckInKey).toBe('');

      // Dismiss updates lastPaydayCheckInKey without changing wallet balances
      const dismissed = budgetReducer(state, {
        type: 'DISMISS_PAYDAY_PROMPT',
        dateKey: '2026-04-15',
      });
      expect(dismissed.lastPaydayCheckInKey).toBe('2026-04-15');
      expect(dismissed.banks[0].balance).toBe(startBankBal);
    });
  });
});
