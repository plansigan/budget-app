import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CreditCardAccount,
  TransactionEntry,
  TreatVaultItem,
  getDaysUntilDayOfMonth,
} from '../types/budget';

export type CoachCategory =
  | 'Budget Health'
  | 'Saving Tip'
  | 'Card Alert'
  | 'Daily Pace'
  | 'Emergency Fund'
  | 'Habit';

export interface CoachTip {
  id: string;
  category: CoachCategory;
  icon: string;
  title: string;
  body: string;
  tone: 'positive' | 'dopamine' | 'warning' | 'neutral';
}

export type MilestoneActionType =
  | 'boost_goal_500'
  | 'open_wallet'
  | 'open_treats'
  | 'none';

export interface MilestoneDefinition {
  id: string;
  icon: string;
  badge: string;
  title: string;
  subtitle: string;
  unlockHint: string;
  suggestions: string[];
  actionLabel?: string;
  actionType?: MilestoneActionType;
}

export interface CoachStateInput {
  settings: BudgetSettings;
  monthlySaved: number;
  baseDailyAllowance: number;
  safeToSpendToday: number;
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  treats: TreatVaultItem[];
  entries: TransactionEntry[];
  streakDays: number;
  privacyMode?: boolean;
  billItems?: BillItem[];
  currentMonthKey?: string;
}

export interface BudgetHealthMetrics {
  billsPct: number;
  savingsPct: number;
  dailyPct: number;
  emergencyTarget3Mo: number;
  emergencyTarget6Mo: number;
}

/**
 * Calculates 50/30/20 style allocation percentages and Emergency Fund targets
 * using safe guards against zero monthly income.
 */
export function computeBudgetHealth(
  settings: BudgetSettings
): BudgetHealthMetrics {
  const income = Math.max(0, settings.monthlyIncome);
  const bills = Math.max(0, settings.fixedBills);
  const savings = Math.max(0, settings.monthlySavingsGoal);
  const emergencyTarget3Mo = Math.round(bills * 3);
  const emergencyTarget6Mo = Math.round(bills * 6);

  if (income <= 0) {
    return {
      billsPct: 0,
      savingsPct: 0,
      dailyPct: 0,
      emergencyTarget3Mo,
      emergencyTarget6Mo,
    };
  }

  const safeIncome = Math.max(1, income);
  const billsPct = Math.min(100, Math.round((bills / safeIncome) * 100));
  const savingsPct = Math.min(
    Math.max(0, 100 - billsPct),
    Math.round((savings / safeIncome) * 100)
  );
  const dailyPct = Math.max(0, 100 - billsPct - savingsPct);

  return {
    billsPct,
    savingsPct,
    dailyPct,
    emergencyTarget3Mo,
    emergencyTarget6Mo,
  };
}

const CURATED_HABIT_TIPS: CoachTip[] = [
  {
    id: 'habit-24h-rule',
    category: 'Habit',
    icon: 'clock',
    title: 'Use the 24-hour cart rule',
    body: 'Wait one day before buying anything online. Half the time you will realize you do not even want it anymore.',
    tone: 'dopamine',
  },
  {
    id: 'habit-separate-bank',
    category: 'Saving Tip',
    icon: 'briefcase',
    title: 'Keep savings out of sight',
    body: 'Move saved pesos into a separate high-yield bank account so daily expenses never accidentally eat your savings.',
    tone: 'positive',
  },
  {
    id: 'habit-payday-first',
    category: 'Habit',
    icon: 'calendar',
    title: 'Pay yourself first on payday',
    body: 'Transfer your savings slice right when your salary lands instead of waiting to see what is left at month end.',
    tone: 'positive',
  },
  {
    id: 'habit-small-leaks',
    category: 'Saving Tip',
    icon: 'coffee',
    title: 'Watch the ₱150 daily leaks',
    body: 'Skipping two ₱150 food deliveries a week saves ₱1,200 a month or ₱14,400 a year.',
    tone: 'dopamine',
  },
  {
    id: 'habit-subs-audit',
    category: 'Budget Health',
    icon: 'scissors',
    title: 'Audit subscriptions once a month',
    body: 'Cancel one app or streaming plan you barely opened this month and add that exact amount to your Savings Jar.',
    tone: 'neutral',
  },
  {
    id: 'habit-baon-twice',
    category: 'Habit',
    icon: 'package',
    title: 'Pack lunch twice a week',
    body: 'Bringing food from home just 2 days a week easily saves ₱1,000+ every month with zero stress.',
    tone: 'positive',
  },
  {
    id: 'habit-installment-trap',
    category: 'Card Alert',
    icon: 'credit-card',
    title: 'Treat 0% installments like cash',
    body: 'Only split a purchase if you could pay the full price today without touching your bills or emergency savings.',
    tone: 'neutral',
  },
  {
    id: 'habit-roundup',
    category: 'Saving Tip',
    icon: 'moon',
    title: 'End Day & Save nightly',
    body: 'Even saving ₱50 from an under-budget day builds momentum. Tap End Day & Save before you sleep.',
    tone: 'positive',
  },
  {
    id: 'habit-windfall-split',
    category: 'Saving Tip',
    icon: 'gift',
    title: 'Use the 50/50 bonus rule',
    body: 'Whenever you get a bonus or unexpected cash, save half right away and enjoy the other half guilt-free.',
    tone: 'dopamine',
  },
  {
    id: 'habit-weekly-check',
    category: 'Habit',
    icon: 'calendar',
    title: 'Check your Mon to Sun belt nightly',
    body: 'A quick 10-second check at night keeps your streak alive and catches forgotten cash spends early.',
    tone: 'neutral',
  },
];

/**
 * Builds prioritized personalized advice using real Philippine Peso numbers first,
 * followed by practical saving habits.
 */
export function generatePersonalizedTips(input: CoachStateInput): CoachTip[] {
  const tips: CoachTip[] = [];
  const health = computeBudgetHealth(input.settings);
  const peso = (amt: number) =>
    input.privacyMode ? '₱••••' : `₱${Math.round(amt).toLocaleString()}`;
  const liquidTotal =
    Math.max(0, input.cashOnHand) +
    input.banks.reduce((sum, b) => sum + Math.max(0, b.balance), 0);

  // 1. Urgent credit card cut-off alerts (within 5 days)
  for (const card of input.creditCards) {
    if (card.used > 0) {
      const daysLeft = getDaysUntilDayOfMonth(card.cutoffDay);
      if (daysLeft <= 5) {
        tips.push({
          id: `card-cutoff-${card.id}`,
          category: 'Card Alert',
          icon: 'credit-card',
          title: `${card.name} cut-off ${daysLeft === 0 ? 'is today' : `in ${daysLeft}d`}`,
          body: `You have ${peso(card.used)} used on ${card.name}. Paying the statement in full avoids around 3% monthly interest.`,
          tone: 'warning',
        });
      }
    }
  }

  // 2. Credit card utilization warning (>= 30%)
  for (const card of input.creditCards) {
    const safeLimit = Math.max(1, card.limit);
    const usedRatio = card.used / safeLimit;
    if (card.limit > 0 && usedRatio >= 0.3) {
      const pct = Math.round(usedRatio * 100);
      tips.push({
        id: `card-util-${card.id}`,
        category: 'Card Alert',
        icon: 'bar-chart-2',
        title: `${card.name} is at ${pct}% of its limit`,
        body: 'Keeping card usage under 30% gives you breathing room and protects your monthly cash flow.',
        tone: 'warning',
      });
    }
  }

  // 2b. Upcoming unpaid fixed bills due within 5 days
  const now = new Date();
  const activeMonthKey =
    input.currentMonthKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (const bill of input.billItems || []) {
    if (
      typeof bill.dueDay === 'number' &&
      bill.lastPaidMonth !== activeMonthKey
    ) {
      const daysLeft = getDaysUntilDayOfMonth(bill.dueDay);
      if (daysLeft <= 5) {
        tips.push({
          id: `bill-due-${bill.id}`,
          category: 'Budget Health',
          icon: bill.icon || 'file-text',
          title: `${bill.name} due ${daysLeft === 0 ? 'today' : `in ${daysLeft}d`}`,
          body: `Estimated ${peso(bill.amount)}. Mark it paid in Budget or Today once settled to keep wallet balances accurate.`,
          tone: 'warning',
        });
      }
    }
  }

  // 3. Daily pacing projection
  if (input.safeToSpendToday > 0) {
    const projectedMonth = Math.round(input.safeToSpendToday * 30);
    tips.push({
      id: 'daily-pace-positive',
      category: 'Daily Pace',
      icon: 'zap',
      title: `${peso(input.safeToSpendToday)} safe today`,
      body: `Keeping ${peso(input.safeToSpendToday)} unused per day equals ${peso(projectedMonth)} in a month. Tap End Day & Save tonight!`,
      tone: 'positive',
    });
  } else {
    tips.push({
      id: 'daily-pace-reset',
      category: 'Daily Pace',
      icon: 'sun',
      title: 'Over today? Tomorrow resets clean',
      body: 'Trim ₱100 from food delivery or snacks tomorrow to bounce right back.',
      tone: 'neutral',
    });
  }

  // 4. Budget Health (50/30/20 check)
  if (input.settings.monthlyIncome > 0) {
    if (health.savingsPct < 20) {
      const target20 = Math.round(input.settings.monthlyIncome * 0.2);
      tips.push({
        id: 'health-savings-boost',
        category: 'Budget Health',
        icon: 'target',
        title: `Saving ${health.savingsPct}% of your pay`,
        body: `Great start! A 20% target on your pay is ${peso(target20)}/month. Try raising your goal slowly by ₱500.`,
        tone: 'dopamine',
      });
    } else {
      tips.push({
        id: 'health-savings-strong',
        category: 'Budget Health',
        icon: 'award',
        title: `Strong ${health.savingsPct}% savings rate!`,
        body: `Your split is ${health.billsPct}% bills, ${health.savingsPct}% savings, and ${health.dailyPct}% daily cash. You are ahead of most earners.`,
        tone: 'positive',
      });
    }
  }

  // 5. Emergency fund progress check
  if (health.emergencyTarget3Mo > 0) {
    const pctCovered = Math.min(
      100,
      Math.round((liquidTotal / Math.max(1, health.emergencyTarget3Mo)) * 100)
    );
    if (liquidTotal < health.emergencyTarget3Mo) {
      tips.push({
        id: 'emergency-fund-target',
        category: 'Emergency Fund',
        icon: 'shield',
        title: `Starter safety net: ${peso(health.emergencyTarget3Mo)}`,
        body: `That covers 3 months of your ${peso(input.settings.fixedBills)} bills. Your Cash + Banks now cover ${pctCovered}%.`,
        tone: 'neutral',
      });
    } else {
      tips.push({
        id: 'emergency-fund-covered',
        category: 'Emergency Fund',
        icon: 'shield',
        title: '3-month safety net covered!',
        body: `Your ${peso(liquidTotal)} across Cash and Banks already covers 3 months of bills. Keep building toward 6 months (${peso(health.emergencyTarget6Mo)}).`,
        tone: 'positive',
      });
    }
  }

  return [...tips, ...CURATED_HABIT_TIPS];
}

export const ALL_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first_save',
    icon: 'trending-up',
    badge: 'FIRST SAVE',
    title: 'You saved your first peso!',
    subtitle: 'Every big savings fund starts with the very first deposit.',
    unlockHint: 'Save to your Savings Jar',
    suggestions: [
      'Save a small fixed amount right on payday so you do not have to think about it.',
      'Move your saved cash to a separate digital bank account in the Wallet tab.',
    ],
    actionLabel: 'Open Wallet',
    actionType: 'open_wallet',
  },
  {
    id: 'first_treat_fund',
    icon: 'gift',
    badge: 'FIRST TREAT STEP',
    title: 'First pesos set aside for a Treat!',
    subtitle: 'Saving ahead of time keeps every treat completely guilt-free.',
    unlockHint: 'Add pesos toward a Treat',
    suggestions: [
      'Use the 24-hour cart rule before checking out online.',
      'Add up to 3 Treats you truly care about so goals stay focused.',
    ],
    actionLabel: 'View Treats',
    actionType: 'open_treats',
  },
  {
    id: 'saved_1k',
    icon: 'dollar-sign',
    badge: '₱1,000 SAVED',
    title: 'First ₱1,000 locked in!',
    subtitle: 'You just crossed the hardest milestone for building real momentum.',
    unlockHint: 'Reach ₱1,000 saved this month',
    suggestions: [
      'Park this ₱1,000 in a separate high-yield bank or e-wallet savings stash.',
      'Keep only weekly spending money in your main wallet so savings stay untouched.',
    ],
    actionLabel: 'Check Wallet',
    actionType: 'open_wallet',
  },
  {
    id: 'goal_50',
    icon: 'zap',
    badge: 'HALFWAY THERE',
    title: '50% of your monthly goal hit!',
    subtitle: 'You are halfway to hitting your monthly savings target.',
    unlockHint: 'Hit 50% of monthly goal',
    suggestions: [
      'Tap End Day & Save before bed on under-budget days to finish even faster.',
      'Review your Subscriptions in Budget setup to see if ₱200 more can go to savings.',
    ],
  },
  {
    id: 'saved_5k',
    icon: 'briefcase',
    badge: '₱5,000 CLUB',
    title: '₱5,000 saved this month!',
    subtitle: 'Real financial cushion starts right around this mark.',
    unlockHint: 'Reach ₱5,000 saved this month',
    suggestions: [
      'Put a portion toward a 3-month Emergency Fund equal to 3x your monthly bills.',
      'Check if any credit card cut-off is coming up so zero interest eats your progress.',
    ],
    actionLabel: 'Open Wallet',
    actionType: 'open_wallet',
  },
  {
    id: 'goal_100',
    icon: 'award',
    badge: 'GOAL COMPLETE',
    title: '100% monthly savings goal hit!',
    subtitle: 'You protected your full monthly target. Amazing discipline!',
    unlockHint: 'Reach 100% of monthly goal',
    suggestions: [
      'Challenge yourself by nudging next month’s goal up by +₱500.',
      'Route any extra unused cash this month toward your top Treat or Emergency Fund.',
    ],
    actionLabel: 'Raise Goal +₱500',
    actionType: 'boost_goal_500',
  },
  {
    id: 'streak_3',
    icon: 'activity',
    badge: '3-DAY STREAK',
    title: '3 days on budget in a row!',
    subtitle: 'Consistency beats perfection every single time.',
    unlockHint: 'Keep a 3-day budget streak',
    suggestions: [
      'Check your Mon to Sun belt each evening to lock in a full 7-day week.',
      'Small daily surpluses quietly grow into thousands by year end.',
    ],
  },
  {
    id: 'streak_7',
    icon: 'shield',
    badge: '7-DAY STREAK',
    title: 'Full week streak unlocked!',
    subtitle: 'Seven straight days of mindful spending and saving.',
    unlockHint: 'Keep a 7-day budget streak',
    suggestions: [
      'Reward yourself from your Treat fund instead of dipping into savings.',
      'You built the core habit! Consider raising your monthly goal by +₱500.',
    ],
    actionLabel: 'Raise Goal +₱500',
    actionType: 'boost_goal_500',
  },
  {
    id: 'treat_funded',
    icon: 'star',
    badge: 'TREAT READY',
    title: 'A Treat is 100% funded!',
    subtitle: 'You earned a completely guilt-free reward by saving ahead.',
    unlockHint: 'Fund any Treat to 100%',
    suggestions: [
      'Enjoy claiming your Treat knowing your bills and savings stayed safe!',
      'Pick your next Treat goal right after, or send extra cash straight to Savings.',
    ],
    actionLabel: 'Claim in Treats',
    actionType: 'open_treats',
  },
];

/**
 * Returns every milestone ID whose condition is currently satisfied.
 */
export function evaluateMilestones(input: CoachStateInput): string[] {
  const earned: string[] = [];
  const goal = input.settings.monthlySavingsGoal;

  if (input.monthlySaved > 0) earned.push('first_save');
  if (
    input.entries.some(
      (e) => e.type === 'treat_direct' || e.type === 'impulse_skipped'
    ) ||
    input.treats.some((t) => t.funded > 0)
  ) {
    earned.push('first_treat_fund');
  }
  if (input.monthlySaved >= 1000) earned.push('saved_1k');
  if (goal > 0 && input.monthlySaved >= goal * 0.5) earned.push('goal_50');
  if (input.monthlySaved >= 5000) earned.push('saved_5k');
  if (goal > 0 && input.monthlySaved >= goal) earned.push('goal_100');
  if (input.streakDays >= 3) earned.push('streak_3');
  if (input.streakDays >= 7) earned.push('streak_7');
  if (input.treats.some((t) => t.target > 0 && t.funded >= t.target)) {
    earned.push('treat_funded');
  }

  return earned;
}

/**
 * Returns the next newly achieved milestone not yet in `alreadyUnlocked`.
 */
export function detectNextUnlockedMilestone(
  input: CoachStateInput,
  alreadyUnlocked: string[]
): MilestoneDefinition | null {
  const earnedSet = new Set(evaluateMilestones(input));
  const seenSet = new Set(alreadyUnlocked);

  for (const milestone of ALL_MILESTONES) {
    if (earnedSet.has(milestone.id) && !seenSet.has(milestone.id)) {
      return milestone;
    }
  }
  return null;
}
