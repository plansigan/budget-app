import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CreditCardAccount,
  DebtItem,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendingEnvelopeItem,
  TransactionEntry,
  TransactionType,
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
const LEGACY_STORAGE_KEY_V5 = '@velvet_budget_state_v5';

const VALID_TRANSACTION_TYPES = new Set<TransactionType>([
  'spend',
  'treat_direct',
  'impulse_skipped',
  'midnight_split',
  'save_direct',
  'sinking_fund',
  'installment_paid',
  'bill_paid',
  'envelope_spend',
  'envelope_refill',
  'wallet_deposit',
  'wallet_adjust',
  'wallet_transfer',
  'debt_outflow',
  'debt_inflow',
]);

const VALID_GRADES = new Set<MonthlyArchiveSnapshot['grade']>([
  'A+',
  'A',
  'B+',
  'B',
  'C',
]);

function optNonNegCurrency(val: unknown): number | undefined {
  return typeof val === 'number' && Number.isFinite(val)
    ? roundCurrency(Math.max(0, val))
    : undefined;
}

function optFiniteCurrency(val: unknown): number | undefined {
  return typeof val === 'number' && Number.isFinite(val)
    ? roundCurrency(val)
    : undefined;
}

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
          amount: roundCurrency(safeNum(b.amount, 0, 0)),
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
    monthlyIncome: roundCurrency(
      safeNum(rawSettings.monthlyIncome, base.settings.monthlyIncome, 0)
    ),
    fixedBills: hasBillItemsArray
      ? sumBills(normalizedBills)
      : roundCurrency(
          safeNum(rawSettings.fixedBills, sumBills(normalizedBills), 0)
        ),
    monthlySavingsGoal: roundCurrency(
      safeNum(
        rawSettings.monthlySavingsGoal,
        base.settings.monthlySavingsGoal,
        0
      )
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
          limit: roundCurrency(safeNum(c.limit, 1, 0.01)),
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
          target: roundCurrency(safeNum(f.target, 1, 0.01)),
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
          target: roundCurrency(safeNum(t.target, 1, 0.01)),
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
                e.id.trim().length > 0 &&
                typeof e.type === 'string' &&
                VALID_TRANSACTION_TYPES.has(e.type as TransactionType)
            )
        )
        .map((e) => {
          const validDateKey =
            typeof e.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.dateKey)
              ? e.dateKey
              : undefined;
          const signedDelta = optFiniteCurrency(e.signedDelta);
          const appliedWalletDelta = optNonNegCurrency(e.appliedWalletDelta);
          const appliedToWalletDelta = optNonNegCurrency(e.appliedToWalletDelta);
          const appliedEnvelopeDelta = optNonNegCurrency(e.appliedEnvelopeDelta);
          const previousEnvelopeBalance = optNonNegCurrency(
            e.previousEnvelopeBalance
          );
          const rolloverDelta = optNonNegCurrency(e.rolloverDelta);
          const savingsDelta = optNonNegCurrency(e.savingsDelta);

          return {
            ...e,
            amount: roundCurrency(safeNum(e.amount, 0, 0)),
            label: typeof e.label === 'string' ? e.label : 'Entry',
            icon: typeof e.icon === 'string' && e.icon ? e.icon : 'tag',
            timestamp:
              typeof e.timestamp === 'string' &&
              !Number.isNaN(Date.parse(e.timestamp))
                ? e.timestamp
                : new Date().toISOString(),
            dateKey: validDateKey,
            signedDelta,
            appliedWalletDelta,
            appliedToWalletDelta,
            appliedEnvelopeDelta,
            previousEnvelopeBalance,
            rolloverDelta,
            savingsDelta,
          };
        })
    : [];

  const normalizedArchives: MonthlyArchiveSnapshot[] = Array.isArray(
    raw.monthlyArchives
  )
    ? raw.monthlyArchives
        .filter(
          (a): a is MonthlyArchiveSnapshot =>
            Boolean(
              a &&
                typeof a === 'object' &&
                typeof a.monthKey === 'string' &&
                /^\d{4}-\d{2}$/.test(a.monthKey)
            )
        )
        .map((a) => ({
          monthKey: a.monthKey,
          monthTitle:
            typeof a.monthTitle === 'string' && a.monthTitle.trim()
              ? a.monthTitle.trim()
              : `${a.monthKey} WRAP-UP`,
          totalSpent: roundCurrency(safeNum(a.totalSpent, 0, 0)),
          totalSaved: roundCurrency(safeNum(a.totalSaved, 0, 0)),
          savingsRatePct: Math.round(safeNum(a.savingsRatePct, 0, 0, 1000)),
          monthlyIncome: roundCurrency(safeNum(a.monthlyIncome, 0, 0)),
          monthlySavingsGoal: roundCurrency(safeNum(a.monthlySavingsGoal, 0, 0)),
          streakDays: Math.round(safeNum(a.streakDays, 0, 0)),
          disciplineScore: Math.round(safeNum(a.disciplineScore, 800, 700, 999)),
          topCategoryLabel:
            typeof a.topCategoryLabel === 'string' && a.topCategoryLabel
              ? a.topCategoryLabel
              : 'No spends yet',
          topCategoryAmount: roundCurrency(safeNum(a.topCategoryAmount, 0, 0)),
          topSourceLabel:
            typeof a.topSourceLabel === 'string' && a.topSourceLabel
              ? a.topSourceLabel
              : 'None logged yet',
          txCount: Math.round(safeNum(a.txCount, 0, 0)),
          grade: VALID_GRADES.has(a.grade) ? a.grade : 'C',
          headline:
            typeof a.headline === 'string' && a.headline
              ? a.headline
              : 'Monthly summary archived.',
        }))
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
              : 'Spending Allowance',
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

  const normalizedDebts: DebtItem[] = Array.isArray(raw.debts)
    ? raw.debts
        .filter((d): d is DebtItem => Boolean(d && typeof d === 'object'))
        .map((d, idx) => {
          const amount = roundCurrency(safeNum(d.amount, 0.01, 0.01));
          const paidAmount = roundCurrency(
            safeNum(d.paidAmount, 0, 0, amount)
          );
          const trimmedNote =
            typeof d.note === 'string' && d.note.trim()
              ? d.note.trim()
              : undefined;
          const settled = paidAmount >= amount;
          return {
            id: typeof d.id === 'string' && d.id ? d.id : `debt-${idx}`,
            direction: d.direction === 'owed_to_me' ? 'owed_to_me' : 'i_owe',
            personName:
              typeof d.personName === 'string' && d.personName.trim()
                ? d.personName.trim()
                : 'Someone',
            amount,
            paidAmount,
            ...(trimmedNote ? { note: trimmedNote } : {}),
            createdAt:
              typeof d.createdAt === 'string' &&
              !Number.isNaN(Date.parse(d.createdAt))
                ? d.createdAt
                : new Date().toISOString(),
            ...(settled
              ? {
                  settledAt:
                    typeof d.settledAt === 'string' &&
                    !Number.isNaN(Date.parse(d.settledAt))
                      ? d.settledAt
                      : new Date().toISOString(),
                }
              : {}),
          };
        })
    : [];

  const validActiveTreatId =
    typeof raw.activeTreatId === 'string' &&
    normalizedTreats.some((t) => t.id === raw.activeTreatId)
      ? raw.activeTreatId
      : '';

  const rawLastSrc =
    typeof raw.lastPaymentSourceId === 'string' &&
    raw.lastPaymentSourceId.trim().length > 0
      ? raw.lastPaymentSourceId.trim()
      : undefined;
  const validLastSourceId =
    rawLastSrc &&
    (rawLastSrc === 'cash' ||
      normalizedBanks.some((b) => b.id === rawLastSrc) ||
      normalizedCards.some((c) => c.id === rawLastSrc))
      ? rawLastSrc
      : undefined;

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
    debts: normalizedDebts,
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
    activeTreatId: validActiveTreatId,
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
    lastPaymentSourceId: validLastSourceId,
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
    const rawV6 = await AsyncStorage.getItem(STORAGE_KEY);
    const rawV5 = !rawV6
      ? await AsyncStorage.getItem(LEGACY_STORAGE_KEY_V5)
      : null;
    const raw = rawV6 || rawV5;
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
    const normalized = normalizePersistedState(
      parsed as Partial<PersistedBudgetState>
    );
    if (!rawV6 && rawV5) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY_V5);
      } catch {
        // Ignore cleanup errors
      }
    }
    return {
      state: normalized,
      corrupted: false,
    };
  } catch {
    const recovered = await tryRecoverFromIdb();
    if (recovered) return { state: recovered, corrupted: false };
    return { state: null, corrupted: true };
  }
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
