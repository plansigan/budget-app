import { useCallback, useMemo } from 'react';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  roundCurrency,
} from '../../state/budgetMath';
import { canUndoEntry, isEditableEntry } from '../../state/budgetReducer';
import { applyMidnightRollover } from '../../state/rollover';
import { SpendCategoryKey } from '../../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { ActionHookDeps } from './types';

export function useDailyActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
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
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;
      const current = stateRef.current;

      let sourceLabel = 'Cash';
      if (paymentSourceId !== 'cash') {
        const matchedBank = current.banks.find((b) => b.id === paymentSourceId);
        const matchedCard = current.creditCards.find(
          (c) => c.id === paymentSourceId
        );
        if (matchedBank) sourceLabel = matchedBank.name;
        else if (matchedCard) sourceLabel = matchedCard.name;
      }

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
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;
      const current = stateRef.current;
      const today = getTodayKey();
      const baseDaily = computeBaseDailyAllowance(
        current.settings,
        getBudgetedInstallmentsTotal(current.installments) +
          getTotalMonthlyEnvelopes(
            current.envelopes || [],
            current.settings.salaryFrequency
          )
      );
      const daySummary = computeDayMetricsFromEntries(
        current.entries,
        targetDateKey,
        baseDaily,
        current.rolloverBalance,
        today,
        current.lastActiveDate
      );
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
        todayKey: today,
      });
      showToast(
        `Saved ${formatPeso(take)} into your Savings Jar!`,
        true
      );
    },
    [dispatch, stateRef, selectedDateKeyRef, showToast]
  );

  const bankTodaySurplus = useCallback(() => {
    const current = stateRef.current;
    const targetDateKey = selectedDateKeyRef.current;
    const today = getTodayKey();
    const baseDaily = computeBaseDailyAllowance(
      current.settings,
      getBudgetedInstallmentsTotal(current.installments) +
        getTotalMonthlyEnvelopes(
          current.envelopes || [],
          current.settings.salaryFrequency
        )
    );
    const daySummary = computeDayMetricsFromEntries(
      current.entries,
      targetDateKey,
      baseDaily,
      current.rolloverBalance,
      today,
      current.lastActiveDate
    );
    const remaining = Math.max(0, roundCurrency(daySummary.safeRemaining));

    if (remaining <= 0) {
      triggerLightHaptic();
      showToast('Nothing left to save on this day.', false);
      return;
    }

    const activeUnclaimed =
      current.treats.find(
        (t) => t.id === current.activeTreatId && !t.claimed
      ) || current.treats.find((t) => !t.claimed);

    const toSavings = activeUnclaimed
      ? roundCurrency(remaining * 0.5)
      : remaining;
    const toTreat = activeUnclaimed
      ? roundCurrency(remaining - toSavings)
      : 0;

    triggerCelebrationHaptic();
    dispatch({
      type: 'BANK_TODAY_SURPLUS',
      dateKey: targetDateKey,
      todayKey: today,
    });

    if (activeUnclaimed) {
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
  }, [dispatch, stateRef, selectedDateKeyRef, showToast]);

  const simulateMidnightSplit = useCallback(() => {
    const current = stateRef.current;
    const today = getTodayKey();
    const alreadyRolledToday = current.entries.some(
      (e) =>
        e.type === 'midnight_split' && e.isAutoRollover && e.dateKey === today
    );
    if (alreadyRolledToday) {
      triggerLightHaptic();
      showToast(
        'Already tested 50/50 Midnight Split today. Undo it in Activity to re-test.',
        false
      );
      return;
    }

    const baseDaily = computeBaseDailyAllowance(
      current.settings,
      getBudgetedInstallmentsTotal(current.installments) +
        getTotalMonthlyEnvelopes(
          current.envelopes || [],
          current.settings.salaryFrequency
        )
    );
    const todaySummary = computeDayMetricsFromEntries(
      current.entries,
      today,
      baseDaily,
      current.rolloverBalance,
      today,
      current.lastActiveDate
    );
    if (todaySummary.safeRemaining <= 0) {
      triggerLightHaptic();
      showToast('No Safe-to-Spend left today to split.', false);
      return;
    }

    triggerSuccessHaptic();
    const result = applyMidnightRollover(current, today, 0);
    dispatch({ type: 'APPLY_ROLLOVER', newDateKey: today });

    showToast(
      `🌙 50/50 Split: +${formatPeso(result.vaultAdded)} & +${formatPeso(result.rolloverNext)} rollover!`,
      true
    );
  }, [dispatch, stateRef, showToast]);

  const undoEntry = useCallback(
    (entryId: string) => {
      const current = stateRef.current;
      const check = canUndoEntry(current, entryId);
      if (!check.ok) {
        if (check.reason.includes('claimed')) {
          triggerLightHaptic();
          showToast(check.reason, false);
        }
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
        label: trimmedLabel || 'Entry',
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
