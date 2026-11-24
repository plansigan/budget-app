import { MonthlyArchiveSnapshot, TransactionEntry } from '../types/budget';
import { computeMonthlyWrapUp } from '../utils/insightsEngine';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTotalMonthlyEnvelopes,
  parseDateKeyLocal,
  roundCurrency,
} from './budgetMath';
import { PersistedBudgetState } from './defaults';
import { allocateToTreatWithSpill, makeUid } from './reducers/helpers';

/**
 * Shared midnight 50/50 split helper used on real calendar rollover and demo testing.
 */
export function applyMidnightRollover(
  prev: PersistedBudgetState,
  newDateKey: string,
  minimumSplitFallback: number
): { nextState: PersistedBudgetState; vaultAdded: number; rolloverNext: number } {
  const prevKey = prev.lastActiveDate || newDateKey;
  const prevDateObj = parseDateKeyLocal(prevKey);
  const baseDaily = computeBaseDailyAllowance(
    prev.settings,
    getBudgetedInstallmentsTotal(prev.installments || []) +
      getTotalMonthlyEnvelopes(
        prev.envelopes || [],
        prev.settings.salaryFrequency
      ),
    prevDateObj
  );
  const prevSummary = computeDayMetricsFromEntries(
    prev.entries,
    prevKey,
    baseDaily,
    prev.rolloverBalance,
    prevKey,
    prevKey
  );
  const currentSafe = Math.max(0, prevSummary.safeRemaining);
  const unspent = currentSafe > 0 ? currentSafe : minimumSplitFallback;

  const vaultAdded = roundCurrency(unspent * 0.5);
  const rolloverNext = roundCurrency(unspent - vaultAdded);

  const daysElapsed = Math.max(
    0,
    Math.round(
      (parseDateKeyLocal(newDateKey).getTime() - prevDateObj.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  let nextStreak = prev.streakDays;
  let nextShields = prev.bufferShields;

  if (prev.checkedInToday) {
    // Daytime first action already incremented streakDays & awarded any 7-day buffer shield.
  } else if (currentSafe > 0) {
    nextStreak += 1;
    if (nextStreak % 7 === 0) {
      nextShields += 1;
    }
  } else if (nextShields > 0) {
    nextShields -= 1;
  } else {
    nextStreak = 0;
  }

  if (daysElapsed > 1) {
    const missedDays = daysElapsed - 1;
    if (nextShields >= missedDays) {
      nextShields -= missedDays;
    } else {
      nextShields = 0;
      nextStreak = 0;
    }
  }

  const nextScore = Math.min(999, prev.disciplineScore + (unspent > 0 ? 10 : 0));
  const treatAllocation = allocateToTreatWithSpill(
    prev.treats,
    prev.activeTreatId,
    vaultAdded,
    'fromRollovers'
  );
  const nextTreats = treatAllocation.nextTreats;
  const treatAdded = treatAllocation.treatAdded;
  const spillToSavings = treatAllocation.spillToSavings;
  const targetTreatId = treatAllocation.targetTreatId;
  let nextMonthlySaved = roundCurrency(prev.monthlySaved + spillToSavings);

  const splitLabel =
    treatAdded > 0 && spillToSavings > 0
      ? 'Midnight 50/50 (Treat + Jar)'
      : treatAdded > 0
      ? 'Midnight 50/50 Unspent Split'
      : 'Midnight 50/50 to Savings Jar';

  const newEntry: TransactionEntry | null =
    vaultAdded > 0 || rolloverNext > 0
      ? {
          id: makeUid('split'),
          type: 'midnight_split',
          amount: treatAdded,
          label: splitLabel,
          icon: 'moon',
          timestamp: new Date().toISOString(),
          dateKey: prevKey,
          treatId: treatAdded > 0 ? targetTreatId : undefined,
          savingsDelta: spillToSavings,
          rolloverDelta: rolloverNext,
          isAutoRollover: true,
        }
      : null;

  const nextEntries = newEntry ? [newEntry, ...prev.entries] : prev.entries;
  let nextArchives = Array.isArray(prev.monthlyArchives)
    ? [...prev.monthlyArchives]
    : [];

  const prevMonthKey = prevKey.slice(0, 7);
  const newMonthKey = newDateKey.slice(0, 7);
  if (prevMonthKey !== newMonthKey && /^\d{4}-\d{2}$/.test(prevMonthKey)) {
    const wrap = computeMonthlyWrapUp({
      settings: prev.settings,
      monthlySaved: nextMonthlySaved,
      entries: nextEntries,
      streakDays: nextStreak,
      disciplineScore: nextScore,
      monthKey: prevMonthKey,
      now: prevDateObj,
    });
    const snapshot: MonthlyArchiveSnapshot = {
      monthKey: prevMonthKey,
      monthTitle: wrap.monthTitle,
      totalSpent: wrap.totalSpent,
      totalSaved: wrap.totalSaved,
      savingsRatePct: wrap.savingsRatePct,
      monthlyIncome: prev.settings.monthlyIncome,
      monthlySavingsGoal: prev.settings.monthlySavingsGoal,
      streakDays: wrap.streakDays,
      disciplineScore: wrap.disciplineScore,
      topCategoryLabel: wrap.topCategoryLabel,
      topCategoryAmount: wrap.topCategoryAmount,
      topSourceLabel: wrap.topSourceLabel,
      txCount: wrap.txCount,
      grade: wrap.grade,
      headline: wrap.headline,
    };
    nextArchives = [
      snapshot,
      ...nextArchives.filter((a) => a.monthKey !== prevMonthKey),
    ];
    nextMonthlySaved = 0;
  }

  return {
    vaultAdded,
    rolloverNext,
    nextState: {
      ...prev,
      monthlySaved: nextMonthlySaved,
      rolloverBalance: rolloverNext,
      checkedInToday: false,
      lastActiveDate: newDateKey,
      streakDays: nextStreak,
      bufferShields: nextShields,
      disciplineScore: nextScore,
      treats: nextTreats,
      entries: nextEntries,
      monthlyArchives: nextArchives,
    },
  };
}
