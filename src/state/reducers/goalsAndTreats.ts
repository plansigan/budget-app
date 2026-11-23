import {
  SinkingFundItem,
  TransactionEntry,
  TreatVaultItem,
} from '../../types/budget';
import { getTodayKey, roundCurrency } from '../budgetMath';
import { makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleGoalsAndTreatsAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'UNLOCK_MILESTONE':
      if (state.unlockedMilestones.includes(action.milestoneId)) {
        return state;
      }
      return {
        ...state,
        unlockedMilestones: [...state.unlockedMilestones, action.milestoneId],
      };

    case 'BOOST_SAVINGS_GOAL': {
      const cleanDelta = roundCurrency(Math.max(0, action.delta));
      if (cleanDelta <= 0) return state;
      return {
        ...state,
        settings: {
          ...state.settings,
          monthlySavingsGoal: roundCurrency(
            state.settings.monthlySavingsGoal + cleanDelta
          ),
        },
      };
    }

    case 'FUND_ACTIVE_TREAT': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const activeUnclaimed =
        state.treats.find((t) => t.id === state.activeTreatId && !t.claimed) ||
        state.treats.find((t) => !t.claimed);

      if (!activeUnclaimed) return state;

      const remainingNeeded = Math.max(
        0,
        roundCurrency(activeUnclaimed.target - activeUnclaimed.funded)
      );
      if (remainingNeeded <= 0) return state;

      const actualAmount = roundCurrency(Math.min(cleanAmount, remainingNeeded));
      const isToday = targetDateKey === todayKey;
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;

      const entry: TransactionEntry = {
        id: makeUid('treat'),
        type: 'treat_direct',
        amount: actualAmount,
        label: activeUnclaimed.name,
        icon: activeUnclaimed.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        treatId: activeUnclaimed.id,
      };

      return {
        ...state,
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
        disciplineScore: Math.min(999, state.disciplineScore + 10),
        treats: state.treats.map((t) =>
          t.id === activeUnclaimed.id
            ? {
                ...t,
                funded: roundCurrency(t.funded + actualAmount),
                fromImpulses: roundCurrency(t.fromImpulses + actualAmount),
              }
            : t
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'CLAIM_TREAT': {
      const target = state.treats.find((t) => t.id === action.treatId);
      if (!target || target.funded < target.target || target.claimed) {
        return state;
      }
      const updatedTreats = state.treats.map((t) =>
        t.id === action.treatId ? { ...t, claimed: true } : t
      );
      const nextUnclaimed = updatedTreats.find((t) => !t.claimed);
      return {
        ...state,
        disciplineScore: Math.min(999, state.disciplineScore + 25),
        treats: updatedTreats,
        activeTreatId: nextUnclaimed ? nextUnclaimed.id : state.activeTreatId,
      };
    }

    case 'ADD_TREAT': {
      if (state.treats.length >= 3) return state;
      const trimmed = action.name.trim();
      const cleanTarget = roundCurrency(action.target);
      if (!trimmed || cleanTarget <= 0) return state;

      const newId = `treat-${Date.now()}`;
      const newItem: TreatVaultItem = {
        id: newId,
        name: trimmed,
        icon: action.icon,
        target: cleanTarget,
        funded: 0,
        fromImpulses: 0,
        fromRollovers: 0,
        claimed: false,
      };
      return {
        ...state,
        activeTreatId: newId,
        treats: [newItem, ...state.treats],
      };
    }

    case 'DELETE_TREAT': {
      const target = state.treats.find((t) => t.id === action.treatId);
      if (!target) return state;
      const refundToSavings = target.claimed ? 0 : roundCurrency(target.funded);
      const remaining = state.treats.filter((t) => t.id !== action.treatId);
      const nextActive =
        state.activeTreatId === action.treatId
          ? remaining.find((t) => !t.claimed)?.id || remaining[0]?.id || ''
          : state.activeTreatId;

      return {
        ...state,
        monthlySaved: roundCurrency(state.monthlySaved + refundToSavings),
        treats: remaining,
        activeTreatId: nextActive,
      };
    }

    case 'SET_ACTIVE_TREAT':
      return { ...state, activeTreatId: action.treatId };

    case 'ADD_SINKING_FUND': {
      const trimmed = action.name.trim();
      const cleanTarget = roundCurrency(action.target);
      if (!trimmed || cleanTarget <= 0) return state;
      const newFund: SinkingFundItem = {
        id: makeUid('sf'),
        name: trimmed,
        icon: action.icon || 'shield',
        target: cleanTarget,
        saved: 0,
        monthsToGoal: Math.max(
          1,
          Math.min(120, Math.round(action.monthsToGoal || 6))
        ),
      };
      return { ...state, sinkingFunds: [...state.sinkingFunds, newFund] };
    }

    case 'DEPOSIT_TO_SINKING_FUND': {
      const cleanAmt = roundCurrency(Math.max(0.01, action.amount));
      const target = state.sinkingFunds.find((f) => f.id === action.id);
      if (!target) return state;

      const entry: TransactionEntry = {
        id: makeUid('sf-dep'),
        type: 'sinking_fund',
        amount: cleanAmt,
        label: `${target.name} Fund`,
        icon: target.icon,
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        sinkingFundId: target.id,
        treatId: target.id,
      };

      return {
        ...state,
        sinkingFunds: state.sinkingFunds.map((f) =>
          f.id === action.id
            ? { ...f, saved: roundCurrency(f.saved + cleanAmt) }
            : f
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'DELETE_SINKING_FUND': {
      const target = state.sinkingFunds.find((f) => f.id === action.id);
      if (!target) return state;
      const refund = Math.max(0, roundCurrency(target.saved));
      return {
        ...state,
        monthlySaved: roundCurrency(state.monthlySaved + refund),
        sinkingFunds: state.sinkingFunds.filter((f) => f.id !== action.id),
      };
    }

    default:
      return undefined;
  }
};
