import { useCallback, useMemo } from 'react';
import { getTodayKey, roundCurrency } from '../../state/budgetMath';
import { resolvePaymentSource } from '../../state/reducers/helpers';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendCategoryKey,
} from '../../types/budget';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { ActionHookDeps } from './types';

export function usePlanActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
  showToast,
}: ActionHookDeps) {
  const updateBudgetConfig = useCallback(
    (income: number, bills: number, savings: number) => {
      triggerLightHaptic();
      dispatch({ type: 'UPDATE_BUDGET_CONFIG', income, bills, savings });
    },
    [dispatch]
  );

  const updateSalarySchedule = useCallback(
    (frequency: 1 | 2, payday1: number, payday2: number) => {
      triggerLightHaptic();
      dispatch({ type: 'UPDATE_SALARY_SCHEDULE', frequency, payday1, payday2 });
    },
    [dispatch]
  );

  const updateBillAmount = useCallback(
    (billId: string, amount: number) => {
      dispatch({ type: 'UPDATE_BILL_AMOUNT', billId, amount });
    },
    [dispatch]
  );

  const updateBillItem = useCallback(
    (
      billId: string,
      name: string,
      icon: string,
      amount: number,
      dueDay?: number
    ) => {
      const trimmed = name.trim();
      const cleanAmount = roundCurrency(Math.max(0, amount));
      if (!trimmed || cleanAmount <= 0) return;

      triggerSuccessHaptic();
      dispatch({
        type: 'UPDATE_BILL_ITEM',
        billId,
        name: trimmed,
        icon,
        amount: cleanAmount,
        dueDay,
      });
      showToast(`Updated bill: ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const addBillItem = useCallback(
    (name: string, icon: string, amount: number, dueDay?: number) => {
      const trimmed = name.trim();
      const cleanAmount = roundCurrency(Math.max(0, amount));
      if (!trimmed || cleanAmount <= 0) return;

      triggerSuccessHaptic();
      dispatch({
        type: 'ADD_BILL_ITEM',
        name: trimmed,
        icon,
        amount: cleanAmount,
        dueDay,
      });
      showToast(
        `Added bill: ${trimmed} (${formatPeso(cleanAmount)})`,
        false
      );
    },
    [dispatch, showToast]
  );

  const updateBillDueDay = useCallback(
    (billId: string, dueDay?: number) => {
      triggerLightHaptic();
      dispatch({ type: 'UPDATE_BILL_DUE_DAY', billId, dueDay });
    },
    [dispatch]
  );

  const markBillPaid = useCallback(
    (billId: string, paymentSourceId?: string, amountOverride?: number) => {
      const current = stateRef.current;
      const bill = current.billItems.find((b) => b.id === billId);
      if (!bill) return;

      const today = getTodayKey();
      const monthKey = today.slice(0, 7);
      if (bill.lastPaidMonth === monthKey) {
        triggerLightHaptic();
        showToast(`${bill.name} is already marked paid this month.`, false);
        return;
      }

      const paidAmt = roundCurrency(
        Math.max(0, amountOverride ?? bill.amount)
      );
      triggerSuccessHaptic();
      dispatch({
        type: 'MARK_BILL_PAID',
        billId,
        paymentSourceId,
        amountOverride: paidAmt,
        todayKey: today,
      });
      showToast(`Paid ${bill.name} (${formatPeso(paidAmt)})`, true);
    },
    [dispatch, stateRef, showToast]
  );

  const removeBillItem = useCallback(
    (billId: string) => {
      triggerLightHaptic();
      dispatch({ type: 'REMOVE_BILL_ITEM', billId });
    },
    [dispatch]
  );

  const addEnvelope = useCallback(
    (
      name: string,
      icon: string,
      amountPerCycle: number,
      cadence: EnvelopeCadence,
      rolloverMode: EnvelopeRolloverMode
    ) => {
      const trimmed = name.trim();
      const cleanAmt = roundCurrency(amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return;
      triggerSuccessHaptic();
      dispatch({
        type: 'ADD_ENVELOPE',
        name: trimmed,
        icon,
        amountPerCycle: cleanAmt,
        cadence,
        rolloverMode,
      });
      showToast(
        `Added ${trimmed} allowance (${formatPeso(cleanAmt)})`,
        true
      );
    },
    [dispatch, showToast]
  );

  const updateEnvelope = useCallback(
    (
      id: string,
      name: string,
      icon: string,
      amountPerCycle: number,
      cadence: EnvelopeCadence,
      rolloverMode: EnvelopeRolloverMode,
      balance?: number
    ) => {
      const trimmed = name.trim();
      const cleanAmt = roundCurrency(amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return;
      triggerLightHaptic();
      dispatch({
        type: 'UPDATE_ENVELOPE',
        id,
        name: trimmed,
        icon,
        amountPerCycle: cleanAmt,
        cadence,
        rolloverMode,
        balance,
      });
      showToast(`Updated ${trimmed}`, false);
    },
    [dispatch, showToast]
  );

  const deleteEnvelope = useCallback(
    (id: string) => {
      const target = (stateRef.current.envelopes || []).find(
        (e) => e.id === id
      );
      triggerLightHaptic();
      dispatch({ type: 'DELETE_ENVELOPE', id });
      if (target) {
        showToast(`Removed ${target.name}`, false);
      }
    },
    [dispatch, stateRef, showToast]
  );

  const spendFromEnvelope = useCallback(
    (
      envelopeId: string,
      amount: number,
      label: string,
      icon: string,
      paymentSourceId?: string,
      category?: SpendCategoryKey
    ) => {
      const current = stateRef.current;
      const env = (current.envelopes || []).find((e) => e.id === envelopeId);
      if (!env) return;

      if (!Number.isFinite(amount) || amount <= 0) return;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;

      const resolved = resolvePaymentSource(current, paymentSourceId);
      const sourceLabel = resolved.label ? ` • ${resolved.label}` : '';

      triggerSuccessHaptic();
      dispatch({
        type: 'SPEND_FROM_ENVELOPE',
        envelopeId,
        amount: cleanAmount,
        label,
        icon,
        paymentSourceId,
        category,
        dateKey: targetDateKey,
        todayKey: getTodayKey(),
      });
      showToast(
        `${env.name}: -${formatPeso(cleanAmount)}${sourceLabel}`,
        false
      );
    },
    [dispatch, stateRef, selectedDateKeyRef, showToast]
  );

  const refillEnvelope = useCallback(
    (envelopeId: string) => {
      const env = (stateRef.current.envelopes || []).find(
        (e) => e.id === envelopeId
      );
      if (!env) return;
      triggerSuccessHaptic();
      dispatch({
        type: 'REFILL_ENVELOPE',
        envelopeId,
        todayKey: getTodayKey(),
      });
      showToast(
        env.rolloverMode === 'rollover'
          ? `Added +${formatPeso(env.amountPerCycle)} to ${env.name}`
          : `Reset ${env.name} to ${formatPeso(env.amountPerCycle)}`,
        true
      );
    },
    [dispatch, stateRef, showToast]
  );

  return useMemo(
    () => ({
      updateBudgetConfig,
      updateSalarySchedule,
      updateBillAmount,
      updateBillItem,
      addBillItem,
      updateBillDueDay,
      markBillPaid,
      removeBillItem,
      addEnvelope,
      updateEnvelope,
      deleteEnvelope,
      spendFromEnvelope,
      refillEnvelope,
    }),
    [
      updateBudgetConfig,
      updateSalarySchedule,
      updateBillAmount,
      updateBillItem,
      addBillItem,
      updateBillDueDay,
      markBillPaid,
      removeBillItem,
      addEnvelope,
      updateEnvelope,
      deleteEnvelope,
      spendFromEnvelope,
      refillEnvelope,
    ]
  );
}
