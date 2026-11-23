import { useCallback, useMemo } from 'react';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  roundCurrency,
} from '../../state/budgetMath';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';
import { ActionHookDeps } from './types';

export function useGoalsActions({
  dispatch,
  stateRef,
  selectedDateKeyRef,
  showToast,
}: ActionHookDeps) {
  const boostSavingsGoal = useCallback(
    (delta: number) => {
      const cleanDelta = roundCurrency(Math.max(0, delta));
      if (cleanDelta <= 0) return;
      triggerSuccessHaptic();
      dispatch({ type: 'BOOST_SAVINGS_GOAL', delta: cleanDelta });
      showToast(
        `Monthly savings goal raised by +${formatPeso(cleanDelta)}!`,
        true
      );
    },
    [dispatch, showToast]
  );

  const fundActiveTreat = useCallback(
    (amount: number) => {
      const cleanAmount = roundCurrency(Math.max(0.01, amount));
      const targetDateKey = selectedDateKeyRef.current;
      const current = stateRef.current;
      const activeUnclaimed =
        current.treats.find(
          (t) => t.id === current.activeTreatId && !t.claimed
        ) || current.treats.find((t) => !t.claimed);

      if (!activeUnclaimed) {
        triggerLightHaptic();
        showToast('Add a Treat in the Goals tab first!', false);
        return;
      }

      const remainingNeeded = Math.max(
        0,
        roundCurrency(activeUnclaimed.target - activeUnclaimed.funded)
      );
      if (remainingNeeded <= 0) {
        triggerLightHaptic();
        showToast(
          `${activeUnclaimed.name} is already 100% funded! Tap Claim Treat.`,
          true
        );
        return;
      }

      const actualAmount = roundCurrency(Math.min(cleanAmount, remainingNeeded));
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
      const exceededSafe =
        actualAmount > Math.max(0, roundCurrency(daySummary.safeRemaining));

      triggerSuccessHaptic();
      dispatch({
        type: 'FUND_ACTIVE_TREAT',
        amount: cleanAmount,
        dateKey: targetDateKey,
        todayKey: today,
      });

      if (exceededSafe) {
        showToast(
          `Added ${formatPeso(actualAmount)} to ${activeUnclaimed.name} (exceeded daily safe-to-spend).`,
          false
        );
      } else if (actualAmount < cleanAmount) {
        showToast(
          `Funded ${formatPeso(actualAmount)} to finish ${activeUnclaimed.name}!`,
          true
        );
      } else {
        showToast(
          `Added ${formatPeso(actualAmount)} to ${activeUnclaimed.name}!`,
          true
        );
      }
    },
    [dispatch, stateRef, selectedDateKeyRef, showToast]
  );

  const claimTreat = useCallback(
    (treatId: string) => {
      const target = stateRef.current.treats.find((t) => t.id === treatId);
      if (!target || target.funded < target.target || target.claimed) {
        return;
      }
      triggerCelebrationHaptic();
      dispatch({ type: 'CLAIM_TREAT', treatId });
      showToast(`🎟️ Claimed ${target.name}! Enjoy guilt-free!`, true);
    },
    [dispatch, stateRef, showToast]
  );

  const addTreat = useCallback(
    (name: string, icon: string, target: number) => {
      if (stateRef.current.treats.length >= 3) {
        triggerLightHaptic();
        showToast('Maximum of 3 treats allowed in Wishlist.', false);
        return;
      }
      const trimmed = name.trim();
      const cleanTarget = roundCurrency(target);
      if (!trimmed || cleanTarget <= 0) return;

      triggerSuccessHaptic();
      dispatch({ type: 'ADD_TREAT', name: trimmed, icon, target: cleanTarget });
      showToast(
        `Locked "${trimmed}" (${formatPeso(cleanTarget)}) as active treat`,
        true
      );
    },
    [dispatch, stateRef, showToast]
  );

  const deleteTreat = useCallback(
    (treatId: string) => {
      const target = stateRef.current.treats.find((t) => t.id === treatId);
      if (!target) return;
      const refundToSavings = target.claimed ? 0 : roundCurrency(target.funded);
      triggerSuccessHaptic();
      dispatch({ type: 'DELETE_TREAT', treatId });

      if (refundToSavings > 0) {
        showToast(
          `🗑️ Treat deleted. +${formatPeso(refundToSavings)} moved to Savings Jar!`,
          true
        );
      } else {
        showToast('🗑️ Treat removed from wishlist.', false);
      }
    },
    [dispatch, stateRef, showToast]
  );

  const setActiveTreat = useCallback(
    (treatId: string) => {
      triggerLightHaptic();
      dispatch({ type: 'SET_ACTIVE_TREAT', treatId });
    },
    [dispatch]
  );

  const addSinkingFund = useCallback(
    (name: string, icon: string, target: number, monthsToGoal: number) => {
      const trimmed = name.trim();
      const cleanTarget = roundCurrency(target);
      if (!trimmed || cleanTarget <= 0) return;

      triggerSuccessHaptic();
      dispatch({
        type: 'ADD_SINKING_FUND',
        name: trimmed,
        icon,
        target: cleanTarget,
        monthsToGoal,
      });
      showToast(`Added ${trimmed} bucket!`, false);
    },
    [dispatch, showToast]
  );

  const depositToSinkingFund = useCallback(
    (id: string, amount: number) => {
      const cleanAmt = roundCurrency(Math.max(0.01, amount));
      const target = stateRef.current.sinkingFunds.find((f) => f.id === id);
      if (!target) return;

      const hitGoal = target.saved + cleanAmt >= target.target;
      if (hitGoal) triggerCelebrationHaptic();
      else triggerSuccessHaptic();

      dispatch({
        type: 'DEPOSIT_TO_SINKING_FUND',
        id,
        amount: cleanAmt,
        todayKey: getTodayKey(),
      });
      showToast(
        hitGoal
          ? `${target.name} goal reached!`
          : `Added ${formatPeso(cleanAmt)} to ${target.name}`,
        hitGoal
      );
    },
    [dispatch, stateRef, showToast]
  );

  const deleteSinkingFund = useCallback(
    (id: string) => {
      triggerLightHaptic();
      const target = stateRef.current.sinkingFunds.find((f) => f.id === id);
      if (!target) return;
      const refund = Math.max(0, roundCurrency(target.saved));

      dispatch({ type: 'DELETE_SINKING_FUND', id });

      if (refund > 0) {
        showToast(
          `Removed ${target.name}. +${formatPeso(refund)} moved to Savings Jar`,
          true
        );
      } else {
        showToast(`Removed ${target.name}`, false);
      }
    },
    [dispatch, stateRef, showToast]
  );

  return useMemo(
    () => ({
      boostSavingsGoal,
      fundActiveTreat,
      claimTreat,
      addTreat,
      deleteTreat,
      setActiveTreat,
      addSinkingFund,
      depositToSinkingFund,
      deleteSinkingFund,
    }),
    [
      boostSavingsGoal,
      fundActiveTreat,
      claimTreat,
      addTreat,
      deleteTreat,
      setActiveTreat,
      addSinkingFund,
      depositToSinkingFund,
      deleteSinkingFund,
    ]
  );
}
