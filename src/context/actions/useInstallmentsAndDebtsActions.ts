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

export function useInstallmentsAndDebtsActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
  showToast,
}: ActionHookDeps) {
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
      if (
        !trimmed ||
        !Number.isFinite(params.monthlyAmount) ||
        roundCurrency(params.monthlyAmount) <= 0 ||
        !Number.isFinite(params.totalMonths) ||
        params.totalMonths <= 0
      ) {
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
      if (
        !trimmed ||
        !Number.isFinite(params.monthlyAmount) ||
        roundCurrency(params.monthlyAmount) <= 0 ||
        !Number.isFinite(params.totalMonths) ||
        params.totalMonths <= 0
      ) {
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
      if (!trimmedName || !Number.isFinite(params.amount)) return;
      const cleanAmount = roundCurrency(params.amount);
      if (cleanAmount <= 0) return;

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
      if (!trimmedName || !Number.isFinite(params.amount)) return;
      const cleanAmount = roundCurrency(params.amount);
      if (cleanAmount <= 0) return;
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
      if (!Number.isFinite(amount) || amount <= 0) return;
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
