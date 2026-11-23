import { describe, expect, it } from 'vitest';
import {
  BudgetAction,
  budgetReducer,
  canUndoEntry,
} from '../state/budgetReducer';
import { createNewUserState, PersistedBudgetState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';

function makeReducerState(overrides: Partial<PersistedBudgetState> = {}): PersistedBudgetState {
  const base = createNewUserState('2026-04-10');
  return {
    ...base,
    hasCompletedOnboarding: true,
    cashOnHand: 1000,
    banks: [{ id: 'bank-bpi', name: 'BPI', balance: 500 }],
    creditCards: [{ id: 'cc-bdo', name: 'BDO Visa', limit: 10000, used: 1000, cutoffDay: 15 }],
    treats: [
      {
        id: 'treat-1',
        name: 'Concert',
        icon: 'gift',
        target: 2000,
        funded: 500,
        fromImpulses: 100,
        fromRollovers: 0,
        claimed: false,
      },
    ],
    activeTreatId: 'treat-1',
    ...overrides,
  };
}

describe('budgetReducer & persistence', () => {
  it('losslessly restores 0-clamped cash, bank, and credit card balances on UNDO_ENTRY', () => {
    // 1) Cash spend larger than cashOnHand (200 - 500 -> clamped to 0, delta = -200)
    let state = makeReducerState({ cashOnHand: 200 });
    state = budgetReducer(state, {
      type: 'LOG_SPEND',
      amount: 500,
      label: 'Groceries',
      icon: 'shopping-bag',
      paymentSourceId: 'cash',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(state.cashOnHand).toBe(0);
    expect(state.entries[0].appliedWalletDelta).toBe(200);

    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: state.entries[0].id });
    expect(state.cashOnHand).toBe(200); // never fabricates 500
    expect(state.entries).toHaveLength(0);

    // 2) Bank spend larger than bank balance (100 - 350 -> clamped to 0, delta = -100)
    state = makeReducerState({ banks: [{ id: 'bank-bpi', name: 'BPI', balance: 100 }] });
    state = budgetReducer(state, {
      type: 'LOG_SPEND',
      amount: 350,
      label: 'Bills',
      icon: 'zap',
      paymentSourceId: 'bank-bpi',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(state.banks[0].balance).toBe(0);
    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: state.entries[0].id });
    expect(state.banks[0].balance).toBe(100);

    // 3) Credit card spend adds to used and undo subtracts cleanly
    state = makeReducerState();
    state = budgetReducer(state, {
      type: 'LOG_SPEND',
      amount: 450,
      label: 'Dinner',
      icon: 'shopping-bag',
      paymentSourceId: 'cc-bdo',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(state.creditCards[0].used).toBe(1450);
    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: state.entries[0].id });
    expect(state.creditCards[0].used).toBe(1000);
  });

  it('decrements paidMonths when undoing MARK_INSTALLMENT_PAID', () => {
    let state = makeReducerState({
      installments: [
        {
          id: 'inst-1',
          name: 'Phone',
          provider: 'BDO',
          monthlyAmount: 2000,
          totalMonths: 12,
          paidMonths: 3,
          includeInBudget: true,
        },
      ],
    });
    state = budgetReducer(state, {
      type: 'MARK_INSTALLMENT_PAID',
      id: 'inst-1',
      todayKey: '2026-04-10',
    });
    expect(state.installments[0].paidMonths).toBe(4);
    expect(state.entries[0].type).toBe('installment_paid');

    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: state.entries[0].id });
    expect(state.installments[0].paidMonths).toBe(3);
    expect(state.entries).toHaveLength(0);
  });

  it('blocks undoing entries linked to an already-claimed treat', () => {
    const state = makeReducerState({
      treats: [
        {
          id: 'treat-claimed',
          name: 'Trip',
          icon: 'gift',
          target: 1000,
          funded: 1000,
          fromImpulses: 1000,
          fromRollovers: 0,
          claimed: true,
        },
      ],
      entries: [
        {
          id: 'td-1',
          type: 'treat_direct',
          amount: 500,
          label: 'Treat Fund',
          icon: 'gift',
          timestamp: '2026-04-10T05:00:00.000Z',
          dateKey: '2026-04-10',
          treatId: 'treat-claimed',
        },
      ],
    });

    expect(canUndoEntry(state, 'td-1').ok).toBe(false);
    const afterUndo = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: 'td-1' });
    expect(afterUndo).toBe(state);
  });

  it('reverses -20 score for manual BANK_TODAY_SURPLUS and -10 for auto midnight rollover', () => {
    // Manual banking via BANK_TODAY_SURPLUS
    let manualState = makeReducerState({
      disciplineScore: 760,
      activeTreatId: '',
      treats: [],
    });
    manualState = budgetReducer(manualState, {
      type: 'BANK_TODAY_SURPLUS',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(manualState.disciplineScore).toBe(780);
    expect(manualState.entries[0].isAutoRollover).toBeUndefined();
    manualState = budgetReducer(manualState, {
      type: 'UNDO_ENTRY',
      entryId: manualState.entries[0].id,
    });
    expect(manualState.disciplineScore).toBe(760);

    // Auto midnight rollover via APPLY_ROLLOVER
    let autoState = makeReducerState({
      disciplineScore: 760,
      activeTreatId: '',
      treats: [],
    });
    autoState = budgetReducer(autoState, {
      type: 'APPLY_ROLLOVER',
      newDateKey: '2026-04-11',
      minimumSplitFallback: 0,
    });
    expect(autoState.disciplineScore).toBe(770);
    expect(autoState.entries[0].isAutoRollover).toBe(true);
    autoState = budgetReducer(autoState, {
      type: 'UNDO_ENTRY',
      entryId: autoState.entries[0].id,
    });
    expect(autoState.disciplineScore).toBe(760);
  });

  it('retains existing data when COMPLETE_ONBOARDING runs with preserveExistingData: true', () => {
    const initial = makeReducerState({
      monthlySaved: 4200,
      sinkingFunds: [
        { id: 'sf-1', name: 'EF', icon: 'shield', target: 50000, saved: 8000, monthsToGoal: 6 },
      ],
      entries: [
        {
          id: 'e-1',
          type: 'spend',
          amount: 150,
          label: 'Lunch',
          icon: 'shopping-bag',
          timestamp: '2026-04-10T04:00:00.000Z',
          dateKey: '2026-04-10',
        },
      ],
    });

    const updated = budgetReducer(initial, {
      type: 'COMPLETE_ONBOARDING',
      params: {
        income: 55000,
        bills: 12000,
        billItems: [{ id: 'b-new', name: 'Rent', icon: 'home', amount: 12000 }],
        savings: 10000,
        salaryFrequency: 1,
        payday1: 25,
        payday2: 30,
        cashOnHand: 3000,
        preserveExistingData: true,
      },
    });

    expect(updated.settings.monthlyIncome).toBe(55000);
    expect(updated.monthlySaved).toBe(4200);
    expect(updated.entries).toHaveLength(1);
    expect(updated.treats).toHaveLength(1);
    expect(updated.sinkingFunds).toHaveLength(1);
  });

  it('normalizes persisted state keeping empty billItems: [] and retaining >80 entries', () => {
    const manyEntries = Array.from({ length: 120 }, (_, i) => ({
      id: `e-${i}`,
      type: 'spend' as const,
      amount: 50,
      label: `Item ${i}`,
      icon: 'tag',
      timestamp: '2026-04-10T04:00:00.000Z',
      dateKey: '2026-04-10',
    }));

    const normalized = normalizePersistedState({
      billItems: [],
      cashOnHand: -500,
      disciplineScore: 5000,
      entries: manyEntries,
    });

    expect(normalized.billItems).toEqual([]);
    expect(normalized.settings.fixedBills).toBe(0);
    expect(normalized.cashOnHand).toBe(0);
    expect(normalized.disciplineScore).toBe(999);
    expect(normalized.entries).toHaveLength(120);
  });

  it('dispatches across all 6 domain slices and preserves identity on no-ops', () => {
    let state = makeReducerState();

    // lifecycleAndPrefs
    state = budgetReducer(state, { type: 'SET_THEME_MODE', mode: 'dark' });
    expect(state.themeMode).toBe('dark');

    // walletAndAccounts
    state = budgetReducer(state, {
      type: 'DEPOSIT_TO_WALLET',
      sourceId: 'cash',
      amount: 250,
      todayKey: '2026-04-10',
    });
    expect(state.cashOnHand).toBe(1250);

    // billsAndEnvelopes
    const initialBillsCount = state.billItems.length;
    state = budgetReducer(state, {
      type: 'ADD_BILL_ITEM',
      name: 'Fiber',
      icon: 'wifi',
      amount: 1500,
    });
    expect(state.billItems).toHaveLength(initialBillsCount + 1);
    expect(state.billItems[state.billItems.length - 1].name).toBe('Fiber');

    // goalsAndTreats
    state = budgetReducer(state, {
      type: 'BOOST_SAVINGS_GOAL',
      delta: 500,
    });
    expect(state.settings.monthlySavingsGoal).toBe(
      makeReducerState().settings.monthlySavingsGoal + 500
    );

    // installmentsAndDebts
    state = budgetReducer(state, {
      type: 'ADD_DEBT',
      direction: 'i_owe',
      personName: 'Alex',
      amount: 400,
    });
    expect(state.debts).toHaveLength(1);

    // dailyAndEntries
    state = budgetReducer(state, {
      type: 'SAVE_TO_JAR',
      amount: 100,
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(state.monthlySaved).toBe(100);

    // No-op / unknown action preserves identity
    const beforeNoop = state;
    expect(
      budgetReducer(state, { type: 'BOOST_SAVINGS_GOAL', delta: 0 })
    ).toBe(beforeNoop);
    expect(
      budgetReducer(state, { type: 'UNKNOWN_ACTION' } as unknown as BudgetAction)
    ).toBe(beforeNoop);
  });
});
