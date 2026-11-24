import {
  DebtDirection,
  DebtItem,
  InstallmentItem,
  TransactionEntry,
} from '../../types/budget';
import { getTodayKey, roundCurrency } from '../budgetMath';
import { applyDaytimeCheckIn, applyWalletDelta, makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleInstallmentsAndDebtsAction: SliceReducer = (
  state,
  action
) => {
  switch (action.type) {
    case 'ADD_INSTALLMENT': {
      const { params } = action;
      const trimmed = params.name.trim();
      if (
        !trimmed ||
        !Number.isFinite(params.monthlyAmount) ||
        !Number.isFinite(params.totalMonths) ||
        !Number.isFinite(params.paidMonths)
      ) {
        return state;
      }
      const cleanMonthly = roundCurrency(params.monthlyAmount);
      if (cleanMonthly <= 0 || params.totalMonths <= 0) {
        return state;
      }
      const totalM = Math.max(1, Math.min(360, Math.round(params.totalMonths)));
      const paidM = Math.max(0, Math.min(totalM, Math.round(params.paidMonths)));
      const newItem: InstallmentItem = {
        id: makeUid('inst'),
        name: trimmed,
        provider: params.provider.trim() || 'Installment',
        monthlyAmount: cleanMonthly,
        totalMonths: totalM,
        paidMonths: paidM,
        includeInBudget: params.includeInBudget,
      };
      return { ...state, installments: [...state.installments, newItem] };
    }

    case 'UPDATE_INSTALLMENT': {
      const { params } = action;
      const trimmed = params.name.trim();
      if (
        !trimmed ||
        !Number.isFinite(params.monthlyAmount) ||
        !Number.isFinite(params.totalMonths) ||
        !Number.isFinite(params.paidMonths)
      ) {
        return state;
      }
      const cleanMonthly = roundCurrency(params.monthlyAmount);
      if (cleanMonthly <= 0 || params.totalMonths <= 0) {
        return state;
      }
      const totalM = Math.max(1, Math.min(360, Math.round(params.totalMonths)));
      const paidM = Math.max(0, Math.min(totalM, Math.round(params.paidMonths)));
      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id
            ? {
                ...item,
                name: trimmed,
                provider: params.provider.trim() || 'Installment',
                monthlyAmount: cleanMonthly,
                totalMonths: totalM,
                paidMonths: paidM,
                includeInBudget: params.includeInBudget,
              }
            : item
        ),
      };
    }

    case 'MARK_INSTALLMENT_PAID': {
      const target = state.installments.find((i) => i.id === action.id);
      if (!target || target.paidMonths >= target.totalMonths) return state;

      const nextPaid = target.paidMonths + 1;
      const entry: TransactionEntry = {
        id: makeUid('inst-pay'),
        type: 'installment_paid',
        amount: target.monthlyAmount,
        label: `${target.name} (${nextPaid}/${target.totalMonths} mo)`,
        icon: 'calendar',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        installmentId: action.id,
      };

      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id ? { ...item, paidMonths: nextPaid } : item
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'TOGGLE_INSTALLMENT_IN_BUDGET':
      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id
            ? { ...item, includeInBudget: !item.includeInBudget }
            : item
        ),
      };

    case 'REMOVE_INSTALLMENT':
      return {
        ...state,
        installments: state.installments.filter((i) => i.id !== action.id),
      };

    case 'ADD_DEBT': {
      const trimmedName = action.personName.trim();
      if (!trimmedName || !Number.isFinite(action.amount)) return state;
      const cleanAmount = roundCurrency(action.amount);
      if (cleanAmount <= 0) return state;

      const trimmedNote = action.note?.trim() || undefined;
      const nowIso = new Date().toISOString();
      const debtId = makeUid('debt');
      const direction: DebtDirection =
        action.direction === 'owed_to_me' ? 'owed_to_me' : 'i_owe';
      const newDebt: DebtItem = {
        id: debtId,
        direction,
        personName: trimmedName,
        amount: cleanAmount,
        paidAmount: 0,
        ...(trimmedNote ? { note: trimmedNote } : {}),
        createdAt: nowIso,
      };

      const isOutflow = direction === 'owed_to_me';
      const movement = applyWalletDelta(
        state,
        action.paymentSourceId,
        isOutflow ? 'outflow' : 'inflow',
        cleanAmount,
        { allowCardInflow: false }
      );

      const affectsDailyBudget =
        direction === 'owed_to_me' && Boolean(action.affectsDailyBudget);
      const shouldLog =
        Boolean(movement.effectiveSourceId) || affectsDailyBudget;

      if (!shouldLog) {
        return {
          ...state,
          debts: [newDebt, ...(state.debts || [])],
        };
      }

      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey || todayKey;
      const checkIn = applyDaytimeCheckIn(
        state,
        affectsDailyBudget && targetDateKey === todayKey
      );
      const entry: TransactionEntry = {
        id: makeUid('debt-log'),
        type: isOutflow ? 'debt_outflow' : 'debt_inflow',
        amount: cleanAmount,
        label: isOutflow
          ? `Lent to ${trimmedName}`
          : `Borrowed from ${trimmedName}`,
        icon: isOutflow ? 'arrow-up-right' : 'arrow-down-left',
        timestamp: nowIso,
        dateKey: targetDateKey,
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        appliedWalletDelta: movement.appliedDelta,
        debtId,
        debtAction: 'created',
        affectsDailyBudget,
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        lastPaymentSourceId:
          movement.effectiveSourceId || state.lastPaymentSourceId,
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
        debts: [newDebt, ...(state.debts || [])],
        entries: [entry, ...state.entries],
      };
    }

    case 'UPDATE_DEBT': {
      const trimmedName = action.personName.trim();
      if (!trimmedName || !Number.isFinite(action.amount)) return state;
      const cleanAmount = roundCurrency(action.amount);
      if (cleanAmount <= 0) return state;
      const trimmedNote = action.note?.trim() || undefined;
      const nowIso = new Date().toISOString();

      return {
        ...state,
        debts: (state.debts || []).map((d) => {
          if (d.id !== action.id) return d;
          const nextPaid = Math.min(d.paidAmount, cleanAmount);
          const settled = nextPaid >= cleanAmount;
          return {
            ...d,
            direction:
              action.direction === 'owed_to_me' ? 'owed_to_me' : 'i_owe',
            personName: trimmedName,
            amount: cleanAmount,
            paidAmount: nextPaid,
            note: trimmedNote,
            settledAt: settled ? d.settledAt || nowIso : undefined,
          };
        }),
      };
    }

    case 'DELETE_DEBT':
      return {
        ...state,
        debts: (state.debts || []).filter((d) => d.id !== action.id),
      };

    case 'RECORD_DEBT_PAYMENT': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const debt = (state.debts || []).find((d) => d.id === action.id);
      if (!debt) return state;
      const remaining = roundCurrency(
        Math.max(0, debt.amount - debt.paidAmount)
      );
      if (remaining <= 0) return state;

      const requested = roundCurrency(Math.max(0.01, action.amount));
      const appliedAmount = roundCurrency(Math.min(requested, remaining));
      const nextPaid = roundCurrency(debt.paidAmount + appliedAmount);
      const isSettled = nextPaid >= debt.amount;
      const nowIso = new Date().toISOString();
      const isOutflow = debt.direction === 'i_owe';

      const movement = applyWalletDelta(
        state,
        action.paymentSourceId,
        isOutflow ? 'outflow' : 'inflow',
        appliedAmount,
        { allowCardInflow: false }
      );

      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey || todayKey;
      const affectsDailyBudget = Boolean(action.affectsDailyBudget);
      const checkIn = applyDaytimeCheckIn(
        state,
        affectsDailyBudget && targetDateKey === todayKey
      );
      const entry: TransactionEntry = {
        id: makeUid('debt-pay'),
        type: isOutflow ? 'debt_outflow' : 'debt_inflow',
        amount: appliedAmount,
        label: isOutflow
          ? `Paid ${debt.personName}`
          : `Received from ${debt.personName}`,
        icon: isOutflow ? 'arrow-up-right' : 'arrow-down-left',
        timestamp: nowIso,
        dateKey: targetDateKey,
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        appliedWalletDelta: movement.appliedDelta,
        debtId: debt.id,
        debtAction: 'payment',
        affectsDailyBudget,
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        lastPaymentSourceId:
          movement.effectiveSourceId || state.lastPaymentSourceId,
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
        debts: (state.debts || []).map((d) =>
          d.id === debt.id
            ? {
                ...d,
                paidAmount: nextPaid,
                settledAt: isSettled ? nowIso : undefined,
              }
            : d
        ),
        entries: [entry, ...state.entries],
      };
    }

    default:
      return undefined;
  }
};
