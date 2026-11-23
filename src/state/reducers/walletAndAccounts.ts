import {
  BankAccount,
  CreditCardAccount,
  TransactionEntry,
} from '../../types/budget';
import { getTodayKey, roundCurrency } from '../budgetMath';
import { makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleWalletAndAccountsAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'DEPOSIT_TO_WALLET': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const isCash = action.sourceId === 'cash';
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);
      const matchedCard = state.creditCards.find(
        (c) => c.id === action.sourceId
      );
      if (!isCash && !matchedBank && !matchedCard) return state;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      let appliedWalletDelta = cleanAmount;
      let nextCards = state.creditCards;
      if (matchedCard) {
        nextCards = state.creditCards.map((c) => {
          if (c.id !== action.sourceId) return c;
          const nextUsed = Math.max(0, roundCurrency(c.used - cleanAmount));
          appliedWalletDelta = roundCurrency(c.used - nextUsed);
          return { ...c, used: nextUsed };
        });
      }

      const entry: TransactionEntry = {
        id: makeUid('dep'),
        type: 'wallet_deposit',
        amount: cleanAmount,
        label:
          action.note?.trim() ||
          (matchedCard ? 'Card Bill Payment' : 'Added Funds / Deposit'),
        icon: matchedCard ? 'credit-card' : 'arrow-down-left',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: action.sourceId,
        paymentSourceLabel: sourceLabel,
        signedDelta: cleanAmount,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: isCash
          ? roundCurrency(state.cashOnHand + cleanAmount)
          : state.cashOnHand,
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === action.sourceId
                ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
                : b
            )
          : state.banks,
        creditCards: nextCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'SET_ACCOUNT_BALANCE': {
      const cleanBalance = Math.max(0, roundCurrency(action.newBalance));
      const isCash = action.sourceId === 'cash';
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);
      const matchedCard = state.creditCards.find(
        (c) => c.id === action.sourceId
      );
      if (!isCash && !matchedBank && !matchedCard) return state;

      const oldBalance = isCash
        ? state.cashOnHand
        : matchedBank
        ? matchedBank.balance
        : matchedCard!.used;
      const delta = roundCurrency(cleanBalance - oldBalance);
      if (delta === 0) return state;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      const entry: TransactionEntry = {
        id: makeUid('adj'),
        type: 'wallet_adjust',
        amount: Math.abs(delta),
        signedDelta: delta,
        label: action.note?.trim() || 'Balance Adjustment',
        icon: 'rotate-ccw',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: action.sourceId,
        paymentSourceLabel: sourceLabel,
      };

      return {
        ...state,
        cashOnHand: isCash ? cleanBalance : state.cashOnHand,
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === action.sourceId ? { ...b, balance: cleanBalance } : b
            )
          : state.banks,
        creditCards: matchedCard
          ? state.creditCards.map((c) =>
              c.id === action.sourceId ? { ...c, used: cleanBalance } : c
            )
          : state.creditCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'TRANSFER_BETWEEN_ACCOUNTS': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const { fromSourceId, toSourceId } = action;
      if (!fromSourceId || !toSourceId || fromSourceId === toSourceId) {
        return state;
      }

      const fromIsCash = fromSourceId === 'cash';
      const fromBank = state.banks.find((b) => b.id === fromSourceId);
      if (!fromIsCash && !fromBank) return state;

      const toIsCash = toSourceId === 'cash';
      const toBank = state.banks.find((b) => b.id === toSourceId);
      const toCard = state.creditCards.find((c) => c.id === toSourceId);
      if (!toIsCash && !toBank && !toCard) return state;

      const fromLabel = fromIsCash ? 'Cash' : fromBank!.name;
      const toLabel = toIsCash
        ? 'Cash'
        : toBank
        ? toBank.name
        : toCard!.name;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let appliedWalletDelta = cleanAmount;

      if (fromIsCash) {
        nextCash = Math.max(0, roundCurrency(nextCash - cleanAmount));
        appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
      } else {
        nextBanks = nextBanks.map((b) => {
          if (b.id !== fromSourceId) return b;
          const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
          appliedWalletDelta = roundCurrency(b.balance - nextBal);
          return { ...b, balance: nextBal };
        });
      }

      let appliedToWalletDelta = cleanAmount;
      if (toIsCash) {
        nextCash = roundCurrency(nextCash + cleanAmount);
      } else if (toBank) {
        nextBanks = nextBanks.map((b) =>
          b.id === toSourceId
            ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
            : b
        );
      } else if (toCard) {
        nextCards = nextCards.map((c) => {
          if (c.id !== toSourceId) return c;
          const nextUsed = Math.max(0, roundCurrency(c.used - cleanAmount));
          appliedToWalletDelta = roundCurrency(c.used - nextUsed);
          return { ...c, used: nextUsed };
        });
      }

      const defaultLabel = toCard
        ? `Paid ${toLabel} from ${fromLabel}`
        : `Transfer: ${fromLabel} → ${toLabel}`;

      const entry: TransactionEntry = {
        id: makeUid('xfer'),
        type: 'wallet_transfer',
        amount: cleanAmount,
        label: action.note?.trim() || defaultLabel,
        icon: toCard ? 'credit-card' : 'repeat',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: fromSourceId,
        paymentSourceLabel: fromLabel,
        toPaymentSourceId: toSourceId,
        toPaymentSourceLabel: toLabel,
        appliedWalletDelta,
        appliedToWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'ADD_BANK': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
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
      };

    case 'ADD_CREDIT_CARD': {
      const trimmed = action.name.trim();
      if (!trimmed || action.limit <= 0) return state;
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
      if (!trimmed || action.limit <= 0) return state;
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
      };

    case 'LOG_PAYDAY_CHECKIN': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const cleanSavings = roundCurrency(Math.max(0, action.savingsAllocation));
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
