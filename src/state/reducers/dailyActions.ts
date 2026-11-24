import { TransactionEntry } from '../../types/budget';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  parseDateKeyLocal,
  roundCurrency,
} from '../budgetMath';
import { applyMidnightRollover } from '../rollover';
import {
  allocateToTreatWithSpill,
  applyDaytimeCheckIn,
  applyWalletDelta,
  findActiveUnclaimedTreat,
  makeUid,
} from './helpers';
import { SliceReducer } from './types';

export const handleDailyActions: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'APPLY_ROLLOVER':
      return applyMidnightRollover(
        state,
        action.newDateKey,
        action.minimumSplitFallback ?? 0
      ).nextState;

    case 'LOG_SPEND': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const requestedSourceId = action.paymentSourceId || 'cash';

      const movement = applyWalletDelta(
        state,
        requestedSourceId,
        'outflow',
        cleanAmount
      );

      const isToday = targetDateKey === todayKey;
      const checkIn = applyDaytimeCheckIn(state, isToday);

      const entry: TransactionEntry = {
        id: makeUid('spend'),
        type: 'spend',
        amount: cleanAmount,
        label: action.label.trim() || 'Expense',
        icon: action.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: action.category,
        paymentSourceId: movement.effectiveSourceId,
        paymentSourceLabel: movement.sourceLabel,
        appliedWalletDelta: movement.appliedDelta,
      };

      return {
        ...state,
        cashOnHand: movement.cashOnHand,
        banks: movement.banks,
        creditCards: movement.creditCards,
        lastPaymentSourceId:
          movement.effectiveSourceId || state.lastPaymentSourceId,
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
        entries: [entry, ...state.entries],
      };
    }

    case 'SAVE_TO_JAR': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const baseDaily = computeBaseDailyAllowance(
        state.settings,
        getBudgetedInstallmentsTotal(state.installments) +
          getTotalMonthlyEnvelopes(
            state.envelopes || [],
            state.settings.salaryFrequency
          ),
        parseDateKeyLocal(targetDateKey)
      );
      const daySummary = computeDayMetricsFromEntries(
        state.entries,
        targetDateKey,
        baseDaily,
        state.rolloverBalance,
        todayKey,
        state.lastActiveDate
      );
      const take = roundCurrency(
        Math.min(cleanAmount, Math.max(0, daySummary.safeRemaining))
      );
      if (take <= 0) return state;

      const isToday = targetDateKey === todayKey;
      const checkIn = applyDaytimeCheckIn(state, isToday);
      const entry: TransactionEntry = {
        id: makeUid('save'),
        type: 'save_direct',
        amount: take,
        label: 'Direct to Savings Jar',
        icon: 'briefcase',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
      };

      return {
        ...state,
        monthlySaved: roundCurrency(state.monthlySaved + take),
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
        disciplineScore: Math.min(999, state.disciplineScore + 10),
        entries: [entry, ...state.entries],
      };
    }

    case 'BANK_TODAY_SURPLUS': {
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const baseDaily = computeBaseDailyAllowance(
        state.settings,
        getBudgetedInstallmentsTotal(state.installments) +
          getTotalMonthlyEnvelopes(
            state.envelopes || [],
            state.settings.salaryFrequency
          ),
        parseDateKeyLocal(targetDateKey)
      );
      const daySummary = computeDayMetricsFromEntries(
        state.entries,
        targetDateKey,
        baseDaily,
        state.rolloverBalance,
        todayKey,
        state.lastActiveDate
      );
      const remaining = Math.max(0, roundCurrency(daySummary.safeRemaining));
      if (remaining <= 0) return state;

      const activeUnclaimed = findActiveUnclaimedTreat(
        state.treats,
        state.activeTreatId
      );
      const rawToSavings = activeUnclaimed
        ? roundCurrency(remaining * 0.5)
        : remaining;
      const rawToTreat = activeUnclaimed
        ? roundCurrency(remaining - rawToSavings)
        : 0;

      const treatAllocation = allocateToTreatWithSpill(
        state.treats,
        state.activeTreatId,
        rawToTreat,
        'fromRollovers'
      );
      const toTreat = treatAllocation.treatAdded;
      const toSavings = roundCurrency(
        rawToSavings + treatAllocation.spillToSavings
      );

      const isToday = targetDateKey === todayKey;
      const checkIn = applyDaytimeCheckIn(state, isToday);
      const entry: TransactionEntry = {
        id: makeUid('bank'),
        type: 'midnight_split',
        amount: toTreat,
        label:
          toTreat > 0 ? 'End Day & Save (50/50)' : 'End Day & Save to Jar',
        icon: 'moon',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        treatId: toTreat > 0 ? treatAllocation.targetTreatId : undefined,
        savingsDelta: toSavings,
      };

      return {
        ...state,
        monthlySaved: roundCurrency(state.monthlySaved + toSavings),
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
        disciplineScore: Math.min(999, state.disciplineScore + 20),
        treats: treatAllocation.nextTreats,
        entries: [entry, ...state.entries],
      };
    }

    default:
      return undefined;
  }
};
