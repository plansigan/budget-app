import { describe, expect, it } from 'vitest';
import {
  computeDayMetricsFromEntries,
  roundCurrency,
} from '../state/budgetMath';
import { budgetReducer, isEditableEntryType } from '../state/budgetReducer';
import { createNewUserState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import { VELVET_SHADE } from '../theme/palette';
import {
  buildTransactionsCsv,
  parseBackupJson,
  serializeBackupJson,
  summarizeBackupJson,
} from '../utils/backupExport';
import { getTransactionPresentation } from '../utils/transactionDisplay';

describe('Debts tracker (I Owe / Owed to Me)', () => {
  it('defaults to Track Only without touching wallet balances or daily Safe-to-Spend and supports partial/full centavo settlements', () => {
    const today = '2026-11-23';
    const base = createNewUserState(today);
    const beforeDay = computeDayMetricsFromEntries(
      base.entries,
      today,
      500,
      0,
      today,
      today
    );

    const afterAdd = budgetReducer(base, {
      type: 'ADD_DEBT',
      direction: 'owed_to_me',
      personName: 'Bea',
      amount: 145.75,
      note: 'Lunch split',
      todayKey: today,
    });

    expect(afterAdd.debts).toHaveLength(1);
    expect(afterAdd.debts[0].amount).toBe(145.75);
    expect(afterAdd.debts[0].paidAmount).toBe(0);
    expect(afterAdd.cashOnHand).toBe(base.cashOnHand);
    expect(afterAdd.banks).toEqual(base.banks);
    expect(afterAdd.creditCards).toEqual(base.creditCards);
    expect(afterAdd.entries).toHaveLength(0);

    // Partial Track Only payment (₱0.50)
    const afterPartial = budgetReducer(afterAdd, {
      type: 'RECORD_DEBT_PAYMENT',
      id: afterAdd.debts[0].id,
      amount: 0.5,
      todayKey: today,
    });
    expect(afterPartial.debts[0].paidAmount).toBe(0.5);
    expect(afterPartial.debts[0].settledAt).toBeUndefined();
    expect(afterPartial.cashOnHand).toBe(base.cashOnHand);
    expect(afterPartial.entries[0].type).toBe('debt_inflow');
    expect(afterPartial.entries[0].amount).toBe(0.5);
    expect(isEditableEntryType(afterPartial.entries[0])).toBe(false);

    // Daily Safe-to-Spend remains unchanged when daily toggle is OFF
    const midDay = computeDayMetricsFromEntries(
      afterPartial.entries,
      today,
      500,
      0,
      today,
      today
    );
    expect(midDay.safeRemaining).toBe(beforeDay.safeRemaining);
    expect(midDay.spent).toBe(0);

    // Overpaying caps cleanly at remaining (145.25) and settles debt
    const afterFull = budgetReducer(afterPartial, {
      type: 'RECORD_DEBT_PAYMENT',
      id: afterAdd.debts[0].id,
      amount: 999,
      todayKey: today,
    });
    expect(afterFull.debts[0].paidAmount).toBe(145.75);
    expect(afterFull.debts[0].settledAt).toBeTruthy();
    expect(afterFull.entries[0].amount).toBe(145.25);

    // Subsequent payment on already-settled debt is a no-op
    const ignored = budgetReducer(afterFull, {
      type: 'RECORD_DEBT_PAYMENT',
      id: afterAdd.debts[0].id,
      amount: 10,
      todayKey: today,
    });
    expect(ignored).toBe(afterFull);
  });

  it('supports optional Wallet account links on creation & payment and restores losslessly on Undo', () => {
    const today = '2026-11-23';
    const base = createNewUserState(today);
    // Cash = 2,000; BPI = 12,000; BDO Visa used = 4,500

    // Lending ₱500.25 to Marco from BPI
    const afterLent = budgetReducer(base, {
      type: 'ADD_DEBT',
      direction: 'owed_to_me',
      personName: 'Marco',
      amount: 500.25,
      paymentSourceId: 'bank-bpi',
      dateKey: today,
      todayKey: today,
    });
    expect(afterLent.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
      11499.75
    );
    expect(afterLent.entries[0].type).toBe('debt_outflow');
    expect(afterLent.entries[0].debtAction).toBe('created');

    // Borrowing ₱300 from Ana into Cash (creditCard ignored if mistakenly passed for inflow)
    const afterBorrowedCard = budgetReducer(afterLent, {
      type: 'ADD_DEBT',
      direction: 'i_owe',
      personName: 'Ana',
      amount: 300,
      paymentSourceId: 'cc-bdo',
      dateKey: today,
      todayKey: today,
    });
    expect(
      afterBorrowedCard.creditCards.find((c) => c.id === 'cc-bdo')!.used
    ).toBe(4500);

    // Borrowing into Cash adds to Cash
    const afterBorrowedCash = budgetReducer(afterBorrowedCard, {
      type: 'ADD_DEBT',
      direction: 'i_owe',
      personName: 'Kim',
      amount: 200.5,
      paymentSourceId: 'cash',
      dateKey: today,
      todayKey: today,
    });
    expect(afterBorrowedCash.cashOnHand).toBe(2200.5);
    const kimDebt = afterBorrowedCash.debts.find(
      (d) => d.personName === 'Kim'
    )!;

    // Settle Kim debt in full using Credit Card
    const afterPayKim = budgetReducer(afterBorrowedCash, {
      type: 'RECORD_DEBT_PAYMENT',
      id: kimDebt.id,
      amount: 200.5,
      paymentSourceId: 'cc-bdo',
      dateKey: today,
      todayKey: today,
    });
    expect(
      afterPayKim.creditCards.find((c) => c.id === 'cc-bdo')!.used
    ).toBe(4700.5);
    const paidKim = afterPayKim.debts.find((d) => d.id === kimDebt.id)!;
    expect(paidKim.paidAmount).toBe(200.5);
    expect(paidKim.settledAt).toBeTruthy();

    // Undo Kim's settlement -> card used restores and debt re-opens cleanly
    const paymentEntryId = afterPayKim.entries[0].id;
    const afterUndoPay = budgetReducer(afterPayKim, {
      type: 'UNDO_ENTRY',
      entryId: paymentEntryId,
    });
    expect(
      afterUndoPay.creditCards.find((c) => c.id === 'cc-bdo')!.used
    ).toBe(4500);
    const reopenedKim = afterUndoPay.debts.find((d) => d.id === kimDebt.id)!;
    expect(reopenedKim.paidAmount).toBe(0);
    expect(reopenedKim.settledAt).toBeUndefined();

    // Undo Marco's wallet-linked creation -> restores BPI and removes Marco's unpaid debt
    const marcoCreatedEntry = afterUndoPay.entries.find(
      (e) => e.label === 'Lent to Marco'
    )!;
    const afterUndoCreate = budgetReducer(afterUndoPay, {
      type: 'UNDO_ENTRY',
      entryId: marcoCreatedEntry.id,
    });
    expect(
      afterUndoCreate.banks.find((b) => b.id === 'bank-bpi')!.balance
    ).toBe(12000);
    expect(
      afterUndoCreate.debts.some((d) => d.personName === 'Marco')
    ).toBe(false);
  });

  it('adjusts Daily Safe-to-Spend when optionally toggled on outflows & inflows while keeping spent non-negative', () => {
    const today = '2026-11-23';
    const base = createNewUserState(today);
    const baseDaily = 500;

    // 1. Outflow affecting daily budget reduces safeRemaining and adds to spent
    const afterOutflow = budgetReducer(base, {
      type: 'ADD_DEBT',
      direction: 'owed_to_me',
      personName: 'Sam',
      amount: 120.25,
      affectsDailyBudget: true,
      dateKey: today,
      todayKey: today,
    });
    const outSummary = computeDayMetricsFromEntries(
      afterOutflow.entries,
      today,
      baseDaily,
      0,
      today,
      today
    );
    expect(outSummary.spent).toBe(120.25);
    expect(outSummary.safeRemaining).toBe(379.75);

    // 2. Inflow affecting daily budget increases safeRemaining without negative spent (even if payback > spent)
    const samDebt = afterOutflow.debts[0];
    const afterPayback = budgetReducer(afterOutflow, {
      type: 'RECORD_DEBT_PAYMENT',
      id: samDebt.id,
      amount: 120.25,
      affectsDailyBudget: true,
      dateKey: today,
      todayKey: today,
    });
    const afterRefund = budgetReducer(afterPayback, {
      type: 'ADD_DEBT',
      direction: 'i_owe',
      personName: 'Sam',
      amount: 80,
      affectsDailyBudget: true,
      dateKey: today,
      todayKey: today,
    });
    const inSummary = computeDayMetricsFromEntries(
      afterRefund.entries,
      today,
      baseDaily,
      0,
      today,
      today
    );
    expect(inSummary.spent).toBe(120.25);
    expect(inSummary.safeRemaining).toBe(roundCurrency(500 - 120.25 + 200.25));

    // Undoing the inflow payment reverts safeRemaining
    const paybackEntryId = afterPayback.entries[0].id;
    const afterUndoInflow = budgetReducer(afterRefund, {
      type: 'UNDO_ENTRY',
      entryId: paybackEntryId,
    });
    const revertedSummary = computeDayMetricsFromEntries(
      afterUndoInflow.entries,
      today,
      baseDaily,
      0,
      today,
      today
    );
    expect(revertedSummary.safeRemaining).toBe(roundCurrency(500 - 120.25 + 80));
  });

  it('supports UPDATE_DEBT clamping and DELETE_DEBT cleanly', () => {
    const today = '2026-11-23';
    let state = createNewUserState(today);
    state = budgetReducer(state, {
      type: 'ADD_DEBT',
      direction: 'i_owe',
      personName: 'Pat',
      amount: 500,
      note: 'Dinner',
      todayKey: today,
    });
    const id = state.debts[0].id;
    state = budgetReducer(state, {
      type: 'RECORD_DEBT_PAYMENT',
      id,
      amount: 300,
      todayKey: today,
    });
    state = budgetReducer(state, {
      type: 'UPDATE_DEBT',
      id,
      direction: 'i_owe',
      personName: 'Pat Santos',
      amount: 250,
      note: 'Updated share',
    });
    expect(state.debts[0].personName).toBe('Pat Santos');
    expect(state.debts[0].amount).toBe(250);
    expect(state.debts[0].paidAmount).toBe(250);
    expect(state.debts[0].settledAt).toBeTruthy();

    state = budgetReducer(state, { type: 'DELETE_DEBT', id });
    expect(state.debts).toHaveLength(0);
  });

  it('normalizes persistence, round-trips JSON backups, and formats CSV/display cleanly', () => {
    const today = '2026-11-23';
    let state = createNewUserState(today);
    state = budgetReducer(state, {
      type: 'ADD_DEBT',
      direction: 'owed_to_me',
      personName: 'Leo',
      amount: 250.5,
      paymentSourceId: 'bank-gcash',
      dateKey: today,
      todayKey: today,
    });
    state = budgetReducer(state, {
      type: 'RECORD_DEBT_PAYMENT',
      id: state.debts[0].id,
      amount: 100.25,
      paymentSourceId: 'bank-gcash',
      dateKey: today,
      todayKey: today,
    });

    const json = serializeBackupJson(state);
    const parsed = parseBackupJson(json);
    expect(parsed.ok).toBe(true);

    const summary = summarizeBackupJson(json);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.summary.debtsCount).toBe(1);
    }

    const hydrated = normalizePersistedState({
      ...state,
      debts: [
        {
          id: 'd-clamp',
          direction: 'i_owe',
          personName: '  Test Person  ',
          amount: 100.456,
          paidAmount: 999,
          note: '  note  ',
          createdAt: '2026-11-23T00:00:00.000Z',
        },
      ],
    });
    expect(hydrated.debts[0].personName).toBe('Test Person');
    expect(hydrated.debts[0].amount).toBe(100.46);
    expect(hydrated.debts[0].paidAmount).toBe(100.46);
    expect(hydrated.debts[0].settledAt).toBeTruthy();

    const inflowPres = getTransactionPresentation(
      state.entries[0],
      VELVET_SHADE,
      false
    );
    const outflowPres = getTransactionPresentation(
      state.entries[1],
      VELVET_SHADE,
      false
    );
    expect(inflowPres.deltaText).toBe('+₱100.25');
    expect(outflowPres.deltaText).toBe('-₱250.50');
    expect(
      getTransactionPresentation(state.entries[0], VELVET_SHADE, true).deltaText
    ).toBe('₱••••');

    const csv = buildTransactionsCsv(state.entries);
    expect(csv).toContain(',debt_inflow,Received from Leo,GCash,100.25');
    expect(csv).toContain(',debt_outflow,Lent to Leo,GCash,-250.5');
  });
});
