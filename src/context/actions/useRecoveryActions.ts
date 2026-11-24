import type React from 'react';
import { useCallback, useMemo } from 'react';
import {
  AutoBackupSnapshot,
  listAutoSnapshots as listStoredAutoSnapshots,
} from '../../state/autoSnapshots';
import { getTodayKey } from '../../state/budgetMath';
import { BudgetAction } from '../../state/budgetReducer';
import { OnboardingParams, PersistedBudgetState } from '../../state/defaults';
import { parseBackupJson, serializeBackupJson } from '../../utils/backupExport';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
} from '../../utils/haptics';
import { MilestoneDefinition } from '../../utils/savingsCoach';

interface RecoveryActionDeps {
  dispatch: React.Dispatch<BudgetAction>;
  stateRef: React.MutableRefObject<PersistedBudgetState>;
  snapshotDirtyRef: React.MutableRefObject<boolean>;
  showToast: (text: string, isDopamine: boolean) => void;
  setIsEditingOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingMilestone: React.Dispatch<
    React.SetStateAction<MilestoneDefinition | null>
  >;
  setSelectedDateKeyState: React.Dispatch<React.SetStateAction<string>>;
  setAutoSnapshotCount: React.Dispatch<React.SetStateAction<number>>;
  setLastAutoSnapshotAt: React.Dispatch<
    React.SetStateAction<string | undefined>
  >;
  runSnapshotCapture: (
    snapshotState: PersistedBudgetState,
    reason: AutoBackupSnapshot['reason']
  ) => Promise<boolean>;
}

function hasConfiguredUserData(curr: PersistedBudgetState): boolean {
  if (!curr.hasCompletedOnboarding) return false;
  return (
    curr.entries.length > 0 ||
    curr.billItems.length > 0 ||
    (curr.envelopes || []).length > 0 ||
    curr.banks.length > 0 ||
    curr.creditCards.length > 0 ||
    curr.treats.length > 0 ||
    curr.sinkingFunds.length > 0 ||
    curr.installments.length > 0 ||
    (curr.debts || []).length > 0
  );
}

export function useRecoveryActions({
  dispatch,
  stateRef,
  snapshotDirtyRef,
  showToast,
  setIsEditingOnboarding,
  setPendingMilestone,
  setSelectedDateKeyState,
  setAutoSnapshotCount,
  setLastAutoSnapshotAt,
  runSnapshotCapture,
}: RecoveryActionDeps) {
  const completeOnboarding = useCallback(
    (params: OnboardingParams) => {
      triggerCelebrationHaptic();
      dispatch({ type: 'COMPLETE_ONBOARDING', params });
      setIsEditingOnboarding(false);
      setPendingMilestone(null);
      setSelectedDateKeyState(getTodayKey());
      showToast(
        params.preserveExistingData
          ? 'Updated your budget settings!'
          : '✨ Welcome to Velvet! Your budget is ready.',
        true
      );
    },
    [
      dispatch,
      setIsEditingOnboarding,
      setPendingMilestone,
      setSelectedDateKeyState,
      showToast,
    ]
  );

  const reopenOnboarding = useCallback(() => {
    triggerLightHaptic();
    setIsEditingOnboarding(true);
    dispatch({ type: 'REOPEN_ONBOARDING' });
  }, [dispatch, setIsEditingOnboarding]);

  const cancelReopenedOnboarding = useCallback(() => {
    triggerLightHaptic();
    setIsEditingOnboarding(false);
    dispatch({ type: 'CANCEL_REOPENED_ONBOARDING' });
  }, [dispatch, setIsEditingOnboarding]);

  const completeTutorial = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'COMPLETE_TUTORIAL' });
  }, [dispatch]);

  const openTutorial = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'OPEN_TUTORIAL' });
  }, [dispatch]);

  const resetToNewUser = useCallback(async () => {
    triggerLightHaptic();
    const curr = stateRef.current;
    if (hasConfiguredUserData(curr)) {
      await runSnapshotCapture(curr, 'before_restore');
    }
    const freshToday = getTodayKey();
    setPendingMilestone(null);
    dispatch({ type: 'RESET_NEW_USER', todayKey: freshToday });
    setSelectedDateKeyState(freshToday);
    showToast('✨ Reset as a new user (₱0 saved)', false);
  }, [
    dispatch,
    stateRef,
    runSnapshotCapture,
    setPendingMilestone,
    setSelectedDateKeyState,
    showToast,
  ]);

  const resetDemoState = useCallback(async () => {
    triggerLightHaptic();
    const curr = stateRef.current;
    if (hasConfiguredUserData(curr)) {
      await runSnapshotCapture(curr, 'before_restore');
    }
    const freshToday = getTodayKey();
    setPendingMilestone(null);
    dispatch({ type: 'RESET_DEMO', todayKey: freshToday });
    setSelectedDateKeyState(freshToday);
    showToast('Loaded sample demo data', false);
  }, [
    dispatch,
    stateRef,
    runSnapshotCapture,
    setPendingMilestone,
    setSelectedDateKeyState,
    showToast,
  ]);

  const exportBackupJsonString = useCallback(() => {
    return serializeBackupJson(stateRef.current);
  }, [stateRef]);

  const markBackupExported = useCallback(() => {
    dispatch({
      type: 'MARK_BACKUP_EXPORTED',
      exportedAt: new Date().toISOString(),
    });
  }, [dispatch]);

  const importBackupJsonString = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      const parsedRes = parseBackupJson(raw);
      if (!parsedRes.ok) {
        return { ok: false, message: parsedRes.error };
      }

      const curr = stateRef.current;
      if (hasConfiguredUserData(curr)) {
        void runSnapshotCapture(curr, 'before_restore');
      }

      const d = parsedRes.data as Partial<PersistedBudgetState>;
      triggerCelebrationHaptic();
      setIsEditingOnboarding(false);
      setPendingMilestone(null);
      dispatch({ type: 'RESTORE_BACKUP', data: d });
      setSelectedDateKeyState(getTodayKey());
      showToast('✅ Backup restored successfully!', true);
      return { ok: true, message: 'Backup restored!' };
    },
    [
      dispatch,
      stateRef,
      runSnapshotCapture,
      setIsEditingOnboarding,
      setPendingMilestone,
      setSelectedDateKeyState,
      showToast,
    ]
  );

  const listAutoSnapshots = useCallback(async () => {
    const list = await listStoredAutoSnapshots();
    setAutoSnapshotCount(list.length);
    setLastAutoSnapshotAt(list.length > 0 ? list[0].savedAt : undefined);
    return list;
  }, [setAutoSnapshotCount, setLastAutoSnapshotAt]);

  const restoreAutoSnapshot = useCallback(
    async (snapshotId: string): Promise<{ ok: boolean; message: string }> => {
      const list = await listStoredAutoSnapshots();
      const found = list.find((s) => s.id === snapshotId);
      if (!found) {
        return { ok: false, message: 'Recovery snapshot not found.' };
      }
      const parsedRes = parseBackupJson(found.json);
      if (!parsedRes.ok) {
        return { ok: false, message: parsedRes.error };
      }

      const curr = stateRef.current;
      if (hasConfiguredUserData(curr)) {
        await runSnapshotCapture(curr, 'before_restore');
      }

      const d = parsedRes.data as Partial<PersistedBudgetState>;
      triggerCelebrationHaptic();
      setIsEditingOnboarding(false);
      setPendingMilestone(null);
      dispatch({ type: 'RESTORE_BACKUP', data: d });
      setSelectedDateKeyState(getTodayKey());
      showToast('✅ Recovery snapshot restored!', true);
      return { ok: true, message: 'Backup restored!' };
    },
    [
      dispatch,
      stateRef,
      runSnapshotCapture,
      setIsEditingOnboarding,
      setPendingMilestone,
      setSelectedDateKeyState,
      showToast,
    ]
  );

  const captureAutoSnapshotNow = useCallback(async (): Promise<boolean> => {
    const ok = await runSnapshotCapture(stateRef.current, 'manual');
    if (ok) {
      snapshotDirtyRef.current = false;
      showToast('Recovery snapshot saved!', true);
    }
    return ok;
  }, [stateRef, snapshotDirtyRef, runSnapshotCapture, showToast]);

  return useMemo(
    () => ({
      completeOnboarding,
      reopenOnboarding,
      cancelReopenedOnboarding,
      completeTutorial,
      openTutorial,
      resetToNewUser,
      resetDemoState,
      exportBackupJsonString,
      markBackupExported,
      importBackupJsonString,
      listAutoSnapshots,
      restoreAutoSnapshot,
      captureAutoSnapshotNow,
    }),
    [
      completeOnboarding,
      reopenOnboarding,
      cancelReopenedOnboarding,
      completeTutorial,
      openTutorial,
      resetToNewUser,
      resetDemoState,
      exportBackupJsonString,
      markBackupExported,
      importBackupJsonString,
      listAutoSnapshots,
      restoreAutoSnapshot,
      captureAutoSnapshotNow,
    ]
  );
}
