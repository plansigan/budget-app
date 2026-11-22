import { describe, expect, it } from 'vitest';
import { computeDayMetricsFromEntries } from '../state/budgetMath';
import {
  budgetReducer,
  isEditableEntry,
  isEditableEntryType,
} from '../state/budgetReducer';
import { createDemoState, createNewUserState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import { VELVET_SHADE } from '../theme/palette';
import { TransactionEntry } from '../types/budget';
import { buildTransactionsCsv } from '../utils/backupExport';
import { computeSpendingBreakdown } from '../utils/insightsEngine';
import { getTransactionPresentation } from '../utils/transactionDisplay';

describe('Tier 1 & Tier 2 improvements', () => {
  describe('wallet transfers & real credit card payments', () => {
    it('transfers between banks without affecting daily spend and undoes losslessly', () => {
      const base = createNewUserState('2026-11-22');
      // BPI = 12,000, GCash = 3,500
      const afterXfer = budgetReducer(base, {
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId: 'bank-bpi',
        toSourceId: 'bank-gcash',
        amount: 2500,
        note: 'Top up GCash',
        todayKey: '2026-11-22',
      });

      const bpiAfter = afterXfer.banks.find((b) => b.id === 'bank-bpi')!;
      const gcashAfter = afterXfer.banks.find((b) => b.id === 'bank-gcash')!;
      expect(bpiAfter.balance).toBe(9500);
      expect(gcashAfter.balance).toBe(6000);

      const xferEntry = afterXfer.entries[0];
      expect(xferEntry.type).toBe('wallet_transfer');
      expect(xferEntry.paymentSourceId).toBe('bank-bpi');
      expect(xferEntry.toPaymentSourceId).toBe('bank-gcash');
      expect(xferEntry.appliedWalletDelta).toBe(2500);
      expect(xferEntry.appliedToWalletDelta).toBe(2500);

      // Transfers never reduce daily safe-to-spend
      const daySummary = computeDayMetricsFromEntries(
        afterXfer.entries,
        '2026-11-22',
        500,
        0,
        '2026-11-22',
        '2026-11-22'
      );
      expect(daySummary.spent).toBe(0);

      const afterUndo = budgetReducer(afterXfer, {
        type: 'UNDO_ENTRY',
        entryId: xferEntry.id,
      });
      expect(afterUndo.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
        12000
      );
      expect(afterUndo.banks.find((b) => b.id === 'bank-gcash')!.balance).toBe(
        3500
      );
      expect(afterUndo.entries).toHaveLength(0);
    });

    it('pays credit card from a bank with 0-clamp and lossless undo', () => {
      const base = createNewUserState('2026-11-22');
      // BDO Visa used = 4,500; BPI = 12,000
      const paid = budgetReducer(base, {
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId: 'bank-bpi',
        toSourceId: 'cc-bdo',
        amount: 6000, // overpay to test 0-clamp on card.used
        todayKey: '2026-11-22',
      });

      expect(paid.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(6000);
      expect(paid.creditCards.find((c) => c.id === 'cc-bdo')!.used).toBe(0);

      const xferEntry = paid.entries[0];
      expect(xferEntry.appliedWalletDelta).toBe(6000);
      expect(xferEntry.appliedToWalletDelta).toBe(4500);
      expect(xferEntry.label).toBe('Paid BDO Visa from BPI');

      const undone = budgetReducer(paid, {
        type: 'UNDO_ENTRY',
        entryId: xferEntry.id,
      });
      expect(undone.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
        12000
      );
      expect(undone.creditCards.find((c) => c.id === 'cc-bdo')!.used).toBe(4500);
    });

    it('rejects same-account transfers and credit card as transfer source', () => {
      const base = createNewUserState('2026-11-22');

      const sameAcc = budgetReducer(base, {
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId: 'cash',
        toSourceId: 'cash',
        amount: 500,
      });
      expect(sameAcc).toBe(base);

      const fromCard = budgetReducer(base, {
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId: 'cc-bdo',
        toSourceId: 'bank-bpi',
        amount: 500,
      });
      expect(fromCard).toBe(base);
    });

    it('formats wallet_transfer cleanly in presentation and CSV export', () => {
      const entry: TransactionEntry = {
        id: 'xfer-1',
        type: 'wallet_transfer',
        amount: 1500,
        label: 'Cash-in GCash',
        icon: 'repeat',
        timestamp: '2026-11-22T09:00:00.000Z',
        dateKey: '2026-11-22',
        paymentSourceId: 'bank-bpi',
        paymentSourceLabel: 'BPI',
        toPaymentSourceId: 'bank-gcash',
        toPaymentSourceLabel: 'GCash',
      };

      const visible = getTransactionPresentation(entry, VELVET_SHADE, false);
      expect(visible.deltaText).toBe('₱1,500.00');
      expect(visible.csvSignedAmount).toBe(0);

      const masked = getTransactionPresentation(entry, VELVET_SHADE, true);
      expect(masked.deltaText).toBe('₱••••');

      const csv = buildTransactionsCsv([entry]);
      expect(csv).toContain('BPI -> GCash');
      expect(csv).toContain(',0');
    });
  });

  describe('smart default payment source', () => {
    it('tracks lastPaymentSourceId on spend and envelope spend while ignoring Track Only', () => {
      const demo = createDemoState('2026-11-22');

      const afterSpend = budgetReducer(demo, {
        type: 'LOG_SPEND',
        amount: 120,
        label: 'Lunch',
        icon: 'shopping-bag',
        paymentSourceId: 'bank-gcash',
        category: 'food',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      expect(afterSpend.lastPaymentSourceId).toBe('bank-gcash');

      // Envelope spend with "Track Only" ('none' -> undefined) preserves GCash default
      const afterTrackOnlyEnv = budgetReducer(afterSpend, {
        type: 'SPEND_FROM_ENVELOPE',
        envelopeId: 'env-date',
        amount: 200,
        label: 'Flowers',
        icon: 'heart',
        paymentSourceId: 'none',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      expect(afterTrackOnlyEnv.lastPaymentSourceId).toBe('bank-gcash');

      // Envelope spend paid with Cash updates lastPaymentSourceId
      const afterCashEnv = budgetReducer(afterTrackOnlyEnv, {
        type: 'SPEND_FROM_ENVELOPE',
        envelopeId: 'env-date',
        amount: 300,
        label: 'Movie Tickets',
        icon: 'tv',
        paymentSourceId: 'cash',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      expect(afterCashEnv.lastPaymentSourceId).toBe('cash');

      const normalized = normalizePersistedState(afterCashEnv);
      expect(normalized.lastPaymentSourceId).toBe('cash');
    });
  });

  describe('tap-to-edit transaction reconciliation', () => {
    it('edits spend amount, label, and category with 0-clamp safety and lossless undo', () => {
      const base = {
        ...createNewUserState('2026-11-22'),
        cashOnHand: 100,
      };

      // Spend 150 from Cash (100 -> clamped at 0, appliedWalletDelta = 100)
      const afterSpend = budgetReducer(base, {
        type: 'LOG_SPEND',
        amount: 150,
        label: 'Coffee',
        icon: 'coffee',
        paymentSourceId: 'cash',
        category: 'cafe',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      expect(afterSpend.cashOnHand).toBe(0);
      const entry = afterSpend.entries[0];

      // Edit down to 80 and change category/label -> Cash should restore 100 - 80 = 20
      const afterEdit = budgetReducer(afterSpend, {
        type: 'EDIT_ENTRY',
        entryId: entry.id,
        amount: 80,
        label: 'GrabFood Meal',
        category: 'food',
        icon: 'shopping-bag',
      });
      expect(afterEdit.cashOnHand).toBe(20);
      expect(afterEdit.entries[0].amount).toBe(80);
      expect(afterEdit.entries[0].label).toBe('GrabFood Meal');
      expect(afterEdit.entries[0].category).toBe('food');
      expect(afterEdit.entries[0].icon).toBe('shopping-bag');
      expect(afterEdit.entries[0].appliedWalletDelta).toBe(80);

      // Undoing the edited entry still restores exact starting cash (100)
      const afterUndo = budgetReducer(afterEdit, {
        type: 'UNDO_ENTRY',
        entryId: entry.id,
      });
      expect(afterUndo.cashOnHand).toBe(100);
    });

    it('reconciles both envelope balance and wallet account across edits on envelope_spend', () => {
      const demo = createDemoState('2026-11-22');
      // env-date starts at 2,500; BPI starts at 12,000
      const afterEnvSpend = budgetReducer(demo, {
        type: 'SPEND_FROM_ENVELOPE',
        envelopeId: 'env-date',
        amount: 500,
        label: 'Dinner Date',
        icon: 'heart',
        paymentSourceId: 'bank-bpi',
        category: 'food',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      const targetId = afterEnvSpend.entries[0].id;
      expect(
        afterEnvSpend.envelopes.find((e) => e.id === 'env-date')!.balance
      ).toBe(2000);
      expect(
        afterEnvSpend.banks.find((b) => b.id === 'bank-bpi')!.balance
      ).toBe(11500);

      const afterEdit = budgetReducer(afterEnvSpend, {
        type: 'EDIT_ENTRY',
        entryId: targetId,
        amount: 900,
        label: 'Fancy Dinner',
        category: 'fun',
        icon: 'tv',
      });
      expect(
        afterEdit.envelopes.find((e) => e.id === 'env-date')!.balance
      ).toBe(1600);
      expect(afterEdit.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
        11100
      );

      const afterUndo = budgetReducer(afterEdit, {
        type: 'UNDO_ENTRY',
        entryId: targetId,
      });
      expect(
        afterUndo.envelopes.find((e) => e.id === 'env-date')!.balance
      ).toBe(2500);
      expect(afterUndo.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
        12000
      );
    });

    it('reconciles wallet_deposit, save_direct, and treats, while blocking claimed treats', () => {
      const demo = createDemoState('2026-11-22');

      // Direct card payment deposit on BDO Visa (used = 4500)
      const afterCardDep = budgetReducer(demo, {
        type: 'DEPOSIT_TO_WALLET',
        sourceId: 'cc-bdo',
        amount: 1000,
        todayKey: '2026-11-22',
      });
      expect(
        afterCardDep.creditCards.find((c) => c.id === 'cc-bdo')!.used
      ).toBe(3500);

      const editedCardDep = budgetReducer(afterCardDep, {
        type: 'EDIT_ENTRY',
        entryId: afterCardDep.entries[0].id,
        amount: 1500,
        label: 'Adjusted Card Payment',
      });
      expect(
        editedCardDep.creditCards.find((c) => c.id === 'cc-bdo')!.used
      ).toBe(3000);
      expect(editedCardDep.entries[0].signedDelta).toBe(1500);

      // Save to Jar edit (Demo safeRemaining has ₱15 left; save ₱10 then edit to ₱160)
      const afterSave = budgetReducer(editedCardDep, {
        type: 'SAVE_TO_JAR',
        amount: 10,
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      const saveDiff = afterSave.monthlySaved;
      const editedSave = budgetReducer(afterSave, {
        type: 'EDIT_ENTRY',
        entryId: afterSave.entries[0].id,
        amount: 160,
        label: 'Bonus Jar Save',
      });
      expect(editedSave.monthlySaved).toBe(saveDiff + 150);

      // Treat direct edit succeeds before claim, blocks after claim
      const treatEntry = editedSave.entries.find((e) => e.id === 'seed-1')!;
      expect(isEditableEntry(editedSave, treatEntry.id)).toBe(true);
      const afterTreatEdit = budgetReducer(editedSave, {
        type: 'EDIT_ENTRY',
        entryId: treatEntry.id,
        amount: 1300, // Sony Headphones goes 2450 + (1300 - 250) = 3500
        label: 'Big Impulse Skip',
      });
      expect(afterTreatEdit.treats[0].funded).toBe(3500);

      const afterClaim = budgetReducer(afterTreatEdit, {
        type: 'CLAIM_TREAT',
        treatId: 'treat-headphones',
      });
      expect(isEditableEntry(afterClaim, treatEntry.id)).toBe(false);
      const rejectedEdit = budgetReducer(afterClaim, {
        type: 'EDIT_ENTRY',
        entryId: treatEntry.id,
        amount: 100,
        label: 'Should Not Apply',
      });
      expect(rejectedEdit).toBe(afterClaim);

      // Non-editable types are rejected cleanly
      const xferMock: TransactionEntry = {
        id: 'xfer-check',
        type: 'wallet_transfer',
        amount: 500,
        label: 'Transfer',
        icon: 'repeat',
        timestamp: '2026-11-22T10:00:00.000Z',
        dateKey: '2026-11-22',
      };
      expect(isEditableEntryType(xferMock)).toBe(false);
    });
  });

  describe('spending breakdown daily vs envelopes scope', () => {
    it('filters all, daily, and envelopes independently without breaking default behavior', () => {
      const now = new Date(2026, 10, 22); // Nov 22, 2026
      const entries: TransactionEntry[] = [
        {
          id: 'sp-1',
          type: 'spend',
          amount: 150,
          label: 'Iced Latte',
          icon: 'coffee',
          category: 'cafe',
          timestamp: '2026-11-22T09:00:00.000Z',
          dateKey: '2026-11-22',
        },
        {
          id: 'env-1',
          type: 'envelope_spend',
          amount: 850,
          label: 'Date Dinner',
          icon: 'shopping-bag',
          category: 'food',
          timestamp: '2026-11-22T12:00:00.000Z',
          dateKey: '2026-11-22',
        },
        {
          id: 'xfer-ignored',
          type: 'wallet_transfer',
          amount: 5000,
          label: 'Transfer',
          icon: 'repeat',
          timestamp: '2026-11-22T13:00:00.000Z',
          dateKey: '2026-11-22',
        },
      ];

      const allRes = computeSpendingBreakdown(entries, 'month', now, '2026-11');
      expect(allRes.totalSpent).toBe(1000);
      expect(allRes.count).toBe(2);

      const dailyRes = computeSpendingBreakdown(
        entries,
        'month',
        now,
        '2026-11',
        'daily'
      );
      expect(dailyRes.totalSpent).toBe(150);
      expect(dailyRes.count).toBe(1);
      expect(dailyRes.topSlice?.key).toBe('cafe');

      const envRes = computeSpendingBreakdown(
        entries,
        'month',
        now,
        '2026-11',
        'envelopes'
      );
      expect(envRes.totalSpent).toBe(850);
      expect(envRes.count).toBe(1);
      expect(envRes.topSlice?.key).toBe('food');
    });
  });

  describe('Philippine Peso centavo support', () => {
    it('supports sub-peso spends, centavo bills, and lossless 2-decimal transfers, edits, and undo', () => {
      const base = createNewUserState('2026-11-22');

      // 1. Sub-peso spend (₱0.50) from Cash (2,000 -> 1,999.50) and presentation (-₱0.50)
      const afterSubPeso = budgetReducer(base, {
        type: 'LOG_SPEND',
        amount: 0.5,
        label: 'Candy',
        icon: 'shopping-bag',
        paymentSourceId: 'cash',
        category: 'food',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      expect(afterSubPeso.cashOnHand).toBe(1999.5);
      expect(afterSubPeso.entries[0].amount).toBe(0.5);
      expect(
        getTransactionPresentation(afterSubPeso.entries[0], VELVET_SHADE, false)
          .deltaText
      ).toBe('-₱0.50');

      // 2. Spend with centavos (₱145.75) from BPI (12,000 -> 11,854.25), edit to ₱200.25, then undo back to 12,000
      const afterBankSpend = budgetReducer(afterSubPeso, {
        type: 'LOG_SPEND',
        amount: 145.75,
        label: 'GrabFood',
        icon: 'shopping-bag',
        paymentSourceId: 'bank-bpi',
        category: 'food',
        dateKey: '2026-11-22',
        todayKey: '2026-11-22',
      });
      const spendId = afterBankSpend.entries[0].id;
      expect(
        afterBankSpend.banks.find((b) => b.id === 'bank-bpi')!.balance
      ).toBe(11854.25);
      expect(
        getTransactionPresentation(
          afterBankSpend.entries[0],
          VELVET_SHADE,
          false
        ).deltaText
      ).toBe('-₱145.75');

      const afterEditSpend = budgetReducer(afterBankSpend, {
        type: 'EDIT_ENTRY',
        entryId: spendId,
        amount: 200.25,
        label: 'GrabFood + Tip',
        category: 'food',
        icon: 'shopping-bag',
      });
      expect(
        afterEditSpend.banks.find((b) => b.id === 'bank-bpi')!.balance
      ).toBe(11799.75);

      const afterUndoSpend = budgetReducer(afterEditSpend, {
        type: 'UNDO_ENTRY',
        entryId: spendId,
      });
      expect(
        afterUndoSpend.banks.find((b) => b.id === 'bank-bpi')!.balance
      ).toBe(12000);

      // 3. Centavo transfer (BPI -> GCash: ₱250.35)
      const afterXfer = budgetReducer(afterUndoSpend, {
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId: 'bank-bpi',
        toSourceId: 'bank-gcash',
        amount: 250.35,
        note: 'Exact split',
        todayKey: '2026-11-22',
      });
      expect(afterXfer.banks.find((b) => b.id === 'bank-bpi')!.balance).toBe(
        11749.65
      );
      expect(afterXfer.banks.find((b) => b.id === 'bank-gcash')!.balance).toBe(
        3750.35
      );
      expect(
        getTransactionPresentation(afterXfer.entries[0], VELVET_SHADE, false)
          .deltaText
      ).toBe('₱250.35');

      // 4. Add/update/pay monthly bill with centavos & preserve across normalizePersistedState
      const afterBillAdd = budgetReducer(afterXfer, {
        type: 'ADD_BILL_ITEM',
        name: 'Cloud Backup',
        icon: 'zap',
        amount: 149.99,
      });
      const addedBill = afterBillAdd.billItems.find(
        (b) => b.name === 'Cloud Backup'
      )!;
      expect(addedBill.amount).toBe(149.99);

      const afterBillUpdate = budgetReducer(afterBillAdd, {
        type: 'UPDATE_BILL_AMOUNT',
        billId: addedBill.id,
        amount: 1234.56,
      });
      expect(
        afterBillUpdate.billItems.find((b) => b.id === addedBill.id)!.amount
      ).toBe(1234.56);

      const afterBillPay = budgetReducer(afterBillUpdate, {
        type: 'MARK_BILL_PAID',
        billId: addedBill.id,
        paymentSourceId: 'cash',
        amountOverride: 1234.56,
        todayKey: '2026-11-22',
      });
      expect(afterBillPay.cashOnHand).toBe(764.94); // 1999.50 - 1234.56
      expect(
        getTransactionPresentation(afterBillPay.entries[0], VELVET_SHADE, false)
          .deltaText
      ).toBe('-₱1,234.56');

      const rehydrated = normalizePersistedState(afterBillPay);
      expect(
        rehydrated.billItems.find((b) => b.id === addedBill.id)!.amount
      ).toBe(1234.56);
      expect(rehydrated.cashOnHand).toBe(764.94);
    });
  });
});
