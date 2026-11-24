import {
  BillItem,
  SpendingEnvelopeItem,
  TransactionEntry,
} from '../../types/budget';
import { getTodayKey, roundCurrency, sumBills } from '../budgetMath';
import { applyDaytimeCheckIn, applyWalletDelta, makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleBillsAndEnvelopesAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_BUDGET_CONFIG': {
      const income = Number.isFinite(action.income)
        ? roundCurrency(Math.max(0, action.income))
        : state.settings.monthlyIncome;
      const savings = Number.isFinite(action.savings)
        ? roundCurrency(Math.max(0, action.savings))
        : state.settings.monthlySavingsGoal;
      const bills =
        state.billItems.length > 0
          ? sumBills(state.billItems)
          : Number.isFinite(action.bills)
          ? roundCurrency(Math.max(0, action.bills))
          : state.settings.fixedBills;
      return {
        ...state,
        settings: {
          ...state.settings,
          monthlyIncome: income,
          fixedBills: bills,
          monthlySavingsGoal: savings,
        },
      };
    }

    case 'UPDATE_SALARY_SCHEDULE': {
      const p1 = Number.isFinite(action.payday1)
        ? Math.max(1, Math.min(31, Math.round(action.payday1)))
        : state.settings.payday1;
      const p2 = Number.isFinite(action.payday2)
        ? Math.max(1, Math.min(31, Math.round(action.payday2)))
        : state.settings.payday2;
      return {
        ...state,
        settings: {
          ...state.settings,
          salaryFrequency: action.frequency,
          payday1: p1,
          payday2: p2,
        },
      };
    }

    case 'UPDATE_BILL_AMOUNT': {
      if (!Number.isFinite(action.amount)) return state;
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
      if (!trimmed || !Number.isFinite(action.amount)) return state;
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
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
      if (!trimmed || !Number.isFinite(action.amount)) return state;
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      if (cleanAmount <= 0) return state;
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

      const rawAmount = action.amountOverride ?? bill.amount;
      if (!Number.isFinite(rawAmount)) return state;
      const cleanAmount = roundCurrency(Math.max(0, rawAmount));

      const movement = applyWalletDelta(
        state,
        action.paymentSourceId,
        'outflow',
        cleanAmount
      );

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
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        appliedWalletDelta: movement.appliedDelta,
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        lastPaymentSourceId:
          movement.effectiveSourceId || state.lastPaymentSourceId,
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
      if (!Number.isFinite(action.amountPerCycle)) return state;
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
      if (!Number.isFinite(action.amountPerCycle)) return state;
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
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const env = (state.envelopes || []).find(
        (e) => e.id === action.envelopeId
      );
      if (!env) return state;

      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const isToday = targetDateKey === todayKey;
      const checkIn = applyDaytimeCheckIn(state, isToday);

      const movement = applyWalletDelta(
        state,
        action.paymentSourceId,
        'outflow',
        cleanAmount
      );

      const previousEnvelopeBalance = env.balance;
      const nextEnvBalance = Math.max(0, roundCurrency(env.balance - cleanAmount));
      const appliedEnvelopeDelta = roundCurrency(
        previousEnvelopeBalance - nextEnvBalance
      );

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
        appliedEnvelopeDelta,
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        appliedWalletDelta: movement.appliedDelta,
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        lastPaymentSourceId:
          movement.effectiveSourceId || state.lastPaymentSourceId,
        envelopes: (state.envelopes || []).map((item) =>
          item.id === env.id ? { ...item, balance: nextEnvBalance } : item
        ),
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
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
