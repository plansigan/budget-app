import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CreditCardAccount,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendingEnvelopeItem,
  TransactionEntry,
  TreatVaultItem,
} from '../types/budget';
import {
  mirrorLatestStateToIdb,
  readLatestStateFromIdb,
} from './autoSnapshots';
import { getTodayKey, roundCurrency, safeNum, sumBills } from './budgetMath';
import {
  DEFAULT_BILLS,
  PersistedBudgetState,
  createNewUserState,
} from './defaults';

export const STORAGE_KEY = '@velvet_budget_state_v6';
export const LEGACY_STORAGE_KEY_V5 = '@velvet_budget_state_v5';

export function normalizePersistedState(
  raw: Partial<PersistedBudgetState>
): PersistedBudgetState {
  const base = createNewUserState();
  const hasBillItemsArray = Array.isArray(raw.billItems);
  const normalizedBills: BillItem[] = hasBillItemsArray
    ? raw.billItems!
        .filter((b): b is BillItem => Boolean(b && typeof b === 'object'))
        .map((b, idx) => ({
          id: typeof b.id === 'string' && b.id ? b.id : `bill-${idx}`,
          name:
            typeof b.name === 'string' && b.name.trim()
              ? b.name.trim()
              : 'Monthly Bill',
          icon: typeof b.icon === 'string' && b.icon ? b.icon : 'tag',
          amount: Math.round(safeNum(b.amount, 0, 0)),
          dueDay:
            typeof b.dueDay === 'number' && Number.isFinite(b.dueDay)
              ? Math.round(safeNum(b.dueDay, 1, 1, 31))
              : undefined,
          lastPaidMonth:
            typeof b.lastPaidMonth === 'string' &&
            /^\d{4}-\d{2}$/.test(b.lastPaidMonth)
              ? b.lastPaidMonth
              : undefined,
        }))
    : DEFAULT_BILLS.map((b) => ({ ...b }));

  const rawSettings = (
    raw.settings && typeof raw.settings === 'object' ? raw.settings : {}
  ) as Partial<BudgetSettings>;

  const normalizedSettings: BudgetSettings = {
    monthlyIncome: safeNum(
      rawSettings.monthlyIncome,
      base.settings.monthlyIncome,
      0
    ),
    fixedBills: hasBillItemsArray
      ? sumBills(normalizedBills)
      : safeNum(rawSettings.fixedBills, sumBills(normalizedBills), 0),
    monthlySavingsGoal: safeNum(
      rawSettings.monthlySavingsGoal,
      base.settings.monthlySavingsGoal,
      0
    ),
    salaryFrequency: rawSettings.salaryFrequency === 1 ? 1 : 2,
    payday1: Math.round(safeNum(rawSettings.payday1, 15, 1, 31)),
    payday2: Math.round(safeNum(rawSettings.payday2, 30, 1, 31)),
  };

  const normalizedBanks: BankAccount[] = Array.isArray(raw.banks)
    ? raw.banks
        .filter((b): b is BankAccount => Boolean(b && typeof b === 'object'))
        .map((b, idx) => ({
          id: typeof b.id === 'string' && b.id ? b.id : `bank-${idx}`,
          name:
            typeof b.name === 'string' && b.name.trim()
              ? b.name.trim()
              : 'Bank',
          balance: roundCurrency(safeNum(b.balance, 0, 0)),
        }))
    : base.banks;

  const normalizedCards: CreditCardAccount[] = Array.isArray(raw.creditCards)
    ? raw.creditCards
        .filter((c): c is CreditCardAccount =>
          Boolean(c && typeof c === 'object')
        )
        .map((c, idx) => ({
          id: typeof c.id === 'string' && c.id ? c.id : `cc-${idx}`,
          name:
            typeof c.name === 'string' && c.name.trim()
              ? c.name.trim()
              : 'Credit Card',
          limit: roundCurrency(safeNum(c.limit, 1, 1)),
          used: roundCurrency(safeNum(c.used, 0, 0)),
          cutoffDay: Math.round(safeNum(c.cutoffDay, 15, 1, 31)),
        }))
    : base.creditCards;

  const normalizedInstallments: InstallmentItem[] = Array.isArray(
    raw.installments
  )
    ? raw.installments
        .filter((i): i is InstallmentItem =>
          Boolean(i && typeof i === 'object')
        )
        .map((i, idx) => {
          const totalMonths = Math.max(
            1,
            Math.round(safeNum(i.totalMonths, 12, 1, 360))
          );
          const paidMonths = Math.round(
            safeNum(i.paidMonths, 0, 0, totalMonths)
          );
          return {
            id: typeof i.id === 'string' && i.id ? i.id : `inst-${idx}`,
            name:
              typeof i.name === 'string' && i.name.trim()
                ? i.name.trim()
                : 'Installment',
            provider:
              typeof i.provider === 'string' && i.provider.trim()
                ? i.provider.trim()
                : 'Installment',
            monthlyAmount: roundCurrency(safeNum(i.monthlyAmount, 0, 0)),
            totalMonths,
            paidMonths,
            includeInBudget: Boolean(i.includeInBudget),
          };
        })
    : [];

  const normalizedFunds: SinkingFundItem[] = Array.isArray(raw.sinkingFunds)
    ? raw.sinkingFunds
        .filter((f): f is SinkingFundItem =>
          Boolean(f && typeof f === 'object')
        )
        .map((f, idx) => ({
          id: typeof f.id === 'string' && f.id ? f.id : `sf-${idx}`,
          name:
            typeof f.name === 'string' && f.name.trim()
              ? f.name.trim()
              : 'Savings Bucket',
          icon: typeof f.icon === 'string' && f.icon ? f.icon : 'shield',
          target: roundCurrency(safeNum(f.target, 1, 1)),
          saved: roundCurrency(safeNum(f.saved, 0, 0)),
          monthsToGoal: Math.round(safeNum(f.monthsToGoal, 6, 1, 120)),
        }))
    : [];

  const normalizedTreats: TreatVaultItem[] = Array.isArray(raw.treats)
    ? raw.treats
        .filter((t): t is TreatVaultItem => Boolean(t && typeof t === 'object'))
        .map((t, idx) => ({
          id: typeof t.id === 'string' && t.id ? t.id : `treat-${idx}`,
          name:
            typeof t.name === 'string' && t.name.trim()
              ? t.name.trim()
              : 'Treat',
          icon: typeof t.icon === 'string' && t.icon ? t.icon : 'gift',
          target: roundCurrency(safeNum(t.target, 1, 1)),
          funded: roundCurrency(safeNum(t.funded, 0, 0)),
          fromImpulses: roundCurrency(safeNum(t.fromImpulses, 0, 0)),
          fromRollovers: roundCurrency(safeNum(t.fromRollovers, 0, 0)),
          claimed: Boolean(t.claimed),
        }))
    : [];

  const normalizedEntries: TransactionEntry[] = Array.isArray(raw.entries)
    ? raw.entries
        .filter(
          (e): e is TransactionEntry =>
            Boolean(
              e &&
                typeof e === 'object' &&
                typeof e.id === 'string' &&
                typeof e.type === 'string'
            )
        )
        .map((e) => ({
          ...e,
          amount: roundCurrency(safeNum(e.amount, 0, 0)),
          label: typeof e.label === 'string' ? e.label : 'Entry',
          icon: typeof e.icon === 'string' && e.icon ? e.icon : 'tag',
          timestamp:
            typeof e.timestamp === 'string' && e.timestamp
              ? e.timestamp
              : new Date().toISOString(),
        }))
    : [];

  const normalizedArchives: MonthlyArchiveSnapshot[] = Array.isArray(
    raw.monthlyArchives
  )
    ? raw.monthlyArchives.filter((a): a is MonthlyArchiveSnapshot =>
        Boolean(a && typeof a === 'object' && typeof a.monthKey === 'string')
      )
    : [];

  const normalizedEnvelopes: SpendingEnvelopeItem[] = Array.isArray(raw.envelopes)
    ? raw.envelopes
        .filter((env): env is SpendingEnvelopeItem =>
          Boolean(env && typeof env === 'object')
        )
        .map((env, idx) => ({
          id: typeof env.id === 'string' && env.id ? env.id : `env-${idx}`,
          name:
            typeof env.name === 'string' && env.name.trim()
              ? env.name.trim()
              : 'Spending Envelope',
          icon: typeof env.icon === 'string' && env.icon ? env.icon : 'heart',
          amountPerCycle: roundCurrency(safeNum(env.amountPerCycle, 0, 0)),
          cadence: env.cadence === 'monthly' ? 'monthly' : 'per_payday',
          rolloverMode: env.rolloverMode === 'reset' ? 'reset' : 'rollover',
          balance: roundCurrency(safeNum(env.balance, 0, 0)),
          lastRefillKey:
            typeof env.lastRefillKey === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(env.lastRefillKey)
              ? env.lastRefillKey
              : undefined,
        }))
    : [];

  return {
    ...base,
    hasCompletedOnboarding: Boolean(raw.hasCompletedOnboarding),
    hasSeenTutorial: Boolean(raw.hasSeenTutorial),
    privacyMode: Boolean(raw.privacyMode),
    themeMode:
      raw.themeMode === 'light' ||
      raw.themeMode === 'dark' ||
      raw.themeMode === 'system'
        ? raw.themeMode
        : 'system',
    lastPaydayCheckInKey:
      typeof raw.lastPaydayCheckInKey === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.lastPaydayCheckInKey)
        ? raw.lastPaydayCheckInKey
        : '',
    settings: normalizedSettings,
    billItems: normalizedBills,
    envelopes: normalizedEnvelopes,
    cashOnHand: roundCurrency(safeNum(raw.cashOnHand, base.cashOnHand, 0)),
    banks: normalizedBanks,
    creditCards: normalizedCards,
    installments: normalizedInstallments,
    sinkingFunds: normalizedFunds,
    monthlySaved: roundCurrency(safeNum(raw.monthlySaved, 0, 0)),
    rolloverBalance: roundCurrency(safeNum(raw.rolloverBalance, 0, 0)),
    checkedInToday: Boolean(raw.checkedInToday),
    lastActiveDate:
      typeof raw.lastActiveDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.lastActiveDate)
        ? raw.lastActiveDate
        : getTodayKey(),
    streakDays: Math.round(safeNum(raw.streakDays, 0, 0)),
    bufferShields: Math.round(safeNum(raw.bufferShields, 0, 0)),
    disciplineScore: Math.round(safeNum(raw.disciplineScore, 800, 700, 999)),
    activeTreatId:
      typeof raw.activeTreatId === 'string' ? raw.activeTreatId : '',
    treats: normalizedTreats,
    entries: normalizedEntries,
    monthlyArchives: normalizedArchives,
    unlockedMilestones: Array.isArray(raw.unlockedMilestones)
      ? raw.unlockedMilestones.filter((m): m is string => typeof m === 'string')
      : [],
    lastBackupAt:
      typeof raw.lastBackupAt === 'string' &&
      !Number.isNaN(Date.parse(raw.lastBackupAt))
        ? raw.lastBackupAt
        : undefined,
  };
}

export async function readRawPersistedState(): Promise<string | null> {
  try {
    const raw =
      (await AsyncStorage.getItem(STORAGE_KEY)) ||
      (await AsyncStorage.getItem(LEGACY_STORAGE_KEY_V5));
    if (raw) return raw;
  } catch {
    // Fall through to Web localStorage check below if available
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V5)
      );
    }
  } catch {
    // Ignore localStorage access failures
  }
  return null;
}

async function tryRecoverFromIdb(): Promise<PersistedBudgetState | null> {
  try {
    const idbRaw = await readLatestStateFromIdb();
    if (!idbRaw) return null;
    const parsed = JSON.parse(idbRaw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const normalized = normalizePersistedState(
      parsed as Partial<PersistedBudgetState>
    );
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore re-heal write errors
    }
    return normalized;
  } catch {
    return null;
  }
}

export async function loadPersistedStateWithStatus(): Promise<{
  state: PersistedBudgetState | null;
  corrupted: boolean;
}> {
  try {
    const raw =
      (await AsyncStorage.getItem(STORAGE_KEY)) ||
      (await AsyncStorage.getItem(LEGACY_STORAGE_KEY_V5));
    if (!raw) {
      const recovered = await tryRecoverFromIdb();
      return { state: recovered, corrupted: false };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const recovered = await tryRecoverFromIdb();
      if (recovered) return { state: recovered, corrupted: false };
      return { state: null, corrupted: true };
    }
    return {
      state: normalizePersistedState(parsed as Partial<PersistedBudgetState>),
      corrupted: false,
    };
  } catch {
    const recovered = await tryRecoverFromIdb();
    if (recovered) return { state: recovered, corrupted: false };
    return { state: null, corrupted: true };
  }
}

export async function loadPersistedState(): Promise<PersistedBudgetState | null> {
  const result = await loadPersistedStateWithStatus();
  return result.state;
}

export async function savePersistedState(
  state: PersistedBudgetState
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(state);
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
    void mirrorLatestStateToIdb(serialized);
    return true;
  } catch {
    return false;
  }
}
