import { useCallback, useMemo } from 'react';
import { getTodayKey, roundCurrency } from '../../state/budgetMath';
import { resolvePaymentSource } from '../../state/reducers/helpers';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { ActionHookDeps } from './types';

export function useWalletAccountActions({
  dispatch,
  stateRef,
  showToast,
}: ActionHookDeps) {
  const depositToWalletAccount = useCallback(
    (sourceId: string, amount: number, note?: string) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const resolved = resolvePaymentSource(stateRef.current, sourceId);
      if (resolved.kind === 'none') return;

      triggerSuccessHaptic();
      dispatch({
        type: 'DEPOSIT_TO_WALLET',
        sourceId,
        amount: cleanAmount,
        note,
        todayKey: getTodayKey(),
      });
      showToast(
        resolved.kind === 'card'
          ? `Paid ${formatPeso(cleanAmount)} toward ${resolved.label}`
          : `Added ${formatPeso(cleanAmount)} to ${resolved.label}`,
        true
      );
    },
    [dispatch, stateRef, showToast]
  );

  const setAccountBalanceWithLog = useCallback(
    (sourceId: string, newBalance: number, note?: string) => {
      if (!Number.isFinite(newBalance)) return;
      const cleanBalance = Math.max(0, roundCurrency(newBalance));
      const resolved = resolvePaymentSource(stateRef.current, sourceId);
      if (resolved.kind === 'none') return;

      const oldBalance =
        resolved.kind === 'card' ? resolved.used : resolved.balance;
      if (roundCurrency(cleanBalance - oldBalance) === 0) return;

      triggerLightHaptic();
      dispatch({
        type: 'SET_ACCOUNT_BALANCE',
        sourceId,
        newBalance: cleanBalance,
        note,
        todayKey: getTodayKey(),
      });
      showToast(`Updated ${resolved.label} balance`, false);
    },
    [dispatch, stateRef, showToast]
  );

  const transferBetweenAccounts = useCallback(
    (
      fromSourceId: string,
      toSourceId: string,
      amount: number,
      note?: string
    ): boolean => {
      if (!Number.isFinite(amount) || amount <= 0) return false;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      if (!fromSourceId || !toSourceId || fromSourceId === toSourceId) {
        return false;
      }

      const current = stateRef.current;
      const fromResolved = resolvePaymentSource(current, fromSourceId);
      if (fromResolved.kind !== 'cash' && fromResolved.kind !== 'bank') {
        return false;
      }
      if (cleanAmount > fromResolved.balance) {
        triggerLightHaptic();
        showToast(
          `Insufficient ${fromResolved.label} balance (${formatPeso(fromResolved.balance)} available).`,
          false
        );
        return false;
      }

      const toResolved = resolvePaymentSource(current, toSourceId);
      if (toResolved.kind === 'none') return false;

      triggerSuccessHaptic();
      dispatch({
        type: 'TRANSFER_BETWEEN_ACCOUNTS',
        fromSourceId,
        toSourceId,
        amount: cleanAmount,
        note,
        todayKey: getTodayKey(),
      });
      showToast(
        toResolved.kind === 'card'
          ? `Paid ${formatPeso(cleanAmount)} toward ${toResolved.label} from ${fromResolved.label}`
          : `Transferred ${formatPeso(cleanAmount)} (${fromResolved.label} → ${toResolved.label})`,
        true
      );
      return true;
    },
    [dispatch, stateRef, showToast]
  );

  const addBank = useCallback(
    (name: string, balance: number) => {
      const trimmed = name.trim();
      if (!trimmed || !Number.isFinite(balance)) return;
      triggerSuccessHaptic();
      dispatch({ type: 'ADD_BANK', name: trimmed, balance });
      showToast(`Added bank: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const updateBank = useCallback(
    (bankId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      triggerSuccessHaptic();
      dispatch({ type: 'UPDATE_BANK', bankId, name: trimmed });
      showToast(`Updated bank: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const removeBank = useCallback(
    (bankId: string) => {
      triggerLightHaptic();
      dispatch({ type: 'REMOVE_BANK', bankId });
    },
    [dispatch]
  );

  const addCreditCard = useCallback(
    (name: string, limit: number, used: number, cutoffDay: number) => {
      const trimmed = name.trim();
      if (
        !trimmed ||
        !Number.isFinite(limit) ||
        limit <= 0 ||
        !Number.isFinite(used) ||
        !Number.isFinite(cutoffDay)
      ) {
        return;
      }
      triggerSuccessHaptic();
      dispatch({
        type: 'ADD_CREDIT_CARD',
        name: trimmed,
        limit,
        used,
        cutoffDay,
      });
      showToast(`💳 Added ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const updateCreditCard = useCallback(
    (cardId: string, name: string, limit: number, cutoffDay: number) => {
      const trimmed = name.trim();
      if (
        !trimmed ||
        !Number.isFinite(limit) ||
        limit <= 0 ||
        !Number.isFinite(cutoffDay)
      ) {
        return;
      }
      triggerSuccessHaptic();
      dispatch({
        type: 'UPDATE_CREDIT_CARD',
        cardId,
        name: trimmed,
        limit,
        cutoffDay,
      });
      showToast(`Updated card: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const removeCreditCard = useCallback(
    (cardId: string) => {
      triggerLightHaptic();
      dispatch({ type: 'REMOVE_CREDIT_CARD', cardId });
    },
    [dispatch]
  );

  const logPaydayCheckIn = useCallback(
    (
      amount: number,
      sourceId: string,
      savingsAllocation: number,
      note?: string,
      refillEnvelopeIds?: string[]
    ) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const cleanSavings = Number.isFinite(savingsAllocation)
        ? roundCurrency(Math.max(0, savingsAllocation))
        : 0;
      const current = stateRef.current;
      const matchedBank = current.banks.find((b) => b.id === sourceId);
      const sourceLabel = matchedBank ? matchedBank.name : 'Cash';
      const today = getTodayKey();

      const validEnvIds = new Set((current.envelopes || []).map((e) => e.id));
      const dedupedRefillIds = Array.from(
        new Set(refillEnvelopeIds || [])
      ).filter((id) => validEnvIds.has(id));

      triggerCelebrationHaptic();
      dispatch({
        type: 'LOG_PAYDAY_CHECKIN',
        amount: cleanAmount,
        sourceId,
        savingsAllocation: cleanSavings,
        note,
        todayKey: today,
        refillEnvelopeIds: dedupedRefillIds,
      });

      const refilledCount = dedupedRefillIds.length;
      if (refilledCount > 0) {
        showToast(
          `Payday logged to ${sourceLabel} & refilled ${refilledCount} allowance${refilledCount > 1 ? 's' : ''}!`,
          true
        );
      } else {
        showToast(
          cleanSavings > 0
            ? `Payday logged to ${sourceLabel} & +${formatPeso(cleanSavings)} saved!`
            : `Logged ${formatPeso(cleanAmount)} paycheck to ${sourceLabel}!`,
          true
        );
      }
    },
    [dispatch, stateRef, showToast]
  );

  const dismissPaydayPrompt = useCallback(
    (dateKey?: string) => {
      triggerLightHaptic();
      dispatch({
        type: 'DISMISS_PAYDAY_PROMPT',
        dateKey: dateKey || getTodayKey(),
      });
    },
    [dispatch]
  );

  return useMemo(
    () => ({
      depositToWalletAccount,
      setAccountBalanceWithLog,
      transferBetweenAccounts,
      addBank,
      updateBank,
      removeBank,
      addCreditCard,
      updateCreditCard,
      removeCreditCard,
      logPaydayCheckIn,
      dismissPaydayPrompt,
    }),
    [
      depositToWalletAccount,
      setAccountBalanceWithLog,
      transferBetweenAccounts,
      addBank,
      updateBank,
      removeBank,
      addCreditCard,
      updateCreditCard,
      removeCreditCard,
      logPaydayCheckIn,
      dismissPaydayPrompt,
    ]
  );
}
