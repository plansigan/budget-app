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
import { useColorScheme } from 'react-native';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromDayEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  parseDateKeyLocal,
  sumBills,
} from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import {
  OnboardingParams,
  PersistedBudgetState,
  createNewUserState,
} from '../state/defaults';
import { findActiveUnclaimedTreat } from '../state/reducers/helpers';
import { ThemeShade, resolveThemeShade } from '../theme/palette';
import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CardTier,
  CreditCardAccount,
  DaySummary,
  DebtItem,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendingEnvelopeItem,
  ThemeMode,
  TransactionEntry,
  TreatVaultItem,
  WantToBuyItem,
  getCardTier,
} from '../types/budget';
import { triggerCelebrationHaptic, triggerLightHaptic } from '../utils/haptics';
import { formatPesoDisplay } from '../utils/numberFormat';
import {
  ALL_MILESTONES,
  MilestoneDefinition,
  detectNextUnlockedMilestone,
} from '../utils/savingsCoach';
import { formatEntryDateLocal } from '../utils/transactionDisplay';
import { useToastActions } from './ToastContext';
import { useDailyActions } from './actions/useDailyActions';
import { useGoalsActions } from './actions/useGoalsActions';
import { useInstallmentsAndDebtsActions } from './actions/useInstallmentsAndDebtsActions';
import { usePlanActions } from './actions/usePlanActions';
import { useRecoveryActions } from './actions/useRecoveryActions';
import { useWalletAccountActions } from './actions/useWalletAccountActions';
import { useBudgetLifecycle } from './useBudgetLifecycle';

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

export type BudgetActionsContextValue = {
  setSelectedDateKey: (dateKey: string) => void;
  dismissMilestone: () => void;
  togglePrivacyMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
} & ReturnType<typeof useDailyActions> &
  ReturnType<typeof useWalletAccountActions> &
  ReturnType<typeof useInstallmentsAndDebtsActions> &
  ReturnType<typeof usePlanActions> &
  ReturnType<typeof useGoalsActions> &
  ReturnType<typeof useRecoveryActions>;

export interface DailyBudgetContextValue {
  settings: BudgetSettings;
  billItems: BillItem[];
  envelopes: SpendingEnvelopeItem[];
  entries: TransactionEntry[];
  baseDailyAllowance: number;
  rolloverBalance: number;
  todayKey: string;
  selectedDateKey: string;
  getDayEntries: (dateKey: string) => TransactionEntry[];
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
  wantToBuyItems: WantToBuyItem[];
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
  const { showToast } = useToastActions();
  const systemColorScheme = useColorScheme();

  const [state, rawDispatch] = useReducer(budgetReducer, undefined, () =>
    createNewUserState()
  );
  const stateRef = useRef<PersistedBudgetState>(state);
  stateRef.current = state;

  const [selectedDateKey, setSelectedDateKeyState] = useState<string>(() =>
    getTodayKey()
  );
  const selectedDateKeyRef = useRef(selectedDateKey);
  selectedDateKeyRef.current = selectedDateKey;

  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);
  const [pendingMilestone, setPendingMilestone] =
    useState<MilestoneDefinition | null>(null);

  const lifecycle = useBudgetLifecycle({
    state,
    stateRef,
    rawDispatch,
    selectedDateKeyRef,
    setSelectedDateKeyState,
    showToast,
  });

  const {
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
  } = lifecycle;

  const setSelectedDateKey = useCallback((dateKey: string) => {
    triggerLightHaptic();
    setSelectedDateKeyState(dateKey);
  }, []);

  const envelopes = useMemo(() => state.envelopes || [], [state.envelopes]);
  const debts = useMemo(() => state.debts || [], [state.debts]);

  const budgetedInstallmentsTotal = useMemo(
    () => getBudgetedInstallmentsTotal(state.installments),
    [state.installments]
  );

  const monthlyEnvelopesTotal = useMemo(
    () => getTotalMonthlyEnvelopes(envelopes, state.settings.salaryFrequency),
    [envelopes, state.settings.salaryFrequency]
  );

  const extraMonthlyFixed = budgetedInstallmentsTotal + monthlyEnvelopesTotal;

  const baseDailyAllowance = useMemo(
    () =>
      computeBaseDailyAllowance(
        state.settings,
        extraMonthlyFixed,
        parseDateKeyLocal(todayKey)
      ),
    [state.settings, extraMonthlyFixed, todayKey]
  );

  const entriesByDateKey = useMemo(() => {
    const map = new Map<string, TransactionEntry[]>();
    for (const entry of state.entries) {
      const key = formatEntryDateLocal(entry, state.lastActiveDate);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }
    return map;
  }, [state.entries, state.lastActiveDate]);

  const getDayEntries = useCallback(
    (dateKey: string): TransactionEntry[] =>
      entriesByDateKey.get(dateKey) ?? EMPTY_DAY_ENTRIES,
    [entriesByDateKey]
  );

  const todayMonthKey = todayKey.slice(0, 7);

  const getDaySummary = useCallback(
    (dateKey: string): DaySummary => {
      const dayEntries = entriesByDateKey.get(dateKey) ?? EMPTY_DAY_ENTRIES;
      const monthBase =
        dateKey.slice(0, 7) === todayMonthKey
          ? baseDailyAllowance
          : computeBaseDailyAllowance(
              state.settings,
              extraMonthlyFixed,
              parseDateKeyLocal(dateKey)
            );
      return computeDayMetricsFromDayEntries(
        dayEntries,
        dateKey,
        monthBase,
        state.rolloverBalance,
        todayKey
      );
    },
    [
      entriesByDateKey,
      todayMonthKey,
      baseDailyAllowance,
      state.settings,
      extraMonthlyFixed,
      state.rolloverBalance,
      todayKey,
    ]
  );

  const getDaySummaryRef = useRef(getDaySummary);
  getDaySummaryRef.current = getDaySummary;

  const selectedDaySummary = useMemo(
    () => getDaySummary(selectedDateKey),
    [getDaySummary, selectedDateKey]
  );

  useEffect(() => {
    if (
      !isHydrated ||
      !state.hasCompletedOnboarding ||
      !state.hasSeenTutorial ||
      pendingMilestone ||
      state.unlockedMilestones.length >= ALL_MILESTONES.length
    ) {
      return;
    }

    const nextMilestone = detectNextUnlockedMilestone(
      {
        settings: state.settings,
        monthlySaved: state.monthlySaved,
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
    pendingMilestone,
    dispatch,
  ]);

  const dismissMilestone = useCallback(() => {
    triggerLightHaptic();
    setPendingMilestone(null);
  }, []);

  const togglePrivacyMode = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'TOGGLE_PRIVACY_MODE' });
  }, [dispatch]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      triggerLightHaptic();
      dispatch({ type: 'SET_THEME_MODE', mode });
      const label =
        mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
      showToast(`Theme set to ${label}`, false);
    },
    [dispatch, showToast]
  );

  const formatVisiblePeso = useCallback(
    (amount: number, decimals: number = 2): string =>
      formatPesoDisplay(amount, state.privacyMode, decimals),
    [state.privacyMode]
  );

  const actionDeps = useMemo(
    () => ({
      dispatch,
      stateRef,
      selectedDateKeyRef,
      getDaySummaryRef,
      showToast,
    }),
    [dispatch, showToast]
  );
  const dailyActions = useDailyActions(actionDeps);
  const walletAccountActions = useWalletAccountActions(actionDeps);
  const installmentDebtActions = useInstallmentsAndDebtsActions(actionDeps);
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
      findActiveUnclaimedTreat(state.treats, state.activeTreatId) ||
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
      ...walletAccountActions,
      ...installmentDebtActions,
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
      walletAccountActions,
      installmentDebtActions,
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
      getDayEntries,
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
      getDayEntries,
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

  const wantToBuyItems = useMemo(
    () => state.wantToBuyItems || [],
    [state.wantToBuyItems]
  );

  const goalsValue = useMemo<GoalsContextValue>(
    () => ({
      treats: state.treats,
      activeTreat,
      sinkingFunds: state.sinkingFunds,
      wantToBuyItems,
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
      wantToBuyItems,
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
