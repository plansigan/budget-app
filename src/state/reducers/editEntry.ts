import { TransactionEntry } from '../../types/budget';
import { roundCurrency } from '../budgetMath';
import {
  applyWalletDelta,
  isEditableEntry,
  reconcileEditedWalletDelta,
} from './helpers';
import { SliceReducer } from './types';

export const handleEditEntryAction: SliceReducer = (state, action) => {
  if (action.type !== 'EDIT_ENTRY') return undefined;

  if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
  if (!isEditableEntry(state, action.entryId)) return state;
  const target = state.entries.find((e) => e.id === action.entryId);
  if (!target) return state;

  let cleanAmount = roundCurrency(Math.max(0.01, action.amount));
  const cleanLabel = action.label.trim() || target.label;

  let nextCash = state.cashOnHand;
  let nextBanks = state.banks;
  let nextCards = state.creditCards;
  let nextEnvelopes = state.envelopes || [];
  let nextSaved = state.monthlySaved;
  let nextTreats = state.treats;

  let nextAppliedWalletDelta = target.appliedWalletDelta;
  let nextSignedDelta = target.signedDelta;
  let nextPaymentSourceId = target.paymentSourceId;
  let nextPaymentSourceLabel = target.paymentSourceLabel;
  let nextIsCardPayment = target.isCardPayment;
  let nextPreviousEnvelopeBalance = target.previousEnvelopeBalance;
  let nextAppliedEnvelopeDelta = target.appliedEnvelopeDelta;

  if (
    target.type === 'spend' ||
    target.type === 'bill_paid' ||
    target.type === 'envelope_spend'
  ) {
    const requestedSourceId =
      action.paymentSourceId !== undefined
        ? action.paymentSourceId
        : target.paymentSourceId;
    const normalizedRequested =
      requestedSourceId === 'none' || !requestedSourceId
        ? undefined
        : requestedSourceId;
    const oldApplied =
      typeof target.appliedWalletDelta === 'number'
        ? target.appliedWalletDelta
        : target.paymentSourceId
        ? target.amount
        : 0;

    if (normalizedRequested === target.paymentSourceId) {
      if (target.paymentSourceId) {
        const rec = reconcileEditedWalletDelta(
          state,
          target.paymentSourceId,
          'outflow',
          oldApplied,
          cleanAmount
        );
        nextCash = rec.cashOnHand;
        nextBanks = rec.banks;
        nextCards = rec.creditCards;
        nextAppliedWalletDelta = rec.nextAppliedDelta;
      }
    } else {
      const rev = applyWalletDelta(
        { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
        target.paymentSourceId,
        'inflow',
        oldApplied,
        { allowCardInflow: true }
      );
      const applied = applyWalletDelta(
        rev,
        normalizedRequested,
        'outflow',
        cleanAmount
      );
      nextCash = applied.cashOnHand;
      nextBanks = applied.banks;
      nextCards = applied.creditCards;
      nextPaymentSourceId = applied.effectiveSourceId;
      nextPaymentSourceLabel = applied.sourceLabel;
      nextAppliedWalletDelta = applied.appliedDelta;
    }

    if (target.type === 'envelope_spend' && target.envelopeId) {
      nextEnvelopes = nextEnvelopes.map((env) => {
        if (env.id !== target.envelopeId) return env;
        const appliedEnv =
          typeof target.appliedEnvelopeDelta === 'number'
            ? target.appliedEnvelopeDelta
            : typeof target.previousEnvelopeBalance === 'number'
            ? Math.min(target.amount, target.previousEnvelopeBalance)
            : target.amount;
        const restoredEnv = roundCurrency(env.balance + appliedEnv);
        const nextEnvBal = Math.max(0, roundCurrency(restoredEnv - cleanAmount));
        nextPreviousEnvelopeBalance = restoredEnv;
        nextAppliedEnvelopeDelta = roundCurrency(restoredEnv - nextEnvBal);
        return { ...env, balance: nextEnvBal };
      });
    }
  } else if (target.type === 'wallet_deposit') {
    const requestedSourceId =
      action.paymentSourceId !== undefined
        ? action.paymentSourceId
        : target.paymentSourceId;
    const oldApplied =
      typeof target.appliedWalletDelta === 'number'
        ? target.appliedWalletDelta
        : target.amount;
    if (requestedSourceId === target.paymentSourceId) {
      const rec = reconcileEditedWalletDelta(
        state,
        target.paymentSourceId,
        'inflow',
        oldApplied,
        cleanAmount
      );
      nextCash = rec.cashOnHand;
      nextBanks = rec.banks;
      nextCards = rec.creditCards;
      nextAppliedWalletDelta = rec.nextAppliedDelta;
    } else {
      const rev = applyWalletDelta(
        { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
        target.paymentSourceId,
        'outflow',
        oldApplied,
        { allowCardInflow: true }
      );
      const applied = applyWalletDelta(
        rev,
        requestedSourceId,
        'inflow',
        cleanAmount,
        { allowCardInflow: true }
      );
      if (applied.sourceKind === 'none') {
        return state;
      }
      nextCash = applied.cashOnHand;
      nextBanks = applied.banks;
      nextCards = applied.creditCards;
      nextPaymentSourceId = applied.effectiveSourceId;
      nextPaymentSourceLabel = applied.sourceLabel;
      nextAppliedWalletDelta = applied.appliedDelta;
      nextIsCardPayment = applied.sourceKind === 'card';
    }
    nextSignedDelta = cleanAmount;
  } else if (target.type === 'save_direct') {
    const delta = roundCurrency(cleanAmount - target.amount);
    nextSaved = Math.max(0, roundCurrency(state.monthlySaved + delta));
  } else if (target.type === 'treat_direct') {
    const linkedTreat = target.treatId
      ? state.treats.find((t) => t.id === target.treatId && !t.claimed)
      : undefined;
    if (linkedTreat) {
      const maxAllowableAmount = roundCurrency(
        target.amount + Math.max(0, linkedTreat.target - linkedTreat.funded)
      );
      cleanAmount = Math.min(cleanAmount, maxAllowableAmount);
      const delta = roundCurrency(cleanAmount - target.amount);
      nextTreats = state.treats.map((t) =>
        t.id === linkedTreat.id
          ? {
              ...t,
              funded: Math.max(
                0,
                Math.min(t.target, roundCurrency(t.funded + delta))
              ),
              fromImpulses: Math.max(0, roundCurrency(t.fromImpulses + delta)),
            }
          : t
      );
    } else {
      const delta = roundCurrency(cleanAmount - target.amount);
      nextSaved = Math.max(0, roundCurrency(nextSaved + delta));
    }
  }

  const canUpdateCat =
    target.type === 'spend' || target.type === 'envelope_spend';

  const updatedEntry: TransactionEntry = {
    ...target,
    amount: cleanAmount,
    label: cleanLabel,
    paymentSourceId: nextPaymentSourceId,
    paymentSourceLabel: nextPaymentSourceLabel,
    ...(nextIsCardPayment !== undefined
      ? { isCardPayment: nextIsCardPayment }
      : {}),
    ...(canUpdateCat && action.category !== undefined
      ? { category: action.category }
      : {}),
    ...(canUpdateCat && action.icon !== undefined ? { icon: action.icon } : {}),
    ...(nextAppliedWalletDelta !== undefined
      ? { appliedWalletDelta: nextAppliedWalletDelta }
      : {}),
    ...(nextSignedDelta !== undefined
      ? { signedDelta: nextSignedDelta }
      : {}),
    ...(nextPreviousEnvelopeBalance !== undefined
      ? { previousEnvelopeBalance: nextPreviousEnvelopeBalance }
      : {}),
    ...(nextAppliedEnvelopeDelta !== undefined
      ? { appliedEnvelopeDelta: nextAppliedEnvelopeDelta }
      : {}),
  };

  return {
    ...state,
    cashOnHand: nextCash,
    banks: nextBanks,
    creditCards: nextCards,
    envelopes: nextEnvelopes,
    monthlySaved: nextSaved,
    treats: nextTreats,
    entries: state.entries.map((e) =>
      e.id === action.entryId ? updatedEntry : e
    ),
  };
};
