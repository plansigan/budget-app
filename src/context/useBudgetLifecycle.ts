import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  AUTO_SNAPSHOT_INTERVAL_MS,
  AutoBackupSnapshot,
  captureAutoSnapshotWithMeta,
  getLatestAutoSnapshotMeta,
  requestPersistentStorageIfSupported,
  shouldCaptureAutoSnapshot,
} from '../state/autoSnapshots';
import { getTodayKey } from '../state/budgetMath';
import { BudgetAction } from '../state/budgetReducer';
import { PersistedBudgetState } from '../state/defaults';
import {
  loadPersistedStateWithStatus,
  savePersistedState,
} from '../state/persistence';
import { applyMidnightRollover } from '../state/rollover';

const RECOVERY_CLEAR_ACTIONS = new Set<BudgetAction['type']>([
  'COMPLETE_ONBOARDING',
  'RESTORE_BACKUP',
  'RESET_NEW_USER',
  'RESET_DEMO',
]);

export function useBudgetLifecycle(params: {
  state: PersistedBudgetState;
  stateRef: React.MutableRefObject<PersistedBudgetState>;
  rawDispatch: React.Dispatch<BudgetAction>;
  selectedDateKeyRef: React.MutableRefObject<string>;
  setSelectedDateKeyState: React.Dispatch<React.SetStateAction<string>>;
  showToast: (text: string, isDopamine: boolean) => void;
}) {
  const {
    state,
    stateRef,
    rawDispatch,
    selectedDateKeyRef,
    setSelectedDateKeyState,
    showToast,
  } = params;

  const [todayKey, setTodayKey] = useState<string>(() => getTodayKey());
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;

  const [isHydrated, setIsHydrated] = useState(false);
  const [lastAutoSnapshotAt, setLastAutoSnapshotAt] = useState<
    string | undefined
  >(undefined);
  const [autoSnapshotCount, setAutoSnapshotCount] = useState(0);
  const [storagePersisted, setStoragePersisted] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);
  const lastSaveWarnRef = useRef(0);
  const snapshotDirtyRef = useRef(false);
  const lastAutoSnapshotMsRef = useRef(0);
  const bootCorruptedRef = useRef(false);
  const hasUserMutatedRef = useRef(false);

  const dispatch = useCallback<React.Dispatch<BudgetAction>>(
    (action) => {
      if (action.type !== 'HYDRATE') {
        hasUserMutatedRef.current = true;
      }
      if (RECOVERY_CLEAR_ACTIONS.has(action.type)) {
        bootCorruptedRef.current = false;
      }
      rawDispatch(action);
    },
    [rawDispatch]
  );

  const runSnapshotCapture = useCallback(
    async (
      snapshotState: PersistedBudgetState,
      reason: AutoBackupSnapshot['reason']
    ): Promise<boolean> => {
      const res = await captureAutoSnapshotWithMeta(snapshotState, reason);
      if (!res) return false;
      const parsedMs = Date.parse(res.snapshot.savedAt);
      if (!Number.isNaN(parsedMs)) {
        lastAutoSnapshotMsRef.current = parsedMs;
      }
      setLastAutoSnapshotAt(res.snapshot.savedAt);
      setAutoSnapshotCount(res.count);
      return true;
    },
    []
  );

  const persistWithWarning = useCallback(
    (snapshot: PersistedBudgetState) => {
      if (bootCorruptedRef.current) return;
      void savePersistedState(snapshot).then((ok) => {
        if (!ok && Date.now() - lastSaveWarnRef.current > 15_000) {
          lastSaveWarnRef.current = Date.now();
          showToast(
            'Could not save locally. Check device storage or exit Private Browsing.',
            false
          );
        }
      });
    },
    [showToast]
  );

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingSaveRef.current && !bootCorruptedRef.current) {
      pendingSaveRef.current = false;
      persistWithWarning(stateRef.current);
    }
  }, [persistWithWarning, stateRef]);

  useEffect(() => {
    let mounted = true;
    void requestPersistentStorageIfSupported().then((ok) => {
      if (mounted) setStoragePersisted(ok);
    });
    void getLatestAutoSnapshotMeta().then((meta) => {
      if (!mounted || !meta) return;
      const parsedMs = Date.parse(meta.savedAt);
      if (!Number.isNaN(parsedMs)) {
        lastAutoSnapshotMsRef.current = parsedMs;
      }
      setLastAutoSnapshotAt(meta.savedAt);
      setAutoSnapshotCount(meta.count);
    });
    loadPersistedStateWithStatus()
      .then((res) => {
        if (!mounted) return;
        const today = getTodayKey();
        setTodayKey(today);
        if (res.corrupted) {
          bootCorruptedRef.current = true;
          showToast(
            'Saved data looked corrupted. Restore a JSON backup or Auto-Snapshot in Budget → Settings.',
            false
          );
          return;
        }
        const loaded = res.state;
        if (loaded) {
          if (loaded.lastActiveDate && loaded.lastActiveDate < today) {
            const { nextState } = applyMidnightRollover(loaded, today, 0);
            hasUserMutatedRef.current = true;
            rawDispatch({ type: 'HYDRATE', state: nextState });
          } else {
            rawDispatch({ type: 'HYDRATE', state: loaded });
          }
        }
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, [rawDispatch, showToast]);

  // Debounced persistence (350ms) + automatic 10-minute rolling recovery snapshot
  useEffect(() => {
    if (!isHydrated || bootCorruptedRef.current || !hasUserMutatedRef.current) {
      return;
    }
    pendingSaveRef.current = true;
    snapshotDirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSaveRef.current = false;
      const curr = stateRef.current;
      persistWithWarning(curr);
      if (
        curr.hasCompletedOnboarding &&
        shouldCaptureAutoSnapshot(lastAutoSnapshotMsRef.current, Date.now())
      ) {
        snapshotDirtyRef.current = false;
        void runSnapshotCapture(curr, 'auto_interval');
      }
    }, 350);
  }, [state, isHydrated, stateRef, persistWithWarning, runSnapshotCapture]);

  // Rolling 10-minute snapshot check while the app remains open
  useEffect(() => {
    if (!isHydrated) return;
    const snapInterval = setInterval(() => {
      if (bootCorruptedRef.current) return;
      const curr = stateRef.current;
      if (
        snapshotDirtyRef.current &&
        curr.hasCompletedOnboarding &&
        shouldCaptureAutoSnapshot(lastAutoSnapshotMsRef.current, Date.now())
      ) {
        snapshotDirtyRef.current = false;
        void runSnapshotCapture(curr, 'auto_interval');
      }
    }, AUTO_SNAPSHOT_INTERVAL_MS);

    return () => {
      clearInterval(snapInterval);
    };
  }, [isHydrated, stateRef, runSnapshotCapture]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const checkRolloverIfDayChanged = useCallback(() => {
    if (!isHydrated || bootCorruptedRef.current) return;
    const freshToday = getTodayKey();
    if (freshToday !== todayKeyRef.current) {
      setTodayKey(freshToday);
    }
    const curr = stateRef.current;
    if (curr.lastActiveDate && curr.lastActiveDate < freshToday) {
      const prevActive = curr.lastActiveDate;
      dispatch({ type: 'APPLY_ROLLOVER', newDateKey: freshToday });
      if (selectedDateKeyRef.current === prevActive) {
        setSelectedDateKeyState(freshToday);
      }
    }
  }, [isHydrated, stateRef, dispatch, selectedDateKeyRef, setSelectedDateKeyState]);

  useEffect(() => {
    if (!isHydrated) return;
    const handleAppState = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkRolloverIfDayChanged();
      } else if (
        nextAppState === 'background' ||
        nextAppState === 'inactive'
      ) {
        flushPendingSave();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    const intervalId = setInterval(checkRolloverIfDayChanged, 60_000);

    const handleWebPageHide = () => {
      flushPendingSave();
    };
    const handleWebVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      } else if (document.visibilityState === 'visible') {
        checkRolloverIfDayChanged();
      }
    };

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('pagehide', handleWebPageHide);
    }
    if (
      Platform.OS === 'web' &&
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      document.addEventListener('visibilitychange', handleWebVisibilityChange);
    }

    return () => {
      sub.remove();
      clearInterval(intervalId);
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        typeof window.removeEventListener === 'function'
      ) {
        window.removeEventListener('pagehide', handleWebPageHide);
      }
      if (
        Platform.OS === 'web' &&
        typeof document !== 'undefined' &&
        typeof document.removeEventListener === 'function'
      ) {
        document.removeEventListener(
          'visibilitychange',
          handleWebVisibilityChange
        );
      }
    };
  }, [isHydrated, checkRolloverIfDayChanged, flushPendingSave]);

  return {
    dispatch,
    todayKey,
    isHydrated,
    lastAutoSnapshotAt,
    setLastAutoSnapshotAt,
    autoSnapshotCount,
    setAutoSnapshotCount,
    storagePersisted,
    snapshotDirtyRef,
    runSnapshotCapture,
  };
}
