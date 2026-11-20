import { describe, expect, it } from 'vitest';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getMonthlyEnvelopeAllocation,
  getTotalMonthlyEnvelopes,
} from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import { createDemoState, createNewUserState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import { buildTransactionsCsv } from '../utils/backupExport';
import { computeSpendingBreakdown } from '../utils/insightsEngine';

describe('Spending Envelopes', () => {
  it('computes monthly carve-out totals accurately for per_payday and monthly cadences', () => {
    const envelopes = [
      {
        id: 'e1',
        name: 'Date Fund',
        icon: 'heart',
        amountPerCycle: 7500,
        cadence: 'per_payday' as const,
        rolloverMode: 'rollover' as const,
        balance: 7500,
      },
      {
        id: 'e2',
        name: 'Coffee Fund',
        icon: 'coffee',
        amountPerCycle: 1500,
        cadence: 'monthly' as const,
        rolloverMode: 'reset' as const,
        balance: 1500,
      },
    ];

    expect(getMonthlyEnvelopeAllocation(envelopes[0], 2)).toBe(15000);
    expect(getMonthlyEnvelopeAllocation(envelopes[0], 1)).toBe(7500);
    expect(getMonthlyEnvelopeAllocation(envelopes[1], 2)).toBe(1500);
    expect(getTotalMonthlyEnvelopes(envelopes, 2)).toBe(16500);

    const state = createNewUserState('2026-04-10');
    // Income 50,000 - Bills 15,000 - Savings 5,000 - Envelopes 16,500 = 13,500 / 30 = 450/day
    const daily = computeBaseDailyAllowance(
      { ...state.settings, monthlyIncome: 50000 },
      getTotalMonthlyEnvelopes(envelopes, 2),
      new Date(2026, 3, 10),
    );
    expect(daily).toBe(450);
  });

  it('adds, edits, and removes envelopes cleanly', () => {
    let state = createNewUserState('2026-04-10');
    state = budgetReducer(state, {
      type: 'ADD_ENVELOPE',
      name: 'Date Fund',
      icon: 'heart',
      amountPerCycle: 7500,
      cadence: 'per_payday',
      rolloverMode: 'rollover',
    });

    expect(state.envelopes).toHaveLength(1);
    expect(state.envelopes[0]).toMatchObject({
      name: 'Date Fund',
      amountPerCycle: 7500,
      balance: 7500,
      cadence: 'per_payday',
      rolloverMode: 'rollover',
    });

    const id = state.envelopes[0].id;
    state = budgetReducer(state, {
      type: 'UPDATE_ENVELOPE',
      id,
      name: 'Partner Date Fund',
      icon: 'star',
      amountPerCycle: 8000,
      cadence: 'per_payday',
      rolloverMode: 'reset',
      balance: 5000,
    });
    expect(state.envelopes[0]).toMatchObject({
      name: 'Partner Date Fund',
      amountPerCycle: 8000,
      rolloverMode: 'reset',
      balance: 5000,
    });

    state = budgetReducer(state, { type: 'DELETE_ENVELOPE', id });
    expect(state.envelopes).toHaveLength(0);
  });

  it('spends guilt-free from an envelope without reducing daily Safe-to-Spend and restores losslessly on undo', () => {
    let state = createNewUserState('2026-04-10');
    state = budgetReducer(state, {
      type: 'ADD_ENVELOPE',
      name: 'Date Fund',
      icon: 'heart',
      amountPerCycle: 7500,
      cadence: 'per_payday',
      rolloverMode: 'rollover',
    });
    const envId = state.envelopes[0].id;
    state = { ...state, cashOnHand: 800 };

    const dailyBase = computeBaseDailyAllowance(
      state.settings,
      getTotalMonthlyEnvelopes(state.envelopes, state.settings.salaryFrequency),
      new Date(2026, 3, 10),
    );

    // Spend 1200 from Date Fund using Cash (800 cash clamps to 0, delta = 800)
    state = budgetReducer(state, {
      type: 'SPEND_FROM_ENVELOPE',
      envelopeId: envId,
      amount: 1200,
      label: 'Anniversary Dinner',
      icon: 'heart',
      paymentSourceId: 'cash',
      category: 'food',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });

    expect(state.envelopes[0].balance).toBe(6300);
    expect(state.cashOnHand).toBe(0);
    expect(state.entries[0]).toMatchObject({
      type: 'envelope_spend',
      envelopeId: envId,
      previousEnvelopeBalance: 7500,
      appliedWalletDelta: 800,
    });

    // Safe-to-Spend Today is completely untouched by envelope spending
    const summary = computeDayMetricsFromEntries(
      state.entries,
      '2026-04-10',
      dailyBase,
      0,
      '2026-04-10',
      '2026-04-10',
    );
    expect(summary.spent).toBe(0);
    expect(summary.safeRemaining).toBe(dailyBase);

    // Appears in Spending Breakdown and CSV
    const breakdown = computeSpendingBreakdown(
      state.entries,
      'month',
      new Date(2026, 3, 10),
      '2026-04',
    );
    expect(breakdown.totalSpent).toBe(1200);
    expect(breakdown.topSlice?.key).toBe('food');
    expect(buildTransactionsCsv(state.entries)).toContain(
      '2026-04-10,envelope_spend,Anniversary Dinner,Cash,-1200',
    );

    // Undo restores both Date Fund (7500) and clamped Cash (800)
    state = budgetReducer(state, {
      type: 'UNDO_ENTRY',
      entryId: state.entries[0].id,
    });
    expect(state.envelopes[0].balance).toBe(7500);
    expect(state.cashOnHand).toBe(800);
    expect(state.entries).toHaveLength(0);
  });

  it('refills envelopes via Rollover vs Reset and reverses cleanly on undo including Payday Check-In refills', () => {
    let state = createNewUserState('2026-04-15');
    state = budgetReducer(state, {
      type: 'ADD_ENVELOPE',
      name: 'Date Fund',
      icon: 'heart',
      amountPerCycle: 7500,
      cadence: 'per_payday',
      rolloverMode: 'rollover',
    });
    state = budgetReducer(state, {
      type: 'ADD_ENVELOPE',
      name: 'Fun Cap',
      icon: 'star',
      amountPerCycle: 2000,
      cadence: 'per_payday',
      rolloverMode: 'reset',
    });

    // Simulate unused leftovers (Date Fund: 1,500 left; Fun Cap: 500 left)
    state = {
      ...state,
      envelopes: [
        { ...state.envelopes[0], balance: 1500 },
        { ...state.envelopes[1], balance: 500 },
      ],
    };

    // Payday Check-In refills both according to each envelope's rule
    const bankId = state.banks[0].id;
    const bankStart = state.banks[0].balance;
    state = budgetReducer(state, {
      type: 'LOG_PAYDAY_CHECKIN',
      amount: 20000,
      sourceId: bankId,
      savingsAllocation: 3000,
      todayKey: '2026-04-15',
      refillEnvelopeIds: [state.envelopes[0].id, state.envelopes[1].id],
    });

    expect(state.envelopes[0].balance).toBe(9000); // 1500 + 7500 rollover
    expect(state.envelopes[1].balance).toBe(2000); // reset to 2000

    // Undo payday check-in restores bank, savings, AND both envelope balances
    state = budgetReducer(state, {
      type: 'UNDO_ENTRY',
      entryId: state.entries[0].id,
    });
    expect(state.banks[0].balance).toBe(bankStart);
    expect(state.monthlySaved).toBe(0);
    expect(state.envelopes[0].balance).toBe(1500);
    expect(state.envelopes[1].balance).toBe(500);

    // Direct manual REFILL_ENVELOPE & undo + CSV (csvSignedAmount === 0)
    state = budgetReducer(state, {
      type: 'REFILL_ENVELOPE',
      envelopeId: state.envelopes[0].id,
      todayKey: '2026-04-16',
    });
    expect(state.envelopes[0].balance).toBe(9000);
    expect(buildTransactionsCsv(state.entries)).toContain(
      '2026-04-16,envelope_refill,Refilled Date Fund,,0',
    );
    state = budgetReducer(state, {
      type: 'UNDO_ENTRY',
      entryId: state.entries[0].id,
    });
    expect(state.envelopes[0].balance).toBe(1500);
  });

  it('normalizes envelopes safely on persistence load and seeds demo Date Fund', () => {
    const demo = createDemoState('2026-04-15');
    expect(demo.envelopes.length).toBeGreaterThan(0);
    expect(demo.envelopes[0].name).toBe('Date Fund');

    const normalized = normalizePersistedState({
      envelopes: [
        {
          id: 'e1',
          name: 'Date Fund',
          icon: 'heart',
          amountPerCycle: -500,
          cadence: 'bad' as unknown as 'per_payday',
          rolloverMode: 'bad' as unknown as 'rollover',
          balance: -100,
        },
      ],
    });
    expect(normalized.envelopes[0]).toMatchObject({
      amountPerCycle: 0,
      cadence: 'per_payday',
      rolloverMode: 'rollover',
      balance: 0,
    });
  });
});
