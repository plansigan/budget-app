import { useCallback, useMemo } from 'react';
import { getTodayKey, roundCurrency } from '../../state/budgetMath';
import { canUndoEntry, isEditableEntry } from '../../state/budgetReducer';
import {
  allocateToTreatWithSpill,
  findActiveUnclaimedTreat,
  resolvePaymentSource,
} from '../../state/reducers/helpers';
import { SpendCategoryKey } from '../../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { formatEntryDateLocal } from '../../utils/transactionDisplay';
import { ActionHookDeps } from './types';

export function useDailyActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
  getDaySummaryRef,
  showToast,
}: ActionHookDeps) {
  const logSpend = useCallback(
    (
      amount: number,
      label: string,
      icon: string,
      paymentSourceId: string = 'cash',
      category?: SpendCategoryKey
    ) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;
      const current = stateRef.current;
      const resolved = resolvePaymentSource(current, paymentSourceId);
      const sourceLabel = resolved.label || 'Track Only';

      triggerLightHaptic();
      dispatch({
        type: 'LOG_SPEND',
        amount: cleanAmount,
        label,
        icon,
        paymentSourceId,
        category,
        dateKey: targetDateKey,
        todayKey: getTodayKey(),
      });

      const cleanLabel = label.trim() || 'Expense';
      showToast(
        `Logged ${cleanLabel}: -${formatPeso(cleanAmount)} (${sourceLabel})`,
        false
      );
    },
    [dispatch, stateRef, selectedDateKeyRef, showToast]
  );

  const saveToJar = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;
      const daySummary = getDaySummaryRef.current(targetDateKey);
      const take = roundCurrency(
        Math.min(cleanAmount, Math.max(0, daySummary.safeRemaining))
      );

      if (take <= 0) {
        triggerLightHaptic();
        showToast(
          'No Safe-to-Spend left on this day to move to savings.',
          false
        );
        return;
      }

      triggerSuccessHaptic();
      dispatch({
        type: 'SAVE_TO_JAR',
        amount: cleanAmount,
        dateKey: targetDateKey,
        todayKey: getTodayKey(),
      });
      showToast(
        `Saved ${formatPeso(take)} into your Savings Jar!`,
        true
      );
    },
    [dispatch, selectedDateKeyRef, getDaySummaryRef, showToast]
  );

  const bankTodaySurplus = useCallback(() => {
    const current = stateRef.current;
    const targetDateKey = selectedDateKeyRef.current;
    const daySummary = getDaySummaryRef.current(targetDateKey);
    const remaining = Math.max(0, roundCurrency(daySummary.safeRemaining));

    if (remaining <= 0) {
      triggerLightHaptic();
      showToast('Nothing left to save on this day.', false);
      return;
    }

    const activeUnclaimed = findActiveUnclaimedTreat(
      current.treats,
      current.activeTreatId
    );
    const rawToSavings = activeUnclaimed
      ? roundCurrency(remaining * 0.5)
      : remaining;
    const rawToTreat = activeUnclaimed
      ? roundCurrency(remaining - rawToSavings)
      : 0;
    const allocation = allocateToTreatWithSpill(
      current.treats,
      current.activeTreatId,
      rawToTreat,
      'fromRollovers'
    );
    const toTreat = allocation.treatAdded;
    const toSavings = roundCurrency(rawToSavings + allocation.spillToSavings);

    triggerCelebrationHaptic();
    dispatch({
      type: 'BANK_TODAY_SURPLUS',
      dateKey: targetDateKey,
      todayKey: getTodayKey(),
    });

    if (toTreat > 0) {
      showToast(
        `Day ended! +${formatPeso(toSavings)} Savings & +${formatPeso(toTreat)} Treat`,
        true
      );
    } else {
      showToast(
        `Day ended! +${formatPeso(toSavings)} added to Savings Jar`,
        true
      );
    }
  }, [dispatch, stateRef, selectedDateKeyRef, getDaySummaryRef, showToast]);

  const simulateMidnightSplit = useCallback(() => {
    const current = stateRef.current;
    const today = getTodayKey();
    const alreadyRolledToday = current.entries.some(
      (e) =>
        e.type === 'midnight_split' &&
        e.isAutoRollover &&
        formatEntryDateLocal(e, current.lastActiveDate) === today
    );
    if (alreadyRolledToday) {
      triggerLightHaptic();
      showToast(
        'Already tested 50/50 Midnight Split today. Undo it in Activity to re-test.',
        false
      );
      return;
    }

    const todaySummary = getDaySummaryRef.current(today);
    const currentSafe = Math.max(0, todaySummary.safeRemaining);
    if (currentSafe <= 0) {
      triggerLightHaptic();
      showToast('No Safe-to-Spend left today to split.', false);
      return;
    }

    const vaultAdded = roundCurrency(currentSafe * 0.5);
    const rolloverNext = roundCurrency(currentSafe - vaultAdded);

    triggerSuccessHaptic();
    dispatch({ type: 'APPLY_ROLLOVER', newDateKey: today });

    showToast(
      `🌙 50/50 Split: +${formatPeso(vaultAdded)} & +${formatPeso(rolloverNext)} rollover!`,
      true
    );
  }, [dispatch, stateRef, getDaySummaryRef, showToast]);

  const undoEntry = useCallback(
    (entryId: string) => {
      const current = stateRef.current;
      const check = canUndoEntry(current, entryId);
      if (!check.ok) {
        triggerLightHaptic();
        showToast(check.reason, false);
        return;
      }
      triggerLightHaptic();
      dispatch({ type: 'UNDO_ENTRY', entryId });
      showToast('Undid entry', false);
    },
    [dispatch, stateRef, showToast]
  );

  const editEntry = useCallback(
    (
      entryId: string,
      updates: {
        amount: number;
        label: string;
        category?: SpendCategoryKey;
        icon?: string;
      }
    ) => {
      if (!Number.isFinite(updates.amount) || updates.amount <= 0) return;
      const current = stateRef.current;
      if (!isEditableEntry(current, entryId)) {
        triggerLightHaptic();
        showToast('This entry can no longer be edited.', false);
        return;
      }
      const cleanAmount = roundCurrency(Math.max(0.01, updates.amount));
      const trimmedLabel = updates.label.trim();
      triggerSuccessHaptic();
      dispatch({
        type: 'EDIT_ENTRY',
        entryId,
        amount: cleanAmount,
        label: trimmedLabel,
        category: updates.category,
        icon: updates.icon,
      });
      showToast('Updated transaction', false);
    },
    [dispatch, stateRef, showToast]
  );

  return useMemo(
    () => ({
      logSpend,
      saveToJar,
      bankTodaySurplus,
      simulateMidnightSplit,
      undoEntry,
      editEntry,
    }),
    [
      logSpend,
      saveToJar,
      bankTodaySurplus,
      simulateMidnightSplit,
      undoEntry,
      editEntry,
    ]
  );
}
