export type ThemeMode = 'system' | 'light' | 'dark';
export type EnvelopeCadence = 'per_payday' | 'monthly';
export type EnvelopeRolloverMode = 'rollover' | 'reset';
export type DebtDirection = 'i_owe' | 'owed_to_me';

export interface DebtItem {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;
  paidAmount: number;
  note?: string;
  createdAt: string;
  settledAt?: string;
}

export type TransactionType =
  | 'spend'
  | 'treat_direct'
  /** @deprecated Legacy entry type retained only for backwards compatibility on read/undo/display. */
  | 'impulse_skipped'
  | 'midnight_split'
  | 'save_direct'
  | 'sinking_fund'
  | 'installment_paid'
  | 'bill_paid'
  | 'envelope_spend'
  | 'envelope_refill'
  | 'wallet_deposit'
  | 'wallet_adjust'
  | 'wallet_transfer'
  | 'debt_outflow'
  | 'debt_inflow';

export type CardTier =
  | 'Matte Slate'
  | 'Brushed Silver'
  | 'Velvet Amethyst'
  | 'Obsidian Titanium';

export type SpendCategoryKey =
  | 'cafe'
  | 'food'
  | 'ride'
  | 'bills'
  | 'shop'
  | 'health'
  | 'fun'
  | 'other';

export interface TransactionEntry {
  id: string;
  type: TransactionType;
  amount: number;
  label: string;
  icon: string;
  timestamp: string;
  dateKey?: string;
  category?: SpendCategoryKey;
  paymentSourceId?: string;
  paymentSourceLabel?: string;
  toPaymentSourceId?: string;
  toPaymentSourceLabel?: string;
  signedDelta?: number;
  /** Exact delta actually applied to the wallet account (after 0-clamping) for lossless Undo. */
  appliedWalletDelta?: number;
  /** Exact delta actually applied to destination account (after 0-clamping) for lossless Undo. */
  appliedToWalletDelta?: number;
  treatId?: string;
  installmentId?: string;
  sinkingFundId?: string;
  debtId?: string;
  debtAction?: 'created' | 'payment';
  affectsDailyBudget?: boolean;
  billId?: string;
  previousBillPaidMonth?: string;
  envelopeId?: string;
  previousEnvelopeBalance?: number;
  /** Exact delta deducted from the envelope for lossless out-of-order Undo/Edit. */
  appliedEnvelopeDelta?: number;
  previousEnvelopeRefillKey?: string;
  refilledEnvelopeSnapshots?: Array<{
    id: string;
    previousBalance: number;
    previousRefillKey?: string;
  }>;
  rolloverDelta?: number;
  savingsDelta?: number;
  /** True when created by automatic midnight rollover rather than manual same-day banking. */
  isAutoRollover?: boolean;
  /** True when created by the Payday Check-In flow. */
  isPaydayCheckIn?: boolean;
  previousPaydayCheckInKey?: string;
  /** Explicit marker for credit-card payment deposits (preferred over note heuristics). */
  isCardPayment?: boolean;
}

export interface MonthlyArchiveSnapshot {
  monthKey: string; // 'YYYY-MM'
  monthTitle: string;
  totalSpent: number;
  totalSaved: number;
  savingsRatePct: number;
  monthlyIncome: number;
  monthlySavingsGoal: number;
  streakDays: number;
  disciplineScore: number;
  topCategoryLabel: string;
  topCategoryAmount: number;
  topSourceLabel: string;
  txCount: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  headline: string;
}

export interface TreatVaultItem {
  id: string;
  name: string;
  icon: string;
  target: number;
  funded: number;
  fromImpulses: number;
  fromRollovers: number;
  claimed: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

export interface CreditCardAccount {
  id: string;
  name: string;
  limit: number;
  used: number;
  cutoffDay: number; // 1-31
}

export interface BudgetSettings {
  monthlyIncome: number;
  fixedBills: number;
  monthlySavingsGoal: number;
  salaryFrequency: 1 | 2;
  payday1: number;
  payday2: number;
}

export interface BillItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
  dueDay?: number; // 1-31
  lastPaidMonth?: string; // 'YYYY-MM'
}

export interface SpendingEnvelopeItem {
  id: string;
  name: string;
  icon: string;
  amountPerCycle: number;
  cadence: EnvelopeCadence;
  rolloverMode: EnvelopeRolloverMode;
  balance: number;
  lastRefillKey?: string;
}

export interface InstallmentItem {
  id: string;
  name: string;
  provider: string;
  monthlyAmount: number;
  totalMonths: number;
  paidMonths: number;
  includeInBudget: boolean;
}

export interface SinkingFundItem {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  monthsToGoal: number;
}

export interface ToastMessage {
  id: number;
  text: string;
  isDopamine: boolean;
}

export interface DaySummary {
  spent: number;
  savedOrSkipped: number;
  safeRemaining: number;
  entriesCount: number;
}

/**
 * Returns the card tier corresponding to the user's current Discipline Score.
 */
export function getCardTier(score: number): CardTier {
  if (score >= 920) return 'Obsidian Titanium';
  if (score >= 840) return 'Velvet Amethyst';
  if (score >= 780) return 'Brushed Silver';
  return 'Matte Slate';
}

/**
 * Computes how many days remain from `fromDate` until the next occurrence of `targetDay` (1-31).
 */
export function getDaysUntilDayOfMonth(
  targetDay: number,
  fromDate: Date = new Date()
): number {
  const clampedTarget = Math.max(1, Math.min(31, Math.round(targetDay)));
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const todayDay = fromDate.getDate();

  const daysInThisMonth = new Date(year, month + 1, 0).getDate();
  const effectiveThisMonth = Math.min(clampedTarget, daysInThisMonth);

  if (effectiveThisMonth >= todayDay) {
    return effectiveThisMonth - todayDay;
  }

  const daysInNextMonth = new Date(year, month + 2, 0).getDate();
  const effectiveNextMonth = Math.min(clampedTarget, daysInNextMonth);
  const nextDate = new Date(year, month + 1, effectiveNextMonth);
  const startToday = new Date(year, month, todayDay);

  return Math.round(
    (nextDate.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Returns a short countdown badge string for the next salary payday.
 */
export function getNextPaydayLabel(
  settings: BudgetSettings,
  fromDate: Date = new Date()
): string {
  const d1 = getDaysUntilDayOfMonth(settings.payday1, fromDate);
  const minDays =
    settings.salaryFrequency === 2
      ? Math.min(d1, getDaysUntilDayOfMonth(settings.payday2, fromDate))
      : d1;
  return minDays === 0 ? 'Payday Today' : `Payday: ${minDays}d`;
}

/**
 * Returns the YYYY-MM-DD local date key when `fromDate` matches one of the
 * user's configured paydays (clamped to the current month's length), else null.
 */
export function getPaydayMatchKey(
  settings: BudgetSettings,
  fromDate: Date = new Date()
): string | null {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const todayDay = fromDate.getDate();
  const daysInThisMonth = new Date(year, month + 1, 0).getDate();
  const p1 = Math.min(Math.max(1, Math.round(settings.payday1)), daysInThisMonth);
  const p2 = Math.min(Math.max(1, Math.round(settings.payday2)), daysInThisMonth);

  if (todayDay === p1 || (settings.salaryFrequency === 2 && todayDay === p2)) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
  }
  return null;
}

function roundPeso(val: number): number {
  if (!Number.isFinite(val)) return 0;
  const r = Math.round(val * 100) / 100;
  return r === 0 ? 0 : r;
}

/**
 * Returns the expected net amount per paycheck based on salary frequency (1x or 2x/mo).
 */
export function getExpectedPaycheckAmount(settings: BudgetSettings): number {
  const divisor = settings.salaryFrequency === 2 ? 2 : 1;
  return roundPeso(Math.max(0, settings.monthlyIncome) / divisor);
}

/**
 * Returns the suggested per-paycheck savings allocation based on salary frequency.
 */
export function getExpectedPaycheckSavingsSlice(settings: BudgetSettings): number {
  const divisor = settings.salaryFrequency === 2 ? 2 : 1;
  return roundPeso(Math.max(0, settings.monthlySavingsGoal) / divisor);
}
