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
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  roundCurrency,
  sumBills,
} from '../state/budgetMath';
import { budgetReducer, canUndoEntry } from '../state/budgetReducer';
import {
  OnboardingParams,
  PersistedBudgetState,
  createNewUserState,
} from '../state/defaults';
import {
  loadPersistedState,
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
import { parseBackupJson, serializeBackupJson } from '../utils/backupExport';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';
import {
  MilestoneDefinition,
  detectNextUnlockedMilestone,
} from '../utils/savingsCoach';
import { useToast } from './ToastContext';

export { computeBaseDailyAllowance, getTodayKey, sumBills };
export type { OnboardingParams };

interface BudgetContextValue {
  isHydrated: boolean;
  hasCompletedOnboarding: boolean;
  isEditingOnboarding: boolean;
  hasSeenTutorial: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  formatVisiblePeso: (amount: number, decimals?: number) => string;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  lastPaydayCheckInKey: string;
  shade: ThemeShade;
  settings: BudgetSettings;
  billItems: BillItem[];
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  installments: InstallmentItem[];
  envelopes: SpendingEnvelopeItem[];
  sinkingFunds: SinkingFundItem[];
  monthlySaved: number;
  baseDailyAllowance: number;
  rolloverBalance: number;
  todayKey: string;
  selectedDateKey: string;
  setSelectedDateKey: (dateKey: string) => void;
  getDaySummary: (dateKey: string) => DaySummary;
  spentOnSelectedDay: number;
  safeToSpendOnSelectedDay: number;
  streakDays: number;
  bufferShields: number;
  disciplineScore: number;
  cardTier: CardTier;
  treats: TreatVaultItem[];
  activeTreat: TreatVaultItem | null;
  entries: TransactionEntry[];
  monthlyArchives: MonthlyArchiveSnapshot[];
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
  updateBudgetConfig: (income: number, bills: number, savings: number) => void;
  updateSalarySchedule: (
    frequency: 1 | 2,
    payday1: number,
    payday2: number
  ) => void;
  updateBillAmount: (billId: string, amount: number) => void;
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
  removeBank: (bankId: string) => void;
  addCreditCard: (
    name: string,
    limit: number,
    used: number,
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
  unlockedMilestones: string[];
  pendingMilestone: MilestoneDefinition | null;
  dismissMilestone: () => void;
  boostSavingsGoal: (delta: number) => void;
  addInstallment: (params: {
    name: string;
    provider: string;
    monthlyAmount: number;
    totalMonths: number;
    paidMonths: number;
    includeInBudget: boolean;
  }) => void;
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
  exportBackupJsonString: () => string;
  importBackupJsonString: (raw: string) => { ok: boolean; message: string };
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      void savePersistedState(stateRef.current);
    }
  }, []);

  const setSelectedDateKey = useCallback((dateKey: string) => {
    triggerLightHaptic();
    setSelectedDateKeyState(dateKey);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadPersistedState()
      .then((loaded) => {
        if (!mounted) return;
        const today = getTodayKey();
        setTodayKey(today);
        if (loaded) {
          if (loaded.lastActiveDate && loaded.lastActiveDate !== today) {
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
  }, []);

  // Debounced persistence (350ms) with flush on background/unmount
  useEffect(() => {
    if (!isHydrated) return;
    pendingSaveRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSaveRef.current = false;
      void savePersistedState(stateRef.current);
    }, 350);
  }, [state, isHydrated]);

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
    if (curr.lastActiveDate && curr.lastActiveDate !== freshToday) {
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
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('pagehide', handleWebPageHide);
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
    };
  }, [isHydrated, checkRolloverIfDayChanged, flushPendingSave]);

  const budgetedInstallmentsTotal = useMemo(
    () => getBudgetedInstallmentsTotal(state.installments),
    [state.installments]
  );

  const monthlyEnvelopesTotal = useMemo(
    () =>
      getTotalMonthlyEnvelopes(
        state.envelopes || [],
        state.settings.salaryFrequency
      ),
    [state.envelopes, state.settings.salaryFrequency]
  );

  const baseDailyAllowance = useMemo(
    () =>
      computeBaseDailyAllowance(
        state.settings,
        budgetedInstallmentsTotal + monthlyEnvelopesTotal
      ),
    [state.settings, budgetedInstallmentsTotal, monthlyEnvelopesTotal]
  );

  const getDaySummary = useCallback(
    (dateKey: string): DaySummary =>
      computeDayMetricsFromEntries(
        state.entries,
        dateKey,
        baseDailyAllowance,
        state.rolloverBalance,
        todayKey,
        state.lastActiveDate
      ),
    [
      state.entries,
      state.rolloverBalance,
      state.lastActiveDate,
      baseDailyAllowance,
      todayKey,
    ]
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

    const todaySummary = getDaySummary(todayKey);
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
    baseDailyAllowance,
    todayKey,
    getDaySummary,
    pendingMilestone,
  ]);

  const dismissMilestone = useCallback(() => {
    triggerLightHaptic();
    setPendingMilestone(null);
  }, []);

  const boostSavingsGoal = useCallback(
    (delta: number) => {
      const cleanDelta = Math.max(0, Math.round(delta));
      if (cleanDelta <= 0) return;
      triggerSuccessHaptic();
      dispatch({ type: 'BOOST_SAVINGS_GOAL', delta: cleanDelta });
      showToast(
        `Monthly savings goal raised by +₱${cleanDelta.toLocaleString()}!`,
        true
      );
    },
    [showToast]
  );

  const logSpend = useCallback(
    (
      amount: number,
      label: string,
      icon: string,
      paymentSourceId: string = 'cash',
      category?: SpendCategoryKey
    ) => {
      const cleanAmount = roundCurrency(Math.max(1, amount));
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
        `Logged ${cleanLabel}: -₱${cleanAmount.toLocaleString()} (${sourceLabel})`,
        false
      );
    },
    [showToast]
  );

  const fundActiveTreat = useCallback(
    (amount: number) => {
      const cleanAmount = roundCurrency(Math.max(1, amount));
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
          `Added ₱${actualAmount.toLocaleString()} to ${activeUnclaimed.name} (exceeded daily safe-to-spend).`,
          false
        );
      } else if (actualAmount < cleanAmount) {
        showToast(
          `Funded ₱${actualAmount.toLocaleString()} to finish ${activeUnclaimed.name}!`,
          true
        );
      } else {
        showToast(
          `Added ₱${actualAmount.toLocaleString()} to ${activeUnclaimed.name}!`,
          true
        );
      }
    },
    [showToast]
  );

  const saveToJar = useCallback(
    (amount: number) => {
      const cleanAmount = roundCurrency(Math.max(1, amount));
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
        `Saved ₱${take.toLocaleString()} into your Savings Jar!`,
        true
      );
    },
    [showToast]
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
        `Day ended! +₱${toSavings.toLocaleString()} Savings & +₱${toTreat.toLocaleString()} Treat`,
        true
      );
    } else {
      showToast(
        `Day ended! +₱${toSavings.toLocaleString()} added to Savings Jar`,
        true
      );
    }
  }, [showToast]);

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
      `🌙 50/50 Split: +₱${result.vaultAdded.toLocaleString()} & +₱${result.rolloverNext.toLocaleString()} rollover!`,
      true
    );
  }, [showToast]);

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
    [showToast]
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
        `Locked "${trimmed}" (₱${cleanTarget.toLocaleString()}) as active treat`,
        true
      );
    },
    [showToast]
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
          `🗑️ Treat deleted. +₱${refundToSavings.toLocaleString()} moved to Savings Jar!`,
          true
        );
      } else {
        showToast('🗑️ Treat removed from wishlist.', false);
      }
    },
    [showToast]
  );

  const setActiveTreat = useCallback((treatId: string) => {
    triggerLightHaptic();
    dispatch({ type: 'SET_ACTIVE_TREAT', treatId });
  }, []);

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
    [showToast]
  );

  const updateBudgetConfig = useCallback(
    (income: number, bills: number, savings: number) => {
      triggerLightHaptic();
      dispatch({ type: 'UPDATE_BUDGET_CONFIG', income, bills, savings });
    },
    []
  );

  const updateSalarySchedule = useCallback(
    (frequency: 1 | 2, payday1: number, payday2: number) => {
      triggerLightHaptic();
      dispatch({ type: 'UPDATE_SALARY_SCHEDULE', frequency, payday1, payday2 });
    },
    []
  );

  const updateBillAmount = useCallback((billId: string, amount: number) => {
    dispatch({ type: 'UPDATE_BILL_AMOUNT', billId, amount });
  }, []);

  const addBillItem = useCallback(
    (name: string, icon: string, amount: number, dueDay?: number) => {
      const trimmed = name.trim();
      const cleanAmount = Math.max(0, Math.round(amount));
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
        `Added bill: ${trimmed} (₱${cleanAmount.toLocaleString()})`,
        false
      );
    },
    [showToast]
  );

  const updateBillDueDay = useCallback((billId: string, dueDay?: number) => {
    triggerLightHaptic();
    dispatch({ type: 'UPDATE_BILL_DUE_DAY', billId, dueDay });
  }, []);

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
      showToast(
        `Paid ${bill.name} (₱${paidAmt.toLocaleString()})`,
        true
      );
    },
    [showToast]
  );

  const removeBillItem = useCallback((billId: string) => {
    triggerLightHaptic();
    dispatch({ type: 'REMOVE_BILL_ITEM', billId });
  }, []);

  const depositToWalletAccount = useCallback(
    (sourceId: string, amount: number, note?: string) => {
      const cleanAmount = roundCurrency(Math.max(1, amount));
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
          ? `Paid ₱${cleanAmount.toLocaleString()} toward ${sourceLabel}`
          : `Added ₱${cleanAmount.toLocaleString()} to ${sourceLabel}`,
        true
      );
    },
    [showToast]
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
    [showToast]
  );

  const addBank = useCallback(
    (name: string, balance: number) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      triggerSuccessHaptic();
      dispatch({ type: 'ADD_BANK', name: trimmed, balance });
      showToast(`Added bank: ${trimmed}`, false);
    },
    [showToast]
  );

  const removeBank = useCallback((bankId: string) => {
    triggerLightHaptic();
    dispatch({ type: 'REMOVE_BANK', bankId });
  }, []);

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
    [showToast]
  );

  const removeCreditCard = useCallback((cardId: string) => {
    triggerLightHaptic();
    dispatch({ type: 'REMOVE_CREDIT_CARD', cardId });
  }, []);

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
    [showToast]
  );

  const reopenOnboarding = useCallback(() => {
    triggerLightHaptic();
    setIsEditingOnboarding(true);
    dispatch({ type: 'REOPEN_ONBOARDING' });
  }, []);

  const cancelReopenedOnboarding = useCallback(() => {
    triggerLightHaptic();
    setIsEditingOnboarding(false);
    dispatch({ type: 'CANCEL_REOPENED_ONBOARDING' });
  }, []);

  const completeTutorial = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'COMPLETE_TUTORIAL' });
  }, []);

  const openTutorial = useCallback(() => {
    triggerLightHaptic();
    dispatch({ type: 'OPEN_TUTORIAL' });
  }, []);

  const resetToNewUser = useCallback(() => {
    triggerLightHaptic();
    const freshToday = getTodayKey();
    setPendingMilestone(null);
    dispatch({ type: 'RESET_NEW_USER', todayKey: freshToday });
    setSelectedDateKeyState(freshToday);
    showToast('✨ Reset as a new user (₱0 saved)', false);
  }, [showToast]);

  const resetDemoState = useCallback(() => {
    triggerLightHaptic();
    const freshToday = getTodayKey();
    setPendingMilestone(null);
    dispatch({ type: 'RESET_DEMO', todayKey: freshToday });
    setSelectedDateKeyState(freshToday);
    showToast('Loaded sample demo data', false);
  }, [showToast]);

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

  const logPaydayCheckIn = useCallback(
    (
      amount: number,
      sourceId: string,
      savingsAllocation: number,
      note?: string,
      refillEnvelopeIds?: string[]
    ) => {
      const cleanAmount = roundCurrency(Math.max(1, amount));
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
          `Payday logged to ${sourceLabel} & refilled ${refilledCount} envelope${refilledCount > 1 ? 's' : ''}!`,
          true
        );
      } else {
        showToast(
          cleanSavings > 0
            ? `Payday logged to ${sourceLabel} & +₱${cleanSavings.toLocaleString()} saved!`
            : `Logged ₱${cleanAmount.toLocaleString()} paycheck to ${sourceLabel}!`,
          true
        );
      }
    },
    [showToast]
  );

  const dismissPaydayPrompt = useCallback((dateKey?: string) => {
    triggerLightHaptic();
    dispatch({
      type: 'DISMISS_PAYDAY_PROMPT',
      dateKey: dateKey || getTodayKey(),
    });
  }, []);

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
        `Added ${trimmed} envelope (₱${cleanAmt.toLocaleString()})`,
        true
      );
    },
    [showToast]
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
    [showToast]
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
    [showToast]
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

      const cleanAmount = roundCurrency(Math.max(1, amount));
      const targetDateKey = selectedDateKeyRef.current;

      let sourceLabel = '';
      if (paymentSourceId === 'cash') {
        sourceLabel = ' • Cash';
      } else if (paymentSourceId && paymentSourceId !== 'none') {
        const matchedBank = current.banks.find((b) => b.id === paymentSourceId);
        const matchedCard = current.creditCards.find(
          (c) => c.id === paymentSourceId
        );
        if (matchedBank) sourceLabel = ` • ${matchedBank.name}`;
        else if (matchedCard) sourceLabel = ` • ${matchedCard.name}`;
      }

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
        `${env.name}: -₱${cleanAmount.toLocaleString()}${sourceLabel}`,
        false
      );
    },
    [showToast]
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
          ? `Added +₱${env.amountPerCycle.toLocaleString()} to ${env.name}`
          : `Reset ${env.name} to ₱${env.amountPerCycle.toLocaleString()}`,
        true
      );
    },
    [showToast]
  );

  const formatVisiblePeso = useCallback(
    (amount: number, decimals: number = 0): string => {
      if (state.privacyMode) return '₱••••';
      if (decimals > 0) {
        return `₱${amount.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}`;
      }
      return `₱${Math.round(amount).toLocaleString()}`;
    },
    [state.privacyMode]
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
    [showToast]
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
    [showToast]
  );

  const toggleInstallmentInBudget = useCallback((id: string) => {
    triggerLightHaptic();
    dispatch({ type: 'TOGGLE_INSTALLMENT_IN_BUDGET', id });
  }, []);

  const removeInstallment = useCallback((id: string) => {
    triggerLightHaptic();
    dispatch({ type: 'REMOVE_INSTALLMENT', id });
  }, []);

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
    [showToast]
  );

  const depositToSinkingFund = useCallback(
    (id: string, amount: number) => {
      const cleanAmt = roundCurrency(Math.max(1, amount));
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
          : `Added ₱${cleanAmt.toLocaleString()} to ${target.name}`,
        hitGoal
      );
    },
    [showToast]
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
          `Removed ${target.name}. +₱${refund.toLocaleString()} moved to Savings Jar`,
          true
        );
      } else {
        showToast(`Removed ${target.name}`, false);
      }
    },
    [showToast]
  );

  const exportBackupJsonString = useCallback(() => {
    return serializeBackupJson(stateRef.current);
  }, []);

  const importBackupJsonString = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      const parsedRes = parseBackupJson(raw);
      if (!parsedRes.ok) {
        return { ok: false, message: parsedRes.error };
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
    [showToast]
  );

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

  const value = useMemo<BudgetContextValue>(
    () => ({
      isHydrated,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      isEditingOnboarding,
      hasSeenTutorial: state.hasSeenTutorial,
      privacyMode: state.privacyMode,
      togglePrivacyMode,
      formatVisiblePeso,
      themeMode: state.themeMode,
      setThemeMode,
      lastPaydayCheckInKey: state.lastPaydayCheckInKey,
      shade,
      settings: state.settings,
      billItems: state.billItems,
      cashOnHand: state.cashOnHand,
      banks: state.banks,
      creditCards: state.creditCards,
      installments: state.installments,
      envelopes: state.envelopes || [],
      sinkingFunds: state.sinkingFunds,
      monthlySaved: state.monthlySaved,
      baseDailyAllowance,
      rolloverBalance: state.rolloverBalance,
      todayKey,
      selectedDateKey,
      setSelectedDateKey,
      getDaySummary,
      spentOnSelectedDay: selectedDaySummary.spent,
      safeToSpendOnSelectedDay: selectedDaySummary.safeRemaining,
      streakDays: state.streakDays,
      bufferShields: state.bufferShields,
      disciplineScore: state.disciplineScore,
      cardTier,
      treats: state.treats,
      activeTreat,
      entries: state.entries,
      monthlyArchives: state.monthlyArchives,
      logSpend,
      fundActiveTreat,
      saveToJar,
      bankTodaySurplus,
      simulateMidnightSplit,
      claimTreat,
      addTreat,
      deleteTreat,
      setActiveTreat,
      undoEntry,
      updateBudgetConfig,
      updateSalarySchedule,
      updateBillAmount,
      updateBillDueDay,
      addBillItem,
      markBillPaid,
      removeBillItem,
      logPaydayCheckIn,
      dismissPaydayPrompt,
      addEnvelope,
      updateEnvelope,
      deleteEnvelope,
      spendFromEnvelope,
      refillEnvelope,
      depositToWalletAccount,
      setAccountBalanceWithLog,
      addBank,
      removeBank,
      addCreditCard,
      removeCreditCard,
      completeOnboarding,
      reopenOnboarding,
      cancelReopenedOnboarding,
      completeTutorial,
      openTutorial,
      resetToNewUser,
      resetDemoState,
      unlockedMilestones: state.unlockedMilestones,
      pendingMilestone,
      dismissMilestone,
      boostSavingsGoal,
      addInstallment,
      markInstallmentMonthPaid,
      toggleInstallmentInBudget,
      removeInstallment,
      addSinkingFund,
      depositToSinkingFund,
      deleteSinkingFund,
      exportBackupJsonString,
      importBackupJsonString,
    }),
    [
      isHydrated,
      state,
      isEditingOnboarding,
      togglePrivacyMode,
      formatVisiblePeso,
      setThemeMode,
      shade,
      baseDailyAllowance,
      todayKey,
      selectedDateKey,
      setSelectedDateKey,
      getDaySummary,
      selectedDaySummary.spent,
      selectedDaySummary.safeRemaining,
      cardTier,
      activeTreat,
      logSpend,
      fundActiveTreat,
      saveToJar,
      bankTodaySurplus,
      simulateMidnightSplit,
      claimTreat,
      addTreat,
      deleteTreat,
      setActiveTreat,
      undoEntry,
      updateBudgetConfig,
      updateSalarySchedule,
      updateBillAmount,
      updateBillDueDay,
      addBillItem,
      markBillPaid,
      removeBillItem,
      logPaydayCheckIn,
      dismissPaydayPrompt,
      addEnvelope,
      updateEnvelope,
      deleteEnvelope,
      spendFromEnvelope,
      refillEnvelope,
      depositToWalletAccount,
      setAccountBalanceWithLog,
      addBank,
      removeBank,
      addCreditCard,
      removeCreditCard,
      completeOnboarding,
      reopenOnboarding,
      cancelReopenedOnboarding,
      completeTutorial,
      openTutorial,
      resetToNewUser,
      resetDemoState,
      pendingMilestone,
      dismissMilestone,
      boostSavingsGoal,
      addInstallment,
      markInstallmentMonthPaid,
      toggleInstallmentInBudget,
      removeInstallment,
      addSinkingFund,
      depositToSinkingFund,
      deleteSinkingFund,
      exportBackupJsonString,
      importBackupJsonString,
    ]
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
};

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return ctx;
}
