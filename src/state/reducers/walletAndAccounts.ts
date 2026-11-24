import {
  BankAccount,
  CreditCardAccount,
  TransactionEntry,
} from '../../types/budget';
import { getTodayKey, roundCurrency } from '../budgetMath';
import {
  applyWalletDelta,
  makeUid,
  resolvePaymentSource,
} from './helpers';
import { SliceReducer } from './types';

export const handleWalletAndAccountsAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'DEPOSIT_TO_WALLET': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const movement = applyWalletDelta(
        state,
        action.sourceId,
        'inflow',
        cleanAmount,
        { allowCardInflow: true }
      );
      if (movement.sourceKind === 'none') return state;

      const isCard = movement.sourceKind === 'card';
      const entry: TransactionEntry = {
        id: makeUid('dep'),
        type: 'wallet_deposit',
        amount: cleanAmount,
        label:
          action.note?.trim() ||
          (isCard ? 'Card Bill Payment' : 'Added Funds / Deposit'),
        icon: isCard ? 'credit-card' : 'arrow-down-left',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        signedDelta: cleanAmount,
        appliedWalletDelta: movement.appliedDelta,
        ...(isCard ? { isCardPayment: true } : {}),
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'SET_ACCOUNT_BALANCE': {
      if (!Number.isFinite(action.newBalance)) return state;
      const cleanBalance = Math.max(0, roundCurrency(action.newBalance));
      const resolved = resolvePaymentSource(state, action.sourceId);
      if (resolved.kind === 'none') return state;

      const oldBalance =
        resolved.kind === 'card' ? resolved.used : resolved.balance;
      const delta = roundCurrency(cleanBalance - oldBalance);
      if (delta === 0) return state;

      const entry: TransactionEntry = {
        id: makeUid('adj'),
        type: 'wallet_adjust',
        amount: Math.abs(delta),
        signedDelta: delta,
        label: action.note?.trim() || 'Balance Adjustment',
        icon: 'rotate-ccw',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: resolved.id,
        paymentSourceLabel: resolved.label,
      };

      return {
        ...state,
        cashOnHand: resolved.kind === 'cash' ? cleanBalance : state.cashOnHand,
        banks:
          resolved.kind === 'bank'
            ? state.banks.map((b) =>
                b.id === resolved.id ? { ...b, balance: cleanBalance } : b
              )
            : state.banks,
        creditCards:
          resolved.kind === 'card'
            ? state.creditCards.map((c) =>
                c.id === resolved.id ? { ...c, used: cleanBalance } : c
              )
            : state.creditCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'TRANSFER_BETWEEN_ACCOUNTS': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const { fromSourceId, toSourceId } = action;
      if (!fromSourceId || !toSourceId || fromSourceId === toSourceId) {
        return state;
      }

      const fromResolved = resolvePaymentSource(state, fromSourceId);
      if (fromResolved.kind !== 'cash' && fromResolved.kind !== 'bank') {
        return state;
      }
      // Block transfer overdrafts so phantom net worth cannot be created
      if (cleanAmount > fromResolved.balance) {
        return state;
      }

      const toResolved = resolvePaymentSource(state, toSourceId);
      if (toResolved.kind === 'none') return state;

      const debit = applyWalletDelta(
        state,
        fromSourceId,
        'outflow',
        cleanAmount
      );
      const credit = applyWalletDelta(
        {
          cashOnHand: debit.cashOnHand,
          banks: debit.banks,
          creditCards: debit.creditCards,
        },
        toSourceId,
        'inflow',
        cleanAmount,
        { allowCardInflow: true }
      );

      const isToCard = toResolved.kind === 'card';
      const defaultLabel = isToCard
        ? `Paid ${toResolved.label} from ${fromResolved.label}`
        : `Transfer: ${fromResolved.label} → ${toResolved.label}`;

      const entry: TransactionEntry = {
        id: makeUid('xfer'),
        type: 'wallet_transfer',
        amount: cleanAmount,
        label: action.note?.trim() || defaultLabel,
        icon: isToCard ? 'credit-card' : 'repeat',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: fromSourceId,
        paymentSourceLabel: fromResolved.label,
        toPaymentSourceId: toSourceId,
        toPaymentSourceLabel: toResolved.label,
        appliedWalletDelta: debit.appliedDelta,
        appliedToWalletDelta: credit.appliedDelta,
      };

      return {
        ...state,
        cashOnHand: credit.cashOnHand,
        banks: credit.banks,
        creditCards: credit.creditCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'ADD_BANK': {
      const trimmed = action.name.trim();
      if (!trimmed || !Number.isFinite(action.balance)) return state;
      const newBank: BankAccount = {
        id: makeUid('bank'),
        name: trimmed,
        balance: Math.max(0, roundCurrency(action.balance)),
      };
      return { ...state, banks: [...state.banks, newBank] };
    }

    case 'UPDATE_BANK': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      return {
        ...state,
        banks: state.banks.map((b) =>
          b.id === action.bankId ? { ...b, name: trimmed } : b
        ),
      };
    }

    case 'REMOVE_BANK':
      return {
        ...state,
        banks: state.banks.filter((b) => b.id !== action.bankId),
        lastPaymentSourceId:
          state.lastPaymentSourceId === action.bankId
            ? undefined
            : state.lastPaymentSourceId,
      };

    case 'ADD_CREDIT_CARD': {
      const trimmed = action.name.trim();
      if (
        !trimmed ||
        !Number.isFinite(action.limit) ||
        action.limit <= 0 ||
        !Number.isFinite(action.used) ||
        !Number.isFinite(action.cutoffDay)
      ) {
        return state;
      }
      const newCard: CreditCardAccount = {
        id: makeUid('cc'),
        name: trimmed,
        limit: Math.max(0.01, roundCurrency(action.limit)),
        used: Math.max(0, roundCurrency(action.used)),
        cutoffDay: Math.max(1, Math.min(31, Math.round(action.cutoffDay))),
      };
      return { ...state, creditCards: [...state.creditCards, newCard] };
    }

    case 'UPDATE_CREDIT_CARD': {
      const trimmed = action.name.trim();
      if (
        !trimmed ||
        !Number.isFinite(action.limit) ||
        action.limit <= 0 ||
        !Number.isFinite(action.cutoffDay)
      ) {
        return state;
      }
      return {
        ...state,
        creditCards: state.creditCards.map((c) =>
          c.id === action.cardId
            ? {
                ...c,
                name: trimmed,
                limit: Math.max(0.01, roundCurrency(action.limit)),
                cutoffDay: Math.max(
                  1,
                  Math.min(31, Math.round(action.cutoffDay))
                ),
              }
            : c
        ),
      };
    }

    case 'REMOVE_CREDIT_CARD':
      return {
        ...state,
        creditCards: state.creditCards.filter((c) => c.id !== action.cardId),
        lastPaymentSourceId:
          state.lastPaymentSourceId === action.cardId
            ? undefined
            : state.lastPaymentSourceId,
      };

    case 'LOG_PAYDAY_CHECKIN': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const cleanSavings = Number.isFinite(action.savingsAllocation)
        ? roundCurrency(Math.max(0, action.savingsAllocation))
        : 0;
      const targetDateKey = action.todayKey || getTodayKey();
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);

      const effectiveSourceId = matchedBank ? matchedBank.id : 'cash';
      const sourceLabel = matchedBank ? matchedBank.name : 'Cash';

      const refillSet = new Set(action.refillEnvelopeIds || []);
      const refilledSnapshots: Array<{
        id: string;
        previousBalance: number;
        previousRefillKey?: string;
      }> = [];
      const nextEnvelopes =
        refillSet.size > 0
          ? (state.envelopes || []).map((env) => {
              if (!refillSet.has(env.id)) return env;
              refilledSnapshots.push({
                id: env.id,
                previousBalance: env.balance,
                previousRefillKey: env.lastRefillKey,
              });
              const nextBalance =
                env.rolloverMode === 'rollover'
                  ? roundCurrency(env.balance + env.amountPerCycle)
                  : roundCurrency(env.amountPerCycle);
              return {
                ...env,
                balance: nextBalance,
                lastRefillKey: targetDateKey,
              };
            })
          : state.envelopes || [];

      const entry: TransactionEntry = {
        id: makeUid('payday'),
        type: 'wallet_deposit',
        amount: cleanAmount,
        signedDelta: cleanAmount,
        appliedWalletDelta: cleanAmount,
        label:
          action.note?.trim() ||
          (cleanSavings > 0
            ? 'Payday Check-In (+Savings)'
            : 'Payday Check-In'),
        icon: 'dollar-sign',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        isPaydayCheckIn: true,
        savingsDelta: cleanSavings,
        previousPaydayCheckInKey: state.lastPaydayCheckInKey,
        refilledEnvelopeSnapshots:
          refilledSnapshots.length > 0 ? refilledSnapshots : undefined,
      };

      return {
        ...state,
        cashOnHand: matchedBank
          ? state.cashOnHand
          : roundCurrency(state.cashOnHand + cleanAmount),
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === matchedBank.id
                ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
                : b
            )
          : state.banks,
        envelopes: nextEnvelopes,
        monthlySaved: roundCurrency(state.monthlySaved + cleanSavings),
        disciplineScore: Math.min(999, state.disciplineScore + 15),
        lastPaydayCheckInKey: targetDateKey,
        entries: [entry, ...state.entries],
      };
    }

    case 'DISMISS_PAYDAY_PROMPT':
      return { ...state, lastPaydayCheckInKey: action.dateKey };

    default:
      return undefined;
  }
};
