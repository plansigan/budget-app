import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CreditCardAccount,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  ThemeMode,
  TransactionEntry,
  TreatVaultItem,
} from '../types/budget';
import { getTodayKey, parseDateKeyLocal, sumBills } from './budgetMath';

const DEMO_MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

function buildDemoArchive(
  anchorDate: Date,
  monthsBack: number,
  metrics: Omit<MonthlyArchiveSnapshot, 'monthKey' | 'monthTitle'>
): MonthlyArchiveSnapshot {
  const dt = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() - monthsBack,
    1
  );
  const year = dt.getFullYear();
  const monthIdx = dt.getMonth();
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const monthTitle = `${DEMO_MONTH_NAMES[monthIdx]} ${year} WRAP-UP`;
  return {
    monthKey,
    monthTitle,
    ...metrics,
  };
}

export interface PersistedBudgetState {
  hasCompletedOnboarding: boolean;
  hasSeenTutorial: boolean;
  privacyMode: boolean;
  themeMode: ThemeMode;
  lastPaydayCheckInKey: string;
  settings: BudgetSettings;
  billItems: BillItem[];
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  installments: InstallmentItem[];
  sinkingFunds: SinkingFundItem[];
  monthlySaved: number;
  rolloverBalance: number;
  checkedInToday: boolean;
  lastActiveDate: string;
  streakDays: number;
  bufferShields: number;
  disciplineScore: number;
  activeTreatId: string;
  treats: TreatVaultItem[];
  entries: TransactionEntry[];
  monthlyArchives: MonthlyArchiveSnapshot[];
  unlockedMilestones: string[];
}

export interface OnboardingParams {
  income: number;
  bills: number;
  billItems?: BillItem[];
  savings: number;
  salaryFrequency: 1 | 2;
  payday1: number;
  payday2: number;
  cashOnHand: number;
  treatName?: string;
  treatIcon?: string;
  treatTarget?: number;
  preserveExistingData?: boolean;
}

export const DEFAULT_BILLS: BillItem[] = [
  { id: 'bill-rent', name: 'Rent / Housing', icon: 'home', amount: 8000, dueDay: 1 },
  {
    id: 'bill-power',
    name: 'Electricity & Water',
    icon: 'zap',
    amount: 3500,
    dueDay: 15,
  },
  {
    id: 'bill-net',
    name: 'Internet & Mobile',
    icon: 'wifi',
    amount: 2000,
    dueDay: 20,
  },
  {
    id: 'bill-subs',
    name: 'Subscriptions',
    icon: 'tv',
    amount: 1500,
    dueDay: 28,
  },
];

export const DEFAULT_BANKS: BankAccount[] = [
  { id: 'bank-bpi', name: 'BPI', balance: 12000 },
  { id: 'bank-gcash', name: 'GCash', balance: 3500 },
];

export const DEFAULT_CARDS: CreditCardAccount[] = [
  { id: 'cc-bdo', name: 'BDO Visa', limit: 50000, used: 4500, cutoffDay: 15 },
];

export function createNewUserState(
  todayKey: string = getTodayKey()
): PersistedBudgetState {
  const initialBills = DEFAULT_BILLS.map((b) => ({ ...b }));
  return {
    hasCompletedOnboarding: false,
    hasSeenTutorial: false,
    privacyMode: false,
    themeMode: 'system',
    lastPaydayCheckInKey: '',
    settings: {
      monthlyIncome: 35000,
      fixedBills: sumBills(initialBills),
      monthlySavingsGoal: 5000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    },
    billItems: initialBills,
    cashOnHand: 2000,
    banks: DEFAULT_BANKS.map((b) => ({ ...b })),
    creditCards: DEFAULT_CARDS.map((c) => ({ ...c })),
    installments: [],
    sinkingFunds: [],
    monthlySaved: 0,
    rolloverBalance: 0,
    checkedInToday: false,
    lastActiveDate: todayKey,
    streakDays: 0,
    bufferShields: 0,
    disciplineScore: 800,
    activeTreatId: '',
    treats: [],
    entries: [],
    monthlyArchives: [],
    unlockedMilestones: [],
  };
}

export function createDemoState(
  todayKey: string = getTodayKey()
): PersistedBudgetState {
  const nowIso = new Date().toISOString();
  const anchorDate = parseDateKeyLocal(todayKey);
  const initialBills = DEFAULT_BILLS.map((b) => ({ ...b }));
  return {
    hasCompletedOnboarding: true,
    hasSeenTutorial: true,
    privacyMode: false,
    themeMode: 'system',
    lastPaydayCheckInKey: '',
    settings: {
      monthlyIncome: 35000,
      fixedBills: sumBills(initialBills),
      monthlySavingsGoal: 5000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    },
    billItems: initialBills,
    cashOnHand: 2000,
    banks: DEFAULT_BANKS.map((b) => ({ ...b })),
    creditCards: DEFAULT_CARDS.map((c) => ({ ...c })),
    installments: [
      {
        id: 'inst-phone',
        name: 'Phone Upgrade',
        provider: 'BDO 0%',
        monthlyAmount: 2200,
        totalMonths: 12,
        paidMonths: 4,
        includeInBudget: true,
      },
    ],
    sinkingFunds: [
      {
        id: 'sf-emergency',
        name: 'Emergency Fund',
        icon: 'shield',
        target: 45000,
        saved: 12000,
        monthsToGoal: 12,
      },
    ],
    monthlySaved: 2500,
    rolloverBalance: 150,
    checkedInToday: false,
    lastActiveDate: todayKey,
    streakDays: 5,
    bufferShields: 1,
    disciplineScore: 840,
    activeTreatId: 'treat-headphones',
    treats: [
      {
        id: 'treat-headphones',
        name: 'Sony Headphones',
        icon: 'headphones',
        target: 3500,
        funded: 2450,
        fromImpulses: 1350,
        fromRollovers: 1100,
        claimed: false,
      },
    ],
    entries: [
      {
        id: 'seed-1',
        type: 'treat_direct',
        amount: 250,
        label: 'Funded Sony Headphones',
        icon: 'headphones',
        timestamp: nowIso,
        dateKey: todayKey,
        treatId: 'treat-headphones',
      },
      {
        id: 'seed-2',
        type: 'spend',
        amount: 145,
        label: 'Coffee',
        icon: 'coffee',
        timestamp: nowIso,
        dateKey: todayKey,
        paymentSourceId: 'cash',
        paymentSourceLabel: 'Cash',
      },
      {
        id: 'seed-3',
        type: 'wallet_deposit',
        amount: 12000,
        label: 'Payroll Deposit',
        icon: 'arrow-down-left',
        timestamp: nowIso,
        dateKey: todayKey,
        paymentSourceId: 'bank-bpi',
        paymentSourceLabel: 'BPI',
        signedDelta: 12000,
      },
    ],
    monthlyArchives: [
      buildDemoArchive(anchorDate, 1, {
        totalSpent: 11850,
        totalSaved: 5400,
        savingsRatePct: 15,
        monthlyIncome: 35000,
        monthlySavingsGoal: 5000,
        streakDays: 14,
        disciplineScore: 840,
        topCategoryLabel: 'Food',
        topCategoryAmount: 5200,
        topSourceLabel: 'GCash',
        txCount: 28,
        grade: 'A+',
        headline: 'Incredible saving month! You stayed disciplined and hit your goal.',
      }),
      buildDemoArchive(anchorDate, 2, {
        totalSpent: 13200,
        totalSaved: 4100,
        savingsRatePct: 12,
        monthlyIncome: 35000,
        monthlySavingsGoal: 5000,
        streakDays: 9,
        disciplineScore: 820,
        topCategoryLabel: 'Cafe & Drinks',
        topCategoryAmount: 3650,
        topSourceLabel: 'Cash',
        txCount: 24,
        grade: 'A',
        headline: 'Strong month! Your saving habits are paying off.',
      }),
    ],
    unlockedMilestones: [
      'first_save',
      'first_treat_fund',
      'saved_1k',
      'goal_50',
      'streak_3',
    ],
  };
}
