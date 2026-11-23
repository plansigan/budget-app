import { useCallback, useMemo } from 'react';
import { getTodayKey, roundCurrency } from '../../state/budgetMath';
import { DebtDirection } from '../../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { ActionHookDeps } from './types';

export function useWalletActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
  showToast,
}: ActionHookDeps) {
  const depositToWalletAccount = useCallback(
    (sourceId: string, amount: number, note?: string) => {
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const current = stateRef.current;
      const isCash = sourceId === 'cash';
      const matchedBank = current.banks.find((b) => b.id === sourceId);
      const matchedCard = current.creditCards.find((c) => c.id === sourceId);
      if (!isCash && !matchedBank && !matchedCard) return;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      triggerSuccessHaptic();
      dispatch({
        type: 'DEPOSIT_TO_WALLET',
        sourceId,
        amount: cleanAmount,
        note,
        todayKey: getTodayKey(),
      });
      showToast(
        matchedCard
          ? `Paid ${formatPeso(cleanAmount)} toward ${sourceLabel}`
          : `Added ${formatPeso(cleanAmount)} to ${sourceLabel}`,
        true
      );
    },
    [dispatch, stateRef, showToast]
  );

  const setAccountBalanceWithLog = useCallback(
    (sourceId: string, newBalance: number, note?: string) => {
      const cleanBalance = Math.max(0, roundCurrency(newBalance));
      const current = stateRef.current;
      const isCash = sourceId === 'cash';
      const matchedBank = current.banks.find((b) => b.id === sourceId);
      const matchedCard = current.creditCards.find((c) => c.id === sourceId);
      if (!isCash && !matchedBank && !matchedCard) return;

      const oldBalance = isCash
        ? current.cashOnHand
        : matchedBank
        ? matchedBank.balance
        : matchedCard!.used;
      if (roundCurrency(cleanBalance - oldBalance) === 0) return;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      triggerLightHaptic();
      dispatch({
        type: 'SET_ACCOUNT_BALANCE',
        sourceId,
        newBalance: cleanBalance,
        note,
        todayKey: getTodayKey(),
      });
      showToast(`Updated ${sourceLabel} balance`, false);
    },
    [dispatch, stateRef, showToast]
  );

  const transferBetweenAccounts = useCallback(
    (
      fromSourceId: string,
      toSourceId: string,
      amount: number,
      note?: string
    ) => {
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      if (!fromSourceId || !toSourceId || fromSourceId === toSourceId) return;
      const current = stateRef.current;

      const fromBank = current.banks.find((b) => b.id === fromSourceId);
      const fromIsCash = fromSourceId === 'cash';
      if (!fromIsCash && !fromBank) return;

      const toBank = current.banks.find((b) => b.id === toSourceId);
      const toCard = current.creditCards.find((c) => c.id === toSourceId);
      const toIsCash = toSourceId === 'cash';
      if (!toIsCash && !toBank && !toCard) return;

      const fromLabel = fromIsCash ? 'Cash' : fromBank!.name;
      const toLabel = toIsCash
        ? 'Cash'
        : toBank
        ? toBank.name
        : toCard!.name;

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
        toCard
          ? `Paid ${formatPeso(cleanAmount)} toward ${toLabel} from ${fromLabel}`
          : `Transferred ${formatPeso(cleanAmount)} (${fromLabel} → ${toLabel})`,
        true
      );
    },
    [dispatch, stateRef, showToast]
  );

  const addBank = useCallback(
    (name: string, balance: number) => {
      const trimmed = name.trim();
      if (!trimmed) return;
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
      if (!trimmed || limit <= 0) return;
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
      if (!trimmed || limit <= 0) return;
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
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const cleanSavings = roundCurrency(Math.max(0, savingsAllocation));
      const current = stateRef.current;
      const matchedBank = current.banks.find((b) => b.id === sourceId);
      const sourceLabel = matchedBank ? matchedBank.name : 'Cash';
      const today = getTodayKey();

      triggerCelebrationHaptic();
      dispatch({
        type: 'LOG_PAYDAY_CHECKIN',
        amount: cleanAmount,
        sourceId,
        savingsAllocation: cleanSavings,
        note,
        todayKey: today,
        refillEnvelopeIds,
      });

      const refilledCount = (refillEnvelopeIds || []).length;
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

  const addInstallment = useCallback(
    (params: {
      name: string;
      provider: string;
      monthlyAmount: number;
      totalMonths: number;
      paidMonths: number;
      includeInBudget: boolean;
    }) => {
      const trimmed = params.name.trim();
      if (!trimmed || params.monthlyAmount <= 0 || params.totalMonths <= 0) {
        return;
      }
      triggerSuccessHaptic();
      dispatch({ type: 'ADD_INSTALLMENT', params });
      showToast(`Added installment: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const updateInstallment = useCallback(
    (
      id: string,
      params: {
        name: string;
        provider: string;
        monthlyAmount: number;
        totalMonths: number;
        paidMonths: number;
        includeInBudget: boolean;
      }
    ) => {
      const trimmed = params.name.trim();
      if (!trimmed || params.monthlyAmount <= 0 || params.totalMonths <= 0) {
        return;
      }
      triggerSuccessHaptic();
      dispatch({ type: 'UPDATE_INSTALLMENT', id, params });
      showToast(`Updated installment: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const markInstallmentMonthPaid = useCallback(
    (id: string) => {
      const target = stateRef.current.installments.find((i) => i.id === id);
      if (!target || target.paidMonths >= target.totalMonths) return;

      const nextPaid = target.paidMonths + 1;
      const isFinished = nextPaid >= target.totalMonths;
      if (isFinished) {
        triggerCelebrationHaptic();
      } else {
        triggerSuccessHaptic();
      }

      dispatch({
        type: 'MARK_INSTALLMENT_PAID',
        id,
        todayKey: getTodayKey(),
      });
      showToast(
        isFinished
          ? `${target.name} is 100% paid off!`
          : `Marked ${target.name} (${nextPaid}/${target.totalMonths} mo)`,
        isFinished
      );
    },
    [dispatch, stateRef, showToast]
  );

  const toggleInstallmentInBudget = useCallback(
    (id: string) => {
      triggerLightHaptic();
      dispatch({ type: 'TOGGLE_INSTALLMENT_IN_BUDGET', id });
    },
    [dispatch]
  );

  const removeInstallment = useCallback(
    (id: string) => {
      triggerLightHaptic();
      dispatch({ type: 'REMOVE_INSTALLMENT', id });
    },
    [dispatch]
  );

  const addDebt = useCallback(
    (params: {
      direction: DebtDirection;
      personName: string;
      amount: number;
      note?: string;
      paymentSourceId?: string;
      affectsDailyBudget?: boolean;
    }) => {
      const trimmedName = params.personName.trim();
      const cleanAmount = roundCurrency(params.amount);
      if (!trimmedName || cleanAmount <= 0) return;

      triggerSuccessHaptic();
      dispatch({
        type: 'ADD_DEBT',
        direction: params.direction,
        personName: trimmedName,
        amount: cleanAmount,
        note: params.note,
        paymentSourceId: params.paymentSourceId,
        affectsDailyBudget: params.affectsDailyBudget,
        dateKey: selectedDateKeyRef.current,
        todayKey: getTodayKey(),
      });
      showToast(
        params.direction === 'i_owe'
          ? `Added I Owe: ${trimmedName} (${formatPeso(cleanAmount)})`
          : `Added Owed to Me: ${trimmedName} (${formatPeso(cleanAmount)})`,
        false
      );
    },
    [dispatch, selectedDateKeyRef, showToast]
  );

  const updateDebt = useCallback(
    (
      id: string,
      params: {
        direction: DebtDirection;
        personName: string;
        amount: number;
        note?: string;
      }
    ) => {
      const trimmedName = params.personName.trim();
      const cleanAmount = roundCurrency(params.amount);
      if (!trimmedName || cleanAmount <= 0) return;
      triggerLightHaptic();
      dispatch({
        type: 'UPDATE_DEBT',
        id,
        direction: params.direction,
        personName: trimmedName,
        amount: cleanAmount,
        note: params.note,
      });
      showToast(`Updated debt with ${trimmedName}`, false);
    },
    [dispatch, showToast]
  );

  const deleteDebt = useCallback(
    (id: string) => {
      const target = (stateRef.current.debts || []).find((d) => d.id === id);
      triggerLightHaptic();
      dispatch({ type: 'DELETE_DEBT', id });
      showToast(
        target ? `Removed debt with ${target.personName}` : 'Removed debt',
        false
      );
    },
    [dispatch, stateRef, showToast]
  );

  const recordDebtPayment = useCallback(
    (
      id: string,
      amount: number,
      paymentSourceId?: string,
      affectsDailyBudget?: boolean
    ) => {
      const debt = (stateRef.current.debts || []).find((d) => d.id === id);
      if (!debt) return;
      const remaining = roundCurrency(Math.max(0, debt.amount - debt.paidAmount));
      if (remaining <= 0) return;

      const applied = roundCurrency(
        Math.min(Math.max(0.01, amount), remaining)
      );
      const fullySettled = roundCurrency(debt.paidAmount + applied) >= debt.amount;

      if (fullySettled) triggerCelebrationHaptic();
      else triggerSuccessHaptic();

      dispatch({
        type: 'RECORD_DEBT_PAYMENT',
        id,
        amount: applied,
        paymentSourceId,
        affectsDailyBudget,
        dateKey: selectedDateKeyRef.current,
        todayKey: getTodayKey(),
      });

      if (debt.direction === 'i_owe') {
        showToast(
          fullySettled
            ? `Settled debt with ${debt.personName} (${formatPeso(applied)})!`
            : `Paid ${formatPeso(applied)} to ${debt.personName}`,
          fullySettled
        );
      } else {
        showToast(
          fullySettled
            ? `${debt.personName} paid in full (${formatPeso(applied)})!`
            : `Received ${formatPeso(applied)} from ${debt.personName}`,
          true
        );
      }
    },
    [dispatch, stateRef, selectedDateKeyRef, showToast]
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
      addInstallment,
      updateInstallment,
      markInstallmentMonthPaid,
      toggleInstallmentInBudget,
      removeInstallment,
      addDebt,
      updateDebt,
      deleteDebt,
      recordDebtPayment,
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
      addInstallment,
      updateInstallment,
      markInstallmentMonthPaid,
      toggleInstallmentInBudget,
      removeInstallment,
      addDebt,
      updateDebt,
      deleteDebt,
      recordDebtPayment,
    ]
  );
}
