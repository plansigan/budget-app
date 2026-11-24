import {
  BudgetSettings,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendCategoryKey,
  TransactionEntry,
} from '../types/budget';
import { formatPeso } from './numberFormat';
import {
  formatEntryDateLocal,
  formatLocalDateKey,
} from './transactionDisplay';

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const r = Math.round(value * 100) / 100;
  return r === 0 ? 0 : r;
}

export interface SpendCategorySlice {
  key: string;
  icon: string;
  label: string;
  amount: number;
  pct: number;
  count: number;
}

export interface SpendingBreakdownResult {
  totalSpent: number;
  slices: SpendCategorySlice[];
  topSlice: SpendCategorySlice | null;
  count: number;
}

export interface InstallmentSummary {
  activeCount: number;
  totalMonthlyCommitted: number;
  budgetedMonthlyTotal: number;
  totalRemainingBalance: number;
  debtFreeLabel: string;
}

export interface SinkingFundPace {
  remaining: number;
  pct: number;
  monthlyNeeded: number;
  targetMonthLabel: string;
}

export interface MonthlyWrapUpReport {
  monthTitle: string;
  totalSpent: number;
  totalSaved: number;
  savingsRatePct: number;
  streakDays: number;
  disciplineScore: number;
  topCategoryLabel: string;
  topCategoryAmount: number;
  topSourceLabel: string;
  txCount: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  headline: string;
  shareText: string;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CATEGORY_META: Record<
  SpendCategoryKey,
  { key: SpendCategoryKey; icon: string; label: string }
> = {
  cafe: { key: 'cafe', icon: 'coffee', label: 'Cafe & Drinks' },
  food: { key: 'food', icon: 'shopping-bag', label: 'Food' },
  ride: { key: 'ride', icon: 'navigation', label: 'Rides & Transit' },
  bills: { key: 'bills', icon: 'zap', label: 'Bills & Utilities' },
  shop: { key: 'shop', icon: 'shopping-cart', label: 'Shopping' },
  health: { key: 'health', icon: 'heart', label: 'Health' },
  fun: { key: 'fun', icon: 'tv', label: 'Entertainment' },
  other: { key: 'other', icon: 'tag', label: 'Other' },
};

function getEntryDateKey(entry: TransactionEntry): string {
  return formatEntryDateLocal(entry);
}

function addMonthsLabel(monthsAhead: number, now: Date): string {
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + Math.max(0, monthsAhead),
    1
  );
  return `${MONTH_SHORT[target.getMonth()]} ${target.getFullYear()}`;
}

export function classifySpendCategory(entry: TransactionEntry): {
  key: string;
  icon: string;
  label: string;
} {
  if (entry.category && entry.category in CATEGORY_META) {
    return CATEGORY_META[entry.category];
  }

  const txt = `${entry.label || ''}`.toLowerCase();
  if (
    entry.icon === '☕' ||
    entry.icon === 'coffee' ||
    /\b(cafe|coffee|milk tea|starbucks|tea|latte|matcha)\b/.test(txt)
  ) {
    return CATEGORY_META.cafe;
  }
  if (
    entry.icon === '🍔' ||
    entry.icon === 'shopping-bag' ||
    /\b(food|lunch|dinner|breakfast|grabfood|jollibee|meal|snack|dining|groceries|grocery)\b/.test(
      txt
    )
  ) {
    return CATEGORY_META.food;
  }
  if (
    entry.icon === '🚕' ||
    entry.icon === 'navigation' ||
    entry.icon === 'truck' ||
    /\b(ride|grab|jeep|bus|mrt|lrt|fuel|gas|commute|fare|taxi|angkas|joyride)\b/.test(
      txt
    )
  ) {
    return CATEGORY_META.ride;
  }
  if (
    entry.icon === '⚡' ||
    entry.icon === 'zap' ||
    /\b(bill|bills|electric|meralco|water|internet|rent|wifi|utility|load)\b/.test(
      txt
    )
  ) {
    return CATEGORY_META.bills;
  }
  if (
    entry.icon === '🛍️' ||
    entry.icon === 'shopping-cart' ||
    /\b(shop|shopping|lazada|shopee|clothes|mall|order|buy)\b/.test(txt)
  ) {
    return CATEGORY_META.shop;
  }
  if (
    (entry.icon === 'heart' && entry.type !== 'envelope_spend') ||
    /\b(health|med|meds|medicine|gym|doctor|pharmacy|clinic|dental)\b/.test(
      txt
    )
  ) {
    return CATEGORY_META.health;
  }
  if (
    entry.icon === 'tv' ||
    /\b(fun|movie|cinema|game|games|sub|subscription|netflix|spotify)\b/.test(
      txt
    )
  ) {
    return CATEGORY_META.fun;
  }
  return CATEGORY_META.other;
}

export type SpendingBreakdownScope = 'all' | 'daily' | 'envelopes';

/**
 * Computes spending categories sorted highest to lowest for the current Mon-Sun week or calendar month.
 */
export function computeSpendingBreakdown(
  entries: TransactionEntry[],
  range: 'week' | 'month',
  now: Date = new Date(),
  monthKey?: string,
  scope: SpendingBreakdownScope = 'all'
): SpendingBreakdownResult {
  let mondayKey = '';
  let sundayKey = '';
  let monthPrefix = '';

  if (range === 'week') {
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dow = todayMidnight.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(todayMidnight);
    monday.setDate(todayMidnight.getDate() + diffToMon);
    mondayKey = formatLocalDateKey(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sundayKey = formatLocalDateKey(sunday);
  } else {
    monthPrefix =
      monthKey && /^\d{4}-\d{2}$/.test(monthKey)
        ? monthKey
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const bucketMap = new Map<string, SpendCategorySlice>();
  let totalSpent = 0;
  let matchCount = 0;

  for (const e of entries) {
    if (scope === 'daily') {
      if (e.type !== 'spend') continue;
    } else if (scope === 'envelopes') {
      if (e.type !== 'envelope_spend') continue;
    } else if (e.type !== 'spend' && e.type !== 'envelope_spend') {
      continue;
    }
    const key = getEntryDateKey(e);
    if (range === 'week') {
      if (key < mondayKey || key > sundayKey) continue;
    } else if (!key.startsWith(monthPrefix)) {
      continue;
    }

    matchCount += 1;
    const amt = Math.max(0, Number.isFinite(e.amount) ? e.amount : 0);
    totalSpent = round2(totalSpent + amt);
    const cat = classifySpendCategory(e);
    const existing = bucketMap.get(cat.key);
    if (existing) {
      existing.amount = round2(existing.amount + amt);
      existing.count += 1;
    } else {
      bucketMap.set(cat.key, {
        key: cat.key,
        icon: cat.icon,
        label: cat.label,
        amount: round2(amt),
        pct: 0,
        count: 1,
      });
    }
  }

  const safeTotal = Math.max(0.01, totalSpent);
  const slices = Array.from(bucketMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((s) => ({
      ...s,
      amount: round2(s.amount),
      pct: totalSpent > 0 ? Math.round((s.amount / safeTotal) * 100) : 0,
    }));

  return {
    totalSpent: round2(totalSpent),
    slices,
    topSlice: slices.length > 0 ? slices[0] : null,
    count: matchCount,
  };
}

/**
 * Returns formatted target payoff month string for a single installment item.
 */
export function getInstallmentPayoffLabel(
  item: InstallmentItem,
  now: Date = new Date()
): string {
  const remaining = Math.max(0, item.totalMonths - item.paidMonths);
  if (remaining <= 0) return 'Paid Off!';
  return addMonthsLabel(remaining, now);
}

/**
 * Summarizes active installments, monthly budget impact, remaining total, and final debt-free month.
 */
export function computeInstallmentSummary(
  items: InstallmentItem[],
  now: Date = new Date()
): InstallmentSummary {
  const active = items.filter((item) => item.paidMonths < item.totalMonths);
  let totalMonthlyCommitted = 0;
  let budgetedMonthlyTotal = 0;
  let totalRemainingBalance = 0;
  let maxRemainingMonths = 0;

  for (const item of active) {
    const monthly = Math.max(0, item.monthlyAmount);
    const remMonths = Math.max(0, item.totalMonths - item.paidMonths);
    totalMonthlyCommitted += monthly;
    if (item.includeInBudget) {
      budgetedMonthlyTotal += monthly;
    }
    totalRemainingBalance += monthly * remMonths;
    if (remMonths > maxRemainingMonths) {
      maxRemainingMonths = remMonths;
    }
  }

  return {
    activeCount: active.length,
    totalMonthlyCommitted: round2(totalMonthlyCommitted),
    budgetedMonthlyTotal: round2(budgetedMonthlyTotal),
    totalRemainingBalance: round2(totalRemainingBalance),
    debtFreeLabel:
      active.length === 0 || maxRemainingMonths === 0
        ? 'Debt-Free!'
        : addMonthsLabel(maxRemainingMonths, now),
  };
}

/**
 * Computes progress and required monthly pace for a Sinking Fund bucket.
 */
export function computeSinkingFundPace(
  fund: SinkingFundItem,
  now: Date = new Date()
): SinkingFundPace {
  const target = Math.max(0, fund.target);
  const saved = Math.max(0, fund.saved);
  const remaining = Math.max(0, round2(target - saved));
  const pct =
    target > 0
      ? Math.min(100, Math.round((saved / Math.max(0.01, target)) * 100))
      : 0;
  const safeMonths = Math.max(1, Math.round(fund.monthsToGoal || 1));
  const monthlyNeeded =
    remaining > 0 ? Math.ceil((remaining / safeMonths) * 100) / 100 : 0;

  return {
    remaining,
    pct,
    monthlyNeeded,
    targetMonthLabel:
      remaining === 0 ? 'Goal Reached!' : addMonthsLabel(safeMonths, now),
  };
}

function buildWrapUpShareText(params: {
  monthName: string;
  grade: MonthlyWrapUpReport['grade'];
  totalSaved: number;
  totalSpent: number;
  savingsRatePct: number;
  streakDays: number;
  disciplineScore: number;
  topCategoryLabel: string;
  privacyMode?: boolean;
}): string {
  const {
    monthName,
    grade,
    totalSaved,
    totalSpent,
    savingsRatePct,
    streakDays,
    disciplineScore,
    topCategoryLabel,
    privacyMode,
  } = params;
  return privacyMode
    ? [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${grade})`,
        `Savings Rate: ${savingsRatePct}% of income`,
        `Streak: ${streakDays} days • Score: ${disciplineScore}`,
        `Top category: ${topCategoryLabel}`,
      ].join('\n')
    : [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${grade})`,
        `Saved: ${formatPeso(totalSaved)} (${savingsRatePct}% of income)`,
        `Spent: ${formatPeso(totalSpent)}`,
        `Streak: ${streakDays} days • Score: ${disciplineScore}`,
        `Top category: ${topCategoryLabel}`,
      ].join('\n');
}

/**
 * Generates the monthly wrap-up report card metrics, grade, and shareable summary text.
 */
export function computeMonthlyWrapUp(params: {
  settings: BudgetSettings;
  monthlySaved: number;
  entries: TransactionEntry[];
  streakDays: number;
  disciplineScore: number;
  monthKey?: string;
  now?: Date;
  privacyMode?: boolean;
}): MonthlyWrapUpReport {
  const now = params.now || new Date();
  const monthPrefix =
    params.monthKey && /^\d{4}-\d{2}$/.test(params.monthKey)
      ? params.monthKey
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = monthPrefix.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(monthStr, 10) - 1));
  const monthName = MONTH_FULL[monthIdx] || MONTH_FULL[now.getMonth()];
  const monthTitle = `${monthName.toUpperCase()} ${yearStr} WRAP-UP`;

  const sourceCounts = new Map<string, number>();
  const categoryTotals = new Map<string, { label: string; amount: number }>();
  let totalSpent = 0;
  let spendCount = 0;
  let sinkingDepositedThisMonth = 0;
  let txCount = 0;

  for (const e of params.entries) {
    if (!getEntryDateKey(e).startsWith(monthPrefix)) continue;
    txCount += 1;

    if (e.type === 'spend' || e.type === 'envelope_spend') {
      const amt = Math.max(0, Number.isFinite(e.amount) ? e.amount : 0);
      totalSpent = round2(totalSpent + amt);
      spendCount += 1;
      const cat = classifySpendCategory(e);
      const existing = categoryTotals.get(cat.key);
      if (existing) {
        existing.amount = round2(existing.amount + amt);
      } else {
        categoryTotals.set(cat.key, { label: cat.label, amount: round2(amt) });
      }
      if (e.paymentSourceLabel) {
        sourceCounts.set(
          e.paymentSourceLabel,
          (sourceCounts.get(e.paymentSourceLabel) || 0) + 1
        );
      }
    } else if (e.type === 'sinking_fund') {
      sinkingDepositedThisMonth = round2(
        sinkingDepositedThisMonth + Math.max(0, e.amount)
      );
    }
  }

  let topSourceLabel = 'Cash';
  let topSourceMax = 0;
  for (const [src, count] of sourceCounts.entries()) {
    if (count > topSourceMax) {
      topSourceMax = count;
      topSourceLabel = src;
    }
  }
  if (topSourceMax === 0) {
    topSourceLabel = 'None logged yet';
  }

  let topCategoryLabel = 'No spends yet';
  let topCategoryAmount = 0;
  for (const slice of categoryTotals.values()) {
    if (slice.amount > topCategoryAmount) {
      topCategoryAmount = round2(slice.amount);
      topCategoryLabel = slice.label;
    }
  }

  const totalSaved = round2(
    Math.max(0, params.monthlySaved) + sinkingDepositedThisMonth
  );
  const safeIncome = Math.max(0.01, params.settings.monthlyIncome);
  const savingsRatePct =
    params.settings.monthlyIncome > 0
      ? Math.round((totalSaved / safeIncome) * 100)
      : 0;
  const goalPct =
    params.settings.monthlySavingsGoal > 0
      ? totalSaved / Math.max(0.01, params.settings.monthlySavingsGoal)
      : 0;

  let grade: MonthlyWrapUpReport['grade'] = 'C';
  if (savingsRatePct >= 25 || goalPct >= 1) grade = 'A+';
  else if (savingsRatePct >= 18 || goalPct >= 0.75) grade = 'A';
  else if (savingsRatePct >= 10 || goalPct >= 0.45) grade = 'B+';
  else if (totalSaved > 0 || spendCount > 0) grade = 'B';

  const headline =
    grade === 'A+'
      ? 'Incredible saving month! You stayed disciplined and hit your goal.'
      : grade === 'A'
      ? 'Strong month! Your saving habits are paying off.'
      : grade === 'B+'
      ? 'Solid progress! A few more saved days will take you to A.'
      : grade === 'B'
      ? 'Good momentum! Keep tracking daily spends and ending days strong.'
      : 'Fresh start! Log daily spends and save small amounts to build your score.';

  const shareText = buildWrapUpShareText({
    monthName,
    grade,
    totalSaved,
    totalSpent,
    savingsRatePct,
    streakDays: params.streakDays,
    disciplineScore: params.disciplineScore,
    topCategoryLabel,
    privacyMode: params.privacyMode,
  });

  return {
    monthTitle,
    totalSpent,
    totalSaved,
    savingsRatePct,
    streakDays: params.streakDays,
    disciplineScore: params.disciplineScore,
    topCategoryLabel,
    topCategoryAmount,
    topSourceLabel,
    txCount,
    grade,
    headline,
    shareText,
  };
}

/**
 * Formats a 'YYYY-MM' key as a compact short month & year label (e.g., 'Mar 2026').
 */
export function formatMonthKeyLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const short = MONTH_SHORT[monthIdx];
  if (!short) return monthKey;
  return `${short} ${year}`;
}

/**
 * Adapts a stored MonthlyArchiveSnapshot into a MonthlyWrapUpReport for viewing & sharing.
 */
export function buildWrapUpFromArchive(
  snapshot: MonthlyArchiveSnapshot,
  privacyMode: boolean = false
): MonthlyWrapUpReport {
  const match = /^(\d{4})-(\d{2})$/.exec(snapshot.monthKey);
  const monthIdx = match ? Math.max(0, Math.min(11, parseInt(match[2], 10) - 1)) : 0;
  const monthName = MONTH_FULL[monthIdx] || snapshot.monthTitle;

  const shareText = buildWrapUpShareText({
    monthName,
    grade: snapshot.grade,
    totalSaved: snapshot.totalSaved,
    totalSpent: snapshot.totalSpent,
    savingsRatePct: snapshot.savingsRatePct,
    streakDays: snapshot.streakDays,
    disciplineScore: snapshot.disciplineScore,
    topCategoryLabel: snapshot.topCategoryLabel,
    privacyMode,
  });

  return {
    monthTitle: snapshot.monthTitle,
    totalSpent: snapshot.totalSpent,
    totalSaved: snapshot.totalSaved,
    savingsRatePct: snapshot.savingsRatePct,
    streakDays: snapshot.streakDays,
    disciplineScore: snapshot.disciplineScore,
    topCategoryLabel: snapshot.topCategoryLabel,
    topCategoryAmount: snapshot.topCategoryAmount,
    topSourceLabel: snapshot.topSourceLabel,
    txCount: snapshot.txCount,
    grade: snapshot.grade,
    headline: snapshot.headline,
    shareText,
  };
}
