import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform, useColorScheme } from 'react-native';
import {
  AUTO_SNAPSHOT_INTERVAL_MS,
  AutoBackupSnapshot,
  captureAutoSnapshot,
  getLatestAutoSnapshotMeta,
  listAutoSnapshots as listStoredAutoSnapshots,
  requestPersistentStorageIfSupported,
  shouldCaptureAutoSnapshot,
} from '../state/autoSnapshots';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromDayEntries,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  sumBills,
} from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import {
  OnboardingParams,
  PersistedBudgetState,
  createNewUserState,
} from '../state/defaults';
import {
  loadPersistedStateWithStatus,
  savePersistedState,
} from '../state/persistence';
import { applyMidnightRollover } from '../state/rollover';
import { ThemeShade, resolveThemeShade } from '../theme/palette';
import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CardTier,
  CreditCardAccount,
  DaySummary,
  DebtDirection,
  DebtItem,
  EnvelopeCadence,
  EnvelopeRolloverMode,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendCategoryKey,
  SpendingEnvelopeItem,
  ThemeMode,
  TransactionEntry,
  TreatVaultItem,
  getCardTier,
} from '../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
} from '../utils/haptics';
import { formatPesoDisplay } from '../utils/numberFormat';
import {
  MilestoneDefinition,
  detectNextUnlockedMilestone,
} from '../utils/savingsCoach';
import { useToast } from './ToastContext';
import { useDailyActions } from './actions/useDailyActions';
import { useGoalsActions } from './actions/useGoalsActions';
import { usePlanActions } from './actions/usePlanActions';
import { useRecoveryActions } from './actions/useRecoveryActions';
import { useWalletActions } from './actions/useWalletActions';

export { computeBaseDailyAllowance, getTodayKey, sumBills };
export type { OnboardingParams };

export interface ThemePrefsContextValue {
  shade: ThemeShade;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  formatVisiblePeso: (amount: number, decimals?: number) => string;
}

export interface BudgetActionsContextValue {
  setSelectedDateKey: (dateKey: string) => void;
  dismissMilestone: () => void;
  togglePrivacyMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  logSpend: (
    amount: number,
    label: string,
    icon: string,
    paymentSourceId?: string,
    category?: SpendCategoryKey
  ) => void;
  fundActiveTreat: (amount: number) => void;
  saveToJar: (amount: number) => void;
  bankTodaySurplus: () => void;
  simulateMidnightSplit: () => void;
  claimTreat: (treatId: string) => void;
  addTreat: (name: string, icon: string, target: number) => void;
  deleteTreat: (treatId: string) => void;
  setActiveTreat: (treatId: string) => void;
  undoEntry: (entryId: string) => void;
  editEntry: (
    entryId: string,
    updates: {
      amount: number;
      label: string;
      category?: SpendCategoryKey;
      icon?: string;
    }
  ) => void;
  transferBetweenAccounts: (
    fromSourceId: string,
    toSourceId: string,
    amount: number,
    note?: string
  ) => void;
  updateBudgetConfig: (income: number, bills: number, savings: number) => void;
  updateSalarySchedule: (
    frequency: 1 | 2,
    payday1: number,
    payday2: number
  ) => void;
  updateBillAmount: (billId: string, amount: number) => void;
  updateBillItem: (
    billId: string,
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  updateBillDueDay: (billId: string, dueDay?: number) => void;
  addBillItem: (
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  markBillPaid: (
    billId: string,
    paymentSourceId?: string,
    amountOverride?: number
  ) => void;
  removeBillItem: (billId: string) => void;
  logPaydayCheckIn: (
    amount: number,
    sourceId: string,
    savingsAllocation: number,
    note?: string,
    refillEnvelopeIds?: string[]
  ) => void;
  dismissPaydayPrompt: (dateKey?: string) => void;
  addEnvelope: (
    name: string,
    icon: string,
    amountPerCycle: number,
    cadence: EnvelopeCadence,
    rolloverMode: EnvelopeRolloverMode
  ) => void;
  updateEnvelope: (
    id: string,
    name: string,
    icon: string,
    amountPerCycle: number,
    cadence: EnvelopeCadence,
    rolloverMode: EnvelopeRolloverMode,
    balance?: number
  ) => void;
  deleteEnvelope: (id: string) => void;
  spendFromEnvelope: (
    envelopeId: string,
    amount: number,
    label: string,
    icon: string,
    paymentSourceId?: string,
    category?: SpendCategoryKey
  ) => void;
  refillEnvelope: (envelopeId: string) => void;
  depositToWalletAccount: (
    sourceId: string,
    amount: number,
    note?: string
  ) => void;
  setAccountBalanceWithLog: (
    sourceId: string,
    newBalance: number,
    note?: string
  ) => void;
  addBank: (name: string, balance: number) => void;
  updateBank: (bankId: string, name: string) => void;
  removeBank: (bankId: string) => void;
  addCreditCard: (
    name: string,
    limit: number,
    used: number,
    cutoffDay: number
  ) => void;
  updateCreditCard: (
    cardId: string,
    name: string,
    limit: number,
    cutoffDay: number
  ) => void;
  removeCreditCard: (cardId: string) => void;
  completeOnboarding: (params: OnboardingParams) => void;
  reopenOnboarding: () => void;
  cancelReopenedOnboarding: () => void;
  completeTutorial: () => void;
  openTutorial: () => void;
  resetToNewUser: () => void;
  resetDemoState: () => void;
  boostSavingsGoal: (delta: number) => void;
  addInstallment: (params: {
    name: string;
    provider: string;
    monthlyAmount: number;
    totalMonths: number;
    paidMonths: number;
    includeInBudget: boolean;
  }) => void;
  updateInstallment: (
    id: string,
    params: {
      name: string;
      provider: string;
      monthlyAmount: number;
      totalMonths: number;
      paidMonths: number;
      includeInBudget: boolean;
    }
  ) => void;
  markInstallmentMonthPaid: (id: string) => void;
  toggleInstallmentInBudget: (id: string) => void;
  removeInstallment: (id: string) => void;
  addSinkingFund: (
    name: string,
    icon: string,
    target: number,
    monthsToGoal: number
  ) => void;
  depositToSinkingFund: (id: string, amount: number) => void;
  deleteSinkingFund: (id: string) => void;
  addDebt: (params: {
    direction: DebtDirection;
    personName: string;
    amount: number;
    note?: string;
    paymentSourceId?: string;
    affectsDailyBudget?: boolean;
  }) => void;
  updateDebt: (
    id: string,
    params: {
      direction: DebtDirection;
      personName: string;
      amount: number;
      note?: string;
    }
  ) => void;
  deleteDebt: (id: string) => void;
  recordDebtPayment: (
    id: string,
    amount: number,
    paymentSourceId?: string,
    affectsDailyBudget?: boolean
  ) => void;
  exportBackupJsonString: () => string;
  importBackupJsonString: (raw: string) => { ok: boolean; message: string };
  markBackupExported: () => void;
  listAutoSnapshots: () => Promise<AutoBackupSnapshot[]>;
  restoreAutoSnapshot: (
    snapshotId: string
  ) => Promise<{ ok: boolean; message: string }>;
  captureAutoSnapshotNow: () => Promise<boolean>;
}

export interface DailyBudgetContextValue {
  settings: BudgetSettings;
  billItems: BillItem[];
  envelopes: SpendingEnvelopeItem[];
  entries: TransactionEntry[];
  baseDailyAllowance: number;
  rolloverBalance: number;
  todayKey: string;
  selectedDateKey: string;
  getDaySummary: (dateKey: string) => DaySummary;
  spentOnSelectedDay: number;
  safeToSpendOnSelectedDay: number;
  lastPaydayCheckInKey: string;
}

export interface WalletContextValue {
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  installments: InstallmentItem[];
  debts: DebtItem[];
  lastPaymentSourceId?: string;
}

export interface GoalsContextValue {
  treats: TreatVaultItem[];
  activeTreat: TreatVaultItem | null;
  sinkingFunds: SinkingFundItem[];
  monthlySaved: number;
  monthlyArchives: MonthlyArchiveSnapshot[];
  streakDays: number;
  bufferShields: number;
  disciplineScore: number;
  cardTier: CardTier;
  unlockedMilestones: string[];
  pendingMilestone: MilestoneDefinition | null;
}

export interface SystemStatusContextValue {
  isHydrated: boolean;
  hasCompletedOnboarding: boolean;
  isEditingOnboarding: boolean;
  hasSeenTutorial: boolean;
  lastBackupAt?: string;
  lastAutoSnapshotAt?: string;
  autoSnapshotCount: number;
  storagePersisted: boolean;
}

export interface BudgetContextValue
  extends ThemePrefsContextValue,
    BudgetActionsContextValue,
    DailyBudgetContextValue,
    WalletContextValue,
    GoalsContextValue,
    SystemStatusContextValue {}

const EMPTY_DAY_ENTRIES: TransactionEntry[] = [];

const ThemePrefsContext = createContext<ThemePrefsContextValue | null>(null);
const BudgetActionsContext = createContext<BudgetActionsContextValue | null>(
  null
);
const DailyBudgetContext = createContext<DailyBudgetContextValue | null>(null);
const WalletContext = createContext<WalletContextValue | null>(null);
const GoalsContext = createContext<GoalsContextValue | null>(null);
const SystemStatusContext = createContext<SystemStatusContextValue | null>(
  null
);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showToast } = useToast();
  const systemColorScheme = useColorScheme();

  const [state, dispatch] = useReducer(budgetReducer, undefined, () =>
    createNewUserState()
  );
  const stateRef = useRef<PersistedBudgetState>(state);
  stateRef.current = state;

  const [todayKey, setTodayKey] = useState<string>(() => getTodayKey());
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;

  const [selectedDateKey, setSelectedDateKeyState] = useState<string>(() =>
    getTodayKey()
  );
  const selectedDateKeyRef = useRef(selectedDateKey);
  selectedDateKeyRef.current = selectedDateKey;

  const [isHydrated, setIsHydrated] = useState(false);
  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);
  const [pendingMilestone, setPendingMilestone] =
    useState<MilestoneDefinition | null>(null);
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

  const runSnapshotCapture = useCallback(
    async (
      snapshotState: PersistedBudgetState,
      reason: AutoBackupSnapshot['reason']
    ): Promise<boolean> => {
      const captured = await captureAutoSnapshot(snapshotState, reason);
      if (!captured) return false;
      const parsedMs = Date.parse(captured.savedAt);
      if (!Number.isNaN(parsedMs)) {
        lastAutoSnapshotMsRef.current = parsedMs;
      }
      setLastAutoSnapshotAt(captured.savedAt);
      const list = await listStoredAutoSnapshots();
      setAutoSnapshotCount(list.length);
      return true;
    },
    []
  );

  const persistWithWarning = useCallback(
    (snapshot: PersistedBudgetState) => {
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
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      persistWithWarning(stateRef.current);
    }
  }, [persistWithWarning]);

  const setSelectedDateKey = useCallback((dateKey: string) => {
    triggerLightHaptic();
    setSelectedDateKeyState(dateKey);
  }, []);

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
          showToast(
            'Saved data looked corrupted. Restore a JSON backup or Auto-Snapshot in Budget → Settings.',
            false
          );
        }
        const loaded = res.state;
        if (loaded) {
          if (loaded.lastActiveDate && loaded.lastActiveDate < today) {
            const { nextState } = applyMidnightRollover(loaded, today, 0);
            dispatch({ type: 'HYDRATE', state: nextState });
          } else {
            dispatch({ type: 'HYDRATE', state: loaded });
          }
        }
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  // Debounced persistence (350ms) + automatic 10-minute rolling recovery snapshot
  useEffect(() => {
    if (!isHydrated) return;
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
  }, [state, isHydrated, persistWithWarning, runSnapshotCapture]);

  // Rolling 10-minute snapshot check while the app remains open
  useEffect(() => {
    if (!isHydrated) return;
    const snapInterval = setInterval(() => {
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
  }, [isHydrated, runSnapshotCapture]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const checkRolloverIfDayChanged = useCallback(() => {
    if (!isHydrated) return;
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
  }, [isHydrated]);

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

  const envelopes = useMemo(() => state.envelopes || [], [state.envelopes]);
  const debts = useMemo(() => state.debts || [], [state.debts]);

  const budgetedInstallmentsTotal = useMemo(
    () => getBudgetedInstallmentsTotal(state.installments),
    [state.installments]
  );

  const monthlyEnvelopesTotal = useMemo(
    () =>
      getTotalMonthlyEnvelopes(envelopes, state.settings.salaryFrequency),
    [envelopes, state.settings.salaryFrequency]
  );

  const baseDailyAllowance = useMemo(
    () =>
      computeBaseDailyAllowance(
        state.settings,
        budgetedInstallmentsTotal + monthlyEnvelopesTotal
      ),
    [state.settings, budgetedInstallmentsTotal, monthlyEnvelopesTotal]
  );

  const entriesByDateKey = useMemo(() => {
    const map = new Map<string, TransactionEntry[]>();
    for (const entry of state.entries) {
      const key = entry.dateKey || state.lastActiveDate;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }
    return map;
  }, [state.entries, state.lastActiveDate]);

  const getDaySummary = useCallback(
    (dateKey: string): DaySummary => {
      const dayEntries = entriesByDateKey.get(dateKey) ?? EMPTY_DAY_ENTRIES;
      return computeDayMetricsFromDayEntries(
        dayEntries,
        dateKey,
        baseDailyAllowance,
        state.rolloverBalance,
        todayKey
      );
    },
    [entriesByDateKey, state.rolloverBalance, baseDailyAllowance, todayKey]
  );

  const selectedDaySummary = useMemo(
    () => getDaySummary(selectedDateKey),
    [getDaySummary, selectedDateKey]
  );

  useEffect(() => {
    if (
      !isHydrated ||
      !state.hasCompletedOnboarding ||
      !state.hasSeenTutorial ||
      pendingMilestone
    ) {
      return;
    }

    const todaySummary = computeDayMetricsFromEntries(
      state.entries,
      todayKey,
      baseDailyAllowance,
      state.rolloverBalance,
      todayKey,
      state.lastActiveDate
    );
    const nextMilestone = detectNextUnlockedMilestone(
      {
        settings: state.settings,
        monthlySaved: state.monthlySaved,
        baseDailyAllowance,
        safeToSpendToday: todaySummary.safeRemaining,
        cashOnHand: state.cashOnHand,
        banks: state.banks,
        creditCards: state.creditCards,
        treats: state.treats,
        entries: state.entries,
        streakDays: state.streakDays,
      },
      state.unlockedMilestones
    );

    if (nextMilestone) {
      triggerCelebrationHaptic();
      dispatch({ type: 'UNLOCK_MILESTONE', milestoneId: nextMilestone.id });
      setPendingMilestone(nextMilestone);
    }
  }, [
    isHydrated,
    state.hasCompletedOnboarding,
    state.hasSeenTutorial,
    state.monthlySaved,
    state.streakDays,
    state.entries,
    state.treats,
    state.unlockedMilestones,
    state.settings,
    state.cashOnHand,
    state.banks,
    state.creditCards,
    state.rolloverBalance,
    state.lastActiveDate,
    baseDailyAllowance,
    todayKey,
    pendingMilestone,
  ]);

  const dismissMilestone = useCallback(() => {
    triggerLightHaptic();
    setPendingMilestone(null);
  }, []);

  const togglePrivacyMode = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'TOGGLE_PRIVACY_MODE' });
  }, []);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      triggerLightHaptic();
      dispatch({ type: 'SET_THEME_MODE', mode });
      const label =
        mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
      showToast(`Theme set to ${label}`, false);
    },
    [showToast]
  );

  const formatVisiblePeso = useCallback(
    (amount: number, decimals: number = 2): string =>
      formatPesoDisplay(amount, state.privacyMode, decimals),
    [state.privacyMode]
  );

  const actionDeps = useMemo(
    () => ({ dispatch, stateRef, selectedDateKeyRef, showToast }),
    [showToast]
  );
  const dailyActions = useDailyActions(actionDeps);
  const walletActions = useWalletActions(actionDeps);
  const planActions = usePlanActions(actionDeps);
  const goalsActions = useGoalsActions(actionDeps);
  const recoveryActions = useRecoveryActions({
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
  });

  const activeTreat = useMemo(() => {
    if (state.treats.length === 0) return null;
    return (
      state.treats.find((t) => t.id === state.activeTreatId) ||
      state.treats.find((t) => !t.claimed) ||
      state.treats[0]
    );
  }, [state.treats, state.activeTreatId]);

  const cardTier = getCardTier(state.disciplineScore);
  const shade = useMemo(
    () => resolveThemeShade(state.themeMode, systemColorScheme),
    [state.themeMode, systemColorScheme]
  );

  const systemStatusValue = useMemo<SystemStatusContextValue>(
    () => ({
      isHydrated,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      isEditingOnboarding,
      hasSeenTutorial: state.hasSeenTutorial,
      lastBackupAt: state.lastBackupAt,
      lastAutoSnapshotAt,
      autoSnapshotCount,
      storagePersisted,
    }),
    [
      isHydrated,
      state.hasCompletedOnboarding,
      isEditingOnboarding,
      state.hasSeenTutorial,
      state.lastBackupAt,
      lastAutoSnapshotAt,
      autoSnapshotCount,
      storagePersisted,
    ]
  );

  const themePrefsValue = useMemo<ThemePrefsContextValue>(
    () => ({
      shade,
      themeMode: state.themeMode,
      setThemeMode,
      privacyMode: state.privacyMode,
      togglePrivacyMode,
      formatVisiblePeso,
    }),
    [
      shade,
      state.themeMode,
      setThemeMode,
      state.privacyMode,
      togglePrivacyMode,
      formatVisiblePeso,
    ]
  );

  const actionsValue = useMemo<BudgetActionsContextValue>(
    () => ({
      setSelectedDateKey,
      dismissMilestone,
      togglePrivacyMode,
      setThemeMode,
      ...dailyActions,
      ...walletActions,
      ...planActions,
      ...goalsActions,
      ...recoveryActions,
    }),
    [
      setSelectedDateKey,
      dismissMilestone,
      togglePrivacyMode,
      setThemeMode,
      dailyActions,
      walletActions,
      planActions,
      goalsActions,
      recoveryActions,
    ]
  );

  const dailyBudgetValue = useMemo<DailyBudgetContextValue>(
    () => ({
      settings: state.settings,
      billItems: state.billItems,
      envelopes,
      entries: state.entries,
      baseDailyAllowance,
      rolloverBalance: state.rolloverBalance,
      todayKey,
      selectedDateKey,
      getDaySummary,
      spentOnSelectedDay: selectedDaySummary.spent,
      safeToSpendOnSelectedDay: selectedDaySummary.safeRemaining,
      lastPaydayCheckInKey: state.lastPaydayCheckInKey,
    }),
    [
      state.settings,
      state.billItems,
      envelopes,
      state.entries,
      baseDailyAllowance,
      state.rolloverBalance,
      todayKey,
      selectedDateKey,
      getDaySummary,
      selectedDaySummary.spent,
      selectedDaySummary.safeRemaining,
      state.lastPaydayCheckInKey,
    ]
  );

  const walletValue = useMemo<WalletContextValue>(
    () => ({
      cashOnHand: state.cashOnHand,
      banks: state.banks,
      creditCards: state.creditCards,
      installments: state.installments,
      debts,
      lastPaymentSourceId: state.lastPaymentSourceId,
    }),
    [
      state.cashOnHand,
      state.banks,
      state.creditCards,
      state.installments,
      debts,
      state.lastPaymentSourceId,
    ]
  );

  const goalsValue = useMemo<GoalsContextValue>(
    () => ({
      treats: state.treats,
      activeTreat,
      sinkingFunds: state.sinkingFunds,
      monthlySaved: state.monthlySaved,
      monthlyArchives: state.monthlyArchives,
      streakDays: state.streakDays,
      bufferShields: state.bufferShields,
      disciplineScore: state.disciplineScore,
      cardTier,
      unlockedMilestones: state.unlockedMilestones,
      pendingMilestone,
    }),
    [
      state.treats,
      activeTreat,
      state.sinkingFunds,
      state.monthlySaved,
      state.monthlyArchives,
      state.streakDays,
      state.bufferShields,
      state.disciplineScore,
      cardTier,
      state.unlockedMilestones,
      pendingMilestone,
    ]
  );

  return (
    <SystemStatusContext.Provider value={systemStatusValue}>
      <ThemePrefsContext.Provider value={themePrefsValue}>
        <BudgetActionsContext.Provider value={actionsValue}>
          <DailyBudgetContext.Provider value={dailyBudgetValue}>
            <WalletContext.Provider value={walletValue}>
              <GoalsContext.Provider value={goalsValue}>
                {children}
              </GoalsContext.Provider>
            </WalletContext.Provider>
          </DailyBudgetContext.Provider>
        </BudgetActionsContext.Provider>
      </ThemePrefsContext.Provider>
    </SystemStatusContext.Provider>
  );
};

export function useThemePrefs(): ThemePrefsContextValue {
  const ctx = useContext(ThemePrefsContext);
  if (!ctx) {
    throw new Error('useThemePrefs must be used within a BudgetProvider');
  }
  return ctx;
}

export function useBudgetActions(): BudgetActionsContextValue {
  const ctx = useContext(BudgetActionsContext);
  if (!ctx) {
    throw new Error('useBudgetActions must be used within a BudgetProvider');
  }
  return ctx;
}

export function useDailyBudget(): DailyBudgetContextValue {
  const ctx = useContext(DailyBudgetContext);
  if (!ctx) {
    throw new Error('useDailyBudget must be used within a BudgetProvider');
  }
  return ctx;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a BudgetProvider');
  }
  return ctx;
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) {
    throw new Error('useGoals must be used within a BudgetProvider');
  }
  return ctx;
}

export function useSystemStatus(): SystemStatusContextValue {
  const ctx = useContext(SystemStatusContext);
  if (!ctx) {
    throw new Error('useSystemStatus must be used within a BudgetProvider');
  }
  return ctx;
}

export function useBudget(): BudgetContextValue {
  const themePrefs = useThemePrefs();
  const actions = useBudgetActions();
  const dailyBudget = useDailyBudget();
  const wallet = useWallet();
  const goals = useGoals();
  const systemStatus = useSystemStatus();

  return useMemo(
    () => ({
      ...systemStatus,
      ...themePrefs,
      ...actions,
      ...dailyBudget,
      ...wallet,
      ...goals,
    }),
    [systemStatus, themePrefs, actions, dailyBudget, wallet, goals]
  );
}
