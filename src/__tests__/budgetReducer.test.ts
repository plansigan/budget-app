import { describe, expect, it } from 'vitest';
import {
  BudgetAction,
  budgetReducer,
  canEditEntry,
  canUndoEntry,
  getUndoEligibility,
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

  it('blocks cash and bank overdraft transfers while allowing credit card overpayment within source balance', () => {
    let state = makeReducerState({ cashOnHand: 300, banks: [{ id: 'bank-bpi', name: 'BPI', balance: 500 }] });

    // Cash overdraft blocked
    const cashOver = budgetReducer(state, {
      type: 'TRANSFER_BETWEEN_ACCOUNTS',
      fromSourceId: 'cash',
      toSourceId: 'bank-bpi',
      amount: 301,
      todayKey: '2026-04-10',
    });
    expect(cashOver).toBe(state);

    // Bank overdraft blocked
    const bankOver = budgetReducer(state, {
      type: 'TRANSFER_BETWEEN_ACCOUNTS',
      fromSourceId: 'bank-bpi',
      toSourceId: 'cash',
      amount: 501,
      todayKey: '2026-04-10',
    });
    expect(bankOver).toBe(state);

    // Credit card overpayment allowed when source has sufficient funds (1000 card used, 1500 cash)
    state = makeReducerState({
      cashOnHand: 2000,
      creditCards: [{ id: 'cc-bdo', name: 'BDO Visa', limit: 10000, used: 1000, cutoffDay: 15 }],
    });
    const paid = budgetReducer(state, {
      type: 'TRANSFER_BETWEEN_ACCOUNTS',
      fromSourceId: 'cash',
      toSourceId: 'cc-bdo',
      amount: 1500,
      todayKey: '2026-04-10',
    });
    expect(paid.cashOnHand).toBe(500);
    expect(paid.creditCards[0].used).toBe(0);
    expect(paid.entries[0].appliedWalletDelta).toBe(1500);
    expect(paid.entries[0].appliedToWalletDelta).toBe(1000);

    // Undoing restores exact pre-payment balances cleanly
    const undone = budgetReducer(paid, {
      type: 'UNDO_ENTRY',
      entryId: paid.entries[0].id,
    });
    expect(undone.cashOnHand).toBe(2000);
    expect(undone.creditCards[0].used).toBe(1000);
  });

  it('reconciles wallet and envelope deltas on EDIT_ENTRY and out-of-order UNDO_ENTRY', () => {
    let state = makeReducerState({
      cashOnHand: 1000,
      envelopes: [
        {
          id: 'env-food',
          name: 'Food',
          icon: 'coffee',
          amountPerCycle: 500,
          balance: 400,
          cadence: 'monthly',
          rolloverMode: 'reset',
        },
      ],
    });

    // Log 2 envelope spends
    state = budgetReducer(state, {
      type: 'SPEND_FROM_ENVELOPE',
      envelopeId: 'env-food',
      amount: 150,
      label: 'Coffee',
      icon: 'coffee',
      paymentSourceId: 'cash',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    const firstId = state.entries[0].id;
    state = budgetReducer(state, {
      type: 'SPEND_FROM_ENVELOPE',
      envelopeId: 'env-food',
      amount: 100,
      label: 'Snack',
      icon: 'coffee',
      paymentSourceId: 'cash',
      dateKey: '2026-04-10',
      todayKey: '2026-04-10',
    });
    expect(state.cashOnHand).toBe(750);
    expect(state.envelopes[0].balance).toBe(150);

    // Edit first entry amount 150 -> 250
    state = budgetReducer(state, {
      type: 'EDIT_ENTRY',
      entryId: firstId,
      amount: 250,
      label: 'Coffee & Pastry',
      category: 'cafe',
      icon: 'coffee',
    });
    expect(state.cashOnHand).toBe(650);
    expect(state.envelopes[0].balance).toBe(50);

    // Out-of-order undo of first entry restores exact 250 delta
    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: firstId });
    expect(state.cashOnHand).toBe(900);
    expect(state.envelopes[0].balance).toBe(300);
    expect(canEditEntry(state.entries[0], state.treats)).toBe(true);
  });

  it('enforces getUndoEligibility on debts with payments and claimed treats', () => {
    let state = makeReducerState({ cashOnHand: 1000 });
    state = budgetReducer(state, {
      type: 'ADD_DEBT',
      direction: 'owed_to_me',
      personName: 'Sam',
      amount: 500,
      paymentSourceId: 'cash',
      todayKey: '2026-04-10',
    });
    const debtId = state.debts[0].id;
    const creationEntry = state.entries.find((e) => e.debtAction === 'created')!;
    expect(getUndoEligibility(creationEntry, state.treats, state.debts).ok).toBe(
      true
    );

    // Record partial repayment -> blocks undoing creation entry until payment is undone
    state = budgetReducer(state, {
      type: 'RECORD_DEBT_PAYMENT',
      id: debtId,
      amount: 200,
      paymentSourceId: 'cash',
      todayKey: '2026-04-10',
    });
    expect(
      getUndoEligibility(creationEntry, state.treats, state.debts).ok
    ).toBe(false);
    expect(budgetReducer(state, { type: 'UNDO_ENTRY', entryId: creationEntry.id })).toBe(
      state
    );

    // Undo the payment first -> creation entry becomes undoable again
    const paymentEntry = state.entries.find((e) => e.debtAction === 'payment')!;
    state = budgetReducer(state, { type: 'UNDO_ENTRY', entryId: paymentEntry.id });
    expect(
      getUndoEligibility(creationEntry, state.treats, state.debts).ok
    ).toBe(true);
  });

  it('resets prior state cleanly on fresh COMPLETE_ONBOARDING and clears deleted lastPaymentSourceId', () => {
    const dirty = makeReducerState({
      monthlySaved: 5500,
      rolloverBalance: 900,
      lastPaymentSourceId: 'bank-bpi',
      debts: [
        {
          id: 'd-1',
          direction: 'i_owe',
          personName: 'Pat',
          amount: 400,
          paidAmount: 0,
          createdAt: '2026-04-01',
        },
      ],
      sinkingFunds: [
        {
          id: 'sf-1',
          name: 'EF',
          icon: 'shield',
          target: 10000,
          saved: 2000,
          monthsToGoal: 5,
        },
      ],
      entries: [
        {
          id: 'old-1',
          type: 'spend',
          amount: 200,
          label: 'Old',
          icon: 'tag',
          timestamp: '2026-04-01T00:00:00.000Z',
        },
      ],
    });

    const clearedBank = budgetReducer(dirty, {
      type: 'REMOVE_BANK',
      bankId: 'bank-bpi',
    });
    expect(clearedBank.lastPaymentSourceId).toBeUndefined();

    const withCardSource = { ...dirty, lastPaymentSourceId: 'cc-bdo' };
    const clearedCard = budgetReducer(withCardSource, {
      type: 'REMOVE_CREDIT_CARD',
      cardId: 'cc-bdo',
    });
    expect(clearedCard.lastPaymentSourceId).toBeUndefined();

    const fresh = budgetReducer(dirty, {
      type: 'COMPLETE_ONBOARDING',
      params: {
        income: 40000,
        bills: 10000,
        savings: 5000,
        salaryFrequency: 2,
        payday1: 15,
        payday2: 30,
        cashOnHand: 2500,
        treatName: 'Keyboard',
        treatIcon: 'gift',
        treatTarget: 3000,
        preserveExistingData: false,
      },
    });
    expect(fresh.hasCompletedOnboarding).toBe(true);
    expect(fresh.monthlySaved).toBe(0);
    expect(fresh.rolloverBalance).toBe(0);
    expect(fresh.entries).toEqual([]);
    expect(fresh.debts).toEqual([]);
    expect(fresh.sinkingFunds).toEqual([]);
    expect(fresh.treats).toHaveLength(1);
    expect(fresh.treats[0].name).toBe('Keyboard');

    // ADD_INSTALLMENT caps paidMonths <= totalMonths
    const withInst = budgetReducer(fresh, {
      type: 'ADD_INSTALLMENT',
      params: {
        name: 'Tablet',
        provider: 'BDO 0%',
        monthlyAmount: 2500,
        totalMonths: 12,
        paidMonths: 18,
        includeInBudget: true,
      },
    });
    expect(withInst.installments[0].paidMonths).toBe(12);
    expect(withInst.installments[0].totalMonths).toBe(12);
  });
});
