import {
  BudgetSettings,
  InstallmentItem,
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  SpendCategoryKey,
  TransactionEntry,
  TreatVaultItem,
} from '../types/budget';
import {
  formatEntryDateLocal,
  formatLocalDateKey,
} from './transactionDisplay';

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
    entry.icon === 'heart' ||
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

/**
 * Computes spending categories sorted highest to lowest for the current Mon-Sun week or calendar month.
 */
export function computeSpendingBreakdown(
  entries: TransactionEntry[],
  range: 'week' | 'month',
  now: Date = new Date(),
  monthKey?: string
): SpendingBreakdownResult {
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const dow = todayMidnight.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(todayMidnight);
  monday.setDate(todayMidnight.getDate() + diffToMon);
  const mondayKey = formatLocalDateKey(monday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayKey = formatLocalDateKey(sunday);

  const monthPrefix =
    monthKey && /^\d{4}-\d{2}$/.test(monthKey)
      ? monthKey
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filtered = entries.filter((e) => {
    if (e.type !== 'spend') return false;
    const key = getEntryDateKey(e);
    if (range === 'week') {
      return key >= mondayKey && key <= sundayKey;
    }
    return key.startsWith(monthPrefix);
  });

  const bucketMap = new Map<string, SpendCategorySlice>();
  let totalSpent = 0;

  for (const entry of filtered) {
    const amt = Math.max(0, entry.amount);
    totalSpent += amt;
    const cat = classifySpendCategory(entry);
    const existing = bucketMap.get(cat.key);
    if (existing) {
      existing.amount += amt;
      existing.count += 1;
    } else {
      bucketMap.set(cat.key, {
        key: cat.key,
        icon: cat.icon,
        label: cat.label,
        amount: amt,
        pct: 0,
        count: 1,
      });
    }
  }

  const safeTotal = Math.max(1, totalSpent);
  const slices = Array.from(bucketMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((s) => ({
      ...s,
      pct: totalSpent > 0 ? Math.round((s.amount / safeTotal) * 100) : 0,
    }));

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    slices,
    topSlice: slices.length > 0 ? slices[0] : null,
    count: filtered.length,
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
    totalMonthlyCommitted: Math.round(totalMonthlyCommitted * 100) / 100,
    budgetedMonthlyTotal: Math.round(budgetedMonthlyTotal * 100) / 100,
    totalRemainingBalance: Math.round(totalRemainingBalance * 100) / 100,
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
  const remaining = Math.max(0, target - saved);
  const pct =
    target > 0
      ? Math.min(100, Math.round((saved / Math.max(1, target)) * 100))
      : 0;
  const safeMonths = Math.max(1, Math.round(fund.monthsToGoal || 1));
  const monthlyNeeded =
    remaining > 0 ? Math.ceil(remaining / safeMonths) : 0;

  return {
    remaining,
    pct,
    monthlyNeeded,
    targetMonthLabel:
      remaining === 0 ? 'Goal Reached!' : addMonthsLabel(safeMonths, now),
  };
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
  treats: TreatVaultItem[];
  sinkingFunds: SinkingFundItem[];
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

  const breakdown = computeSpendingBreakdown(
    params.entries,
    'month',
    now,
    monthPrefix
  );

  const monthEntries = params.entries.filter((e) =>
    getEntryDateKey(e).startsWith(monthPrefix)
  );

  // Count most used wallet payment source
  const sourceCounts = new Map<string, number>();
  for (const e of monthEntries) {
    if (e.type === 'spend' && e.paymentSourceLabel) {
      sourceCounts.set(
        e.paymentSourceLabel,
        (sourceCounts.get(e.paymentSourceLabel) || 0) + 1
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

  const sinkingDepositedThisMonth = monthEntries
    .filter((e) => e.type === 'sinking_fund')
    .reduce((sum, e) => sum + Math.max(0, e.amount), 0);
  const totalSaved = Math.round(
    Math.max(0, params.monthlySaved) + sinkingDepositedThisMonth
  );
  const safeIncome = Math.max(1, params.settings.monthlyIncome);
  const savingsRatePct =
    params.settings.monthlyIncome > 0
      ? Math.round((totalSaved / safeIncome) * 100)
      : 0;
  const goalPct =
    params.settings.monthlySavingsGoal > 0
      ? totalSaved / Math.max(1, params.settings.monthlySavingsGoal)
      : 0;

  let grade: MonthlyWrapUpReport['grade'] = 'C';
  if (savingsRatePct >= 25 || goalPct >= 1) grade = 'A+';
  else if (savingsRatePct >= 18 || goalPct >= 0.75) grade = 'A';
  else if (savingsRatePct >= 10 || goalPct >= 0.45) grade = 'B+';
  else if (totalSaved > 0 || breakdown.count > 0) grade = 'B';

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

  const topCategoryLabel = breakdown.topSlice
    ? breakdown.topSlice.label
    : 'No spends yet';
  const topCategoryAmount = breakdown.topSlice ? breakdown.topSlice.amount : 0;

  const shareText = params.privacyMode
    ? [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${grade})`,
        `Savings Rate: ${savingsRatePct}% of income`,
        `Streak: ${params.streakDays} days • Score: ${params.disciplineScore}`,
        `Top category: ${topCategoryLabel}`,
      ].join('\n')
    : [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${grade})`,
        `Saved: ₱${totalSaved.toLocaleString()} (${savingsRatePct}% of income)`,
        `Spent: ₱${Math.round(breakdown.totalSpent).toLocaleString()}`,
        `Streak: ${params.streakDays} days • Score: ${params.disciplineScore}`,
        `Top category: ${topCategoryLabel}`,
      ].join('\n');

  return {
    monthTitle,
    totalSpent: breakdown.totalSpent,
    totalSaved,
    savingsRatePct,
    streakDays: params.streakDays,
    disciplineScore: params.disciplineScore,
    topCategoryLabel,
    topCategoryAmount,
    topSourceLabel,
    txCount: monthEntries.length,
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

  const shareText = privacyMode
    ? [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${snapshot.grade})`,
        `Savings Rate: ${snapshot.savingsRatePct}% of income`,
        `Streak: ${snapshot.streakDays} days • Score: ${snapshot.disciplineScore}`,
        `Top category: ${snapshot.topCategoryLabel}`,
      ].join('\n')
    : [
        `My ${monthName} Velvet Budget Wrap-Up (Grade: ${snapshot.grade})`,
        `Saved: ₱${Math.round(snapshot.totalSaved).toLocaleString()} (${snapshot.savingsRatePct}% of income)`,
        `Spent: ₱${Math.round(snapshot.totalSpent).toLocaleString()}`,
        `Streak: ${snapshot.streakDays} days • Score: ${snapshot.disciplineScore}`,
        `Top category: ${snapshot.topCategoryLabel}`,
      ].join('\n');

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
