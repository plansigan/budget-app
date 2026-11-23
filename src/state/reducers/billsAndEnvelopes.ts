import {
  BillItem,
  SpendingEnvelopeItem,
  TransactionEntry,
} from '../../types/budget';
import { getTodayKey, roundCurrency, sumBills } from '../budgetMath';
import { makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleBillsAndEnvelopesAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_BUDGET_CONFIG':
      return {
        ...state,
        settings: {
          ...state.settings,
          monthlyIncome: roundCurrency(Math.max(0, action.income)),
          fixedBills: roundCurrency(Math.max(0, action.bills)),
          monthlySavingsGoal: roundCurrency(Math.max(0, action.savings)),
        },
      };

    case 'UPDATE_SALARY_SCHEDULE':
      return {
        ...state,
        settings: {
          ...state.settings,
          salaryFrequency: action.frequency,
          payday1: Math.max(1, Math.min(31, Math.round(action.payday1))),
          payday2: Math.max(1, Math.min(31, Math.round(action.payday2))),
        },
      };

    case 'UPDATE_BILL_AMOUNT': {
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      const nextBills = state.billItems.map((b) =>
        b.id === action.billId ? { ...b, amount: cleanAmount } : b
      );
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'UPDATE_BILL_ITEM': {
      const trimmed = action.name.trim();
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      if (!trimmed) return state;
      const cleanDue =
        typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
          ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
          : undefined;
      const nextBills = state.billItems.map((b) =>
        b.id === action.billId
          ? {
              ...b,
              name: trimmed,
              icon: action.icon || b.icon,
              amount: cleanAmount,
              dueDay: cleanDue,
            }
          : b
      );
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'ADD_BILL_ITEM': {
      const trimmed = action.name.trim();
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      if (!trimmed || cleanAmount <= 0) return state;
      const newBill: BillItem = {
        id: makeUid('bill'),
        name: trimmed,
        icon: action.icon,
        amount: cleanAmount,
        dueDay:
          typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
            ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
            : undefined,
      };
      const nextBills = [...state.billItems, newBill];
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'UPDATE_BILL_DUE_DAY': {
      const cleanDue =
        typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
          ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
          : undefined;
      return {
        ...state,
        billItems: state.billItems.map((b) =>
          b.id === action.billId ? { ...b, dueDay: cleanDue } : b
        ),
      };
    }

    case 'MARK_BILL_PAID': {
      const bill = state.billItems.find((b) => b.id === action.billId);
      if (!bill) return state;
      const targetDateKey = action.todayKey || getTodayKey();
      const monthKey = targetDateKey.slice(0, 7);
      if (bill.lastPaidMonth === monthKey) return state;

      const cleanAmount = roundCurrency(
        Math.max(0, action.amountOverride ?? bill.amount)
      );
      const src = action.paymentSourceId;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let effectiveSourceId: string | undefined;
      let sourceLabel: string | undefined;
      let appliedWalletDelta = 0;

      if (cleanAmount > 0) {
        if (src === 'cash') {
          nextCash = Math.max(0, roundCurrency(state.cashOnHand - cleanAmount));
          appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
          effectiveSourceId = 'cash';
          sourceLabel = 'Cash';
        } else if (src && state.banks.some((b) => b.id === src)) {
          nextBanks = state.banks.map((b) => {
            if (b.id !== src) return b;
            const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
            appliedWalletDelta = roundCurrency(b.balance - nextBal);
            sourceLabel = b.name;
            return { ...b, balance: nextBal };
          });
          effectiveSourceId = src;
        } else if (src && state.creditCards.some((c) => c.id === src)) {
          nextCards = state.creditCards.map((c) => {
            if (c.id !== src) return c;
            sourceLabel = c.name;
            return { ...c, used: roundCurrency(c.used + cleanAmount) };
          });
          appliedWalletDelta = cleanAmount;
          effectiveSourceId = src;
        }
      }

      const entry: TransactionEntry = {
        id: makeUid('bill-pay'),
        type: 'bill_paid',
        amount: cleanAmount,
        label: `Paid Bill: ${bill.name}`,
        icon: bill.icon || 'file-text',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: 'bills',
        billId: bill.id,
        previousBillPaidMonth: bill.lastPaidMonth,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        billItems: state.billItems.map((b) =>
          b.id === bill.id ? { ...b, lastPaidMonth: monthKey } : b
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'REMOVE_BILL_ITEM': {
      const nextBills = state.billItems.filter((b) => b.id !== action.billId);
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'ADD_ENVELOPE': {
      const trimmed = action.name.trim();
      const cleanAmt = roundCurrency(action.amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return state;
      const newEnv: SpendingEnvelopeItem = {
        id: makeUid('env'),
        name: trimmed,
        icon: action.icon || 'heart',
        amountPerCycle: cleanAmt,
        cadence: action.cadence === 'monthly' ? 'monthly' : 'per_payday',
        rolloverMode: action.rolloverMode === 'reset' ? 'reset' : 'rollover',
        balance: cleanAmt,
      };
      return { ...state, envelopes: [...(state.envelopes || []), newEnv] };
    }

    case 'UPDATE_ENVELOPE': {
      const trimmed = action.name.trim();
      const cleanAmt = roundCurrency(action.amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return state;
      return {
        ...state,
        envelopes: (state.envelopes || []).map((env) =>
          env.id === action.id
            ? {
                ...env,
                name: trimmed,
                icon: action.icon || env.icon,
                amountPerCycle: cleanAmt,
                cadence:
                  action.cadence === 'monthly' ? 'monthly' : 'per_payday',
                rolloverMode:
                  action.rolloverMode === 'reset' ? 'reset' : 'rollover',
                balance:
                  typeof action.balance === 'number' &&
                  Number.isFinite(action.balance)
                    ? Math.max(0, roundCurrency(action.balance))
                    : env.balance,
              }
            : env
        ),
      };
    }

    case 'DELETE_ENVELOPE':
      return {
        ...state,
        envelopes: (state.envelopes || []).filter((e) => e.id !== action.id),
      };

    case 'SPEND_FROM_ENVELOPE': {
      const env = (state.envelopes || []).find(
        (e) => e.id === action.envelopeId
      );
      if (!env) return state;

      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const isToday = targetDateKey === todayKey;
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;

      const src = action.paymentSourceId;
      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let effectiveSourceId: string | undefined;
      let sourceLabel: string | undefined;
      let appliedWalletDelta = 0;

      if (src === 'cash') {
        nextCash = Math.max(0, roundCurrency(state.cashOnHand - cleanAmount));
        appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
        effectiveSourceId = 'cash';
        sourceLabel = 'Cash';
      } else if (src && state.banks.some((b) => b.id === src)) {
        nextBanks = state.banks.map((b) => {
          if (b.id !== src) return b;
          const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
          appliedWalletDelta = roundCurrency(b.balance - nextBal);
          sourceLabel = b.name;
          return { ...b, balance: nextBal };
        });
        effectiveSourceId = src;
      } else if (src && state.creditCards.some((c) => c.id === src)) {
        nextCards = state.creditCards.map((c) => {
          if (c.id !== src) return c;
          sourceLabel = c.name;
          return { ...c, used: roundCurrency(c.used + cleanAmount) };
        });
        appliedWalletDelta = cleanAmount;
        effectiveSourceId = src;
      }

      const previousEnvelopeBalance = env.balance;
      const nextEnvBalance = Math.max(0, roundCurrency(env.balance - cleanAmount));

      const entry: TransactionEntry = {
        id: makeUid('env-sp'),
        type: 'envelope_spend',
        amount: cleanAmount,
        label: action.label.trim() || env.name,
        icon: action.icon || env.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: action.category,
        envelopeId: env.id,
        previousEnvelopeBalance,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        ...(effectiveSourceId
          ? { lastPaymentSourceId: effectiveSourceId }
          : {}),
        envelopes: (state.envelopes || []).map((item) =>
          item.id === env.id ? { ...item, balance: nextEnvBalance } : item
        ),
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
        entries: [entry, ...state.entries],
      };
    }

    case 'REFILL_ENVELOPE': {
      const env = (state.envelopes || []).find(
        (e) => e.id === action.envelopeId
      );
      if (!env) return state;

      const targetDateKey = action.todayKey || getTodayKey();
      const nextBalance =
        env.rolloverMode === 'rollover'
          ? roundCurrency(env.balance + env.amountPerCycle)
          : roundCurrency(env.amountPerCycle);

      const entry: TransactionEntry = {
        id: makeUid('env-ref'),
        type: 'envelope_refill',
        amount: env.amountPerCycle,
        label: `Refilled ${env.name}`,
        icon: env.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        envelopeId: env.id,
        previousEnvelopeBalance: env.balance,
        previousEnvelopeRefillKey: env.lastRefillKey,
      };

      return {
        ...state,
        envelopes: (state.envelopes || []).map((item) =>
          item.id === env.id
            ? { ...item, balance: nextBalance, lastRefillKey: targetDateKey }
            : item
        ),
        entries: [entry, ...state.entries],
      };
    }

    default:
      return undefined;
  }
};
