import {
  SinkingFundItem,
  TransactionEntry,
  TreatVaultItem,
  WantToBuyItem,
} from '../../types/budget';
import { addDaysToDateKey, getTodayKey, roundCurrency } from '../budgetMath';
import {
  applyDaytimeCheckIn,
  applyWalletDelta,
  findActiveUnclaimedTreat,
  makeUid,
} from './helpers';
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
      if (!Number.isFinite(action.delta)) return state;
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
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const activeUnclaimed = findActiveUnclaimedTreat(
        state.treats,
        state.activeTreatId
      );

      if (!activeUnclaimed) return state;

      const remainingNeeded = Math.max(
        0,
        roundCurrency(activeUnclaimed.target - activeUnclaimed.funded)
      );
      if (remainingNeeded <= 0) return state;

      const actualAmount = roundCurrency(Math.min(cleanAmount, remainingNeeded));
      const isToday = targetDateKey === todayKey;
      const checkIn = applyDaytimeCheckIn(state, isToday);

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
        checkedInToday: checkIn.checkedInToday,
        streakDays: checkIn.streakDays,
        bufferShields: checkIn.bufferShields,
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
      if (state.treats.length >= 3 || !Number.isFinite(action.target)) {
        return state;
      }
      const trimmed = action.name.trim();
      const cleanTarget = roundCurrency(action.target);
      if (!trimmed || cleanTarget <= 0) return state;

      const newId = makeUid('treat');
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
      if (!Number.isFinite(action.target)) return state;
      const cleanTarget = roundCurrency(action.target);
      if (!trimmed || cleanTarget <= 0) return state;
      const months = Number.isFinite(action.monthsToGoal)
        ? Math.max(1, Math.min(120, Math.round(action.monthsToGoal || 6)))
        : 6;
      const newFund: SinkingFundItem = {
        id: makeUid('sf'),
        name: trimmed,
        icon: action.icon || 'shield',
        target: cleanTarget,
        saved: 0,
        monthsToGoal: months,
      };
      return { ...state, sinkingFunds: [...state.sinkingFunds, newFund] };
    }

    case 'DEPOSIT_TO_SINKING_FUND': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state;
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

    case 'ADD_WANT_TO_BUY': {
      const trimmedName = action.name.trim();
      if (!Number.isFinite(action.price)) return state;
      const cleanPrice = roundCurrency(action.price);
      if (!trimmedName || cleanPrice <= 0) return state;

      const todayKey = action.todayKey || getTodayKey();
      const coolDays =
        typeof action.coolOffDays === 'number' &&
        Number.isFinite(action.coolOffDays)
          ? Math.max(1, Math.min(90, Math.round(action.coolOffDays)))
          : 7;
      const trimmedNote = action.note?.trim();

      const newItem: WantToBuyItem = {
        id: makeUid('wtb'),
        name: trimmedName,
        price: cleanPrice,
        icon: action.icon || 'shopping-bag',
        ...(trimmedNote ? { note: trimmedNote } : {}),
        createdAt: todayKey,
        reevaluateOn: addDaysToDateKey(todayKey, coolDays),
        status: 'waiting',
      };

      return {
        ...state,
        wantToBuyItems: [newItem, ...(state.wantToBuyItems || [])],
      };
    }

    case 'EXTEND_WANT_TO_BUY': {
      const items = state.wantToBuyItems || [];
      const target = items.find(
        (w) => w.id === action.id && w.status === 'waiting'
      );
      if (!target) return state;

      const todayKey = action.todayKey || getTodayKey();
      const extraDays =
        typeof action.extraDays === 'number' &&
        Number.isFinite(action.extraDays)
          ? Math.max(1, Math.min(90, Math.round(action.extraDays)))
          : 7;
      const nextDate = addDaysToDateKey(todayKey, extraDays);

      return {
        ...state,
        wantToBuyItems: items.map((w) =>
          w.id === action.id ? { ...w, reevaluateOn: nextDate } : w
        ),
      };
    }

    case 'SKIP_WANT_TO_BUY': {
      const items = state.wantToBuyItems || [];
      const target = items.find(
        (w) => w.id === action.id && w.status === 'waiting'
      );
      if (!target) return state;
      const todayKey = action.todayKey || getTodayKey();

      return {
        ...state,
        disciplineScore: Math.min(999, state.disciplineScore + 15),
        wantToBuyItems: items.map((w) =>
          w.id === action.id
            ? { ...w, status: 'skipped', resolvedAt: todayKey }
            : w
        ),
      };
    }

    case 'DELETE_WANT_TO_BUY': {
      const items = state.wantToBuyItems || [];
      if (!items.some((w) => w.id === action.id)) return state;
      return {
        ...state,
        wantToBuyItems: items.filter((w) => w.id !== action.id),
      };
    }

    case 'BUY_WANT_TO_BUY': {
      const items = state.wantToBuyItems || [];
      const target = items.find(
        (w) => w.id === action.id && w.status === 'waiting'
      );
      if (!target) return state;

      const todayKey = action.todayKey || getTodayKey();
      const chosenSourceId = action.paymentSourceId;
      const wallet = applyWalletDelta(
        state,
        chosenSourceId,
        'outflow',
        target.price
      );

      let nextMonthlySaved = state.monthlySaved;
      let nextFunds = state.sinkingFunds;
      let nextCheckedIn = state.checkedInToday;
      let nextStreak = state.streakDays;
      let nextShields = state.bufferShields;
      let entry: TransactionEntry;

      if (action.fundingChoice === 'daily') {
        const checkIn = applyDaytimeCheckIn(state, true);
        nextCheckedIn = checkIn.checkedInToday;
        nextStreak = checkIn.streakDays;
        nextShields = checkIn.bufferShields;
        entry = {
          id: makeUid('wtb-buy'),
          type: 'spend',
          amount: target.price,
          label: target.name,
          icon: target.icon || 'shopping-bag',
          timestamp: new Date().toISOString(),
          dateKey: todayKey,
          category: action.category || 'shop',
          paymentSourceId: wallet.effectiveSourceId,
          paymentSourceLabel: wallet.sourceLabel,
          appliedWalletDelta: wallet.appliedDelta,
          wantToBuyId: target.id,
        };
      } else if (action.fundingChoice === 'sinking_fund') {
        const bucket = state.sinkingFunds.find(
          (f) => f.id === action.sinkingFundId
        );
        if (!bucket) return state;
        const deducted = roundCurrency(Math.min(bucket.saved, target.price));
        nextFunds = state.sinkingFunds.map((f) =>
          f.id === bucket.id
            ? { ...f, saved: Math.max(0, roundCurrency(f.saved - deducted)) }
            : f
        );
        entry = {
          id: makeUid('wtb-buy'),
          type: 'savings_spend',
          amount: target.price,
          label: `${target.name} (From ${bucket.name})`,
          icon: target.icon || 'shopping-bag',
          timestamp: new Date().toISOString(),
          dateKey: todayKey,
          paymentSourceId: wallet.effectiveSourceId,
          paymentSourceLabel: wallet.sourceLabel,
          appliedWalletDelta: wallet.appliedDelta,
          sinkingFundId: bucket.id,
          savingsDelta: deducted,
          wantToBuyId: target.id,
        };
      } else {
        const deducted = roundCurrency(
          Math.min(state.monthlySaved, target.price)
        );
        nextMonthlySaved = Math.max(
          0,
          roundCurrency(state.monthlySaved - deducted)
        );
        entry = {
          id: makeUid('wtb-buy'),
          type: 'savings_spend',
          amount: target.price,
          label: `${target.name} (From Savings Jar)`,
          icon: target.icon || 'shopping-bag',
          timestamp: new Date().toISOString(),
          dateKey: todayKey,
          paymentSourceId: wallet.effectiveSourceId,
          paymentSourceLabel: wallet.sourceLabel,
          appliedWalletDelta: wallet.appliedDelta,
          savingsDelta: deducted,
          wantToBuyId: target.id,
        };
      }

      return {
        ...state,
        cashOnHand: wallet.cashOnHand,
        banks: wallet.banks,
        creditCards: wallet.creditCards,
        lastPaymentSourceId: wallet.effectiveSourceId || state.lastPaymentSourceId,
        monthlySaved: nextMonthlySaved,
        sinkingFunds: nextFunds,
        checkedInToday: nextCheckedIn,
        streakDays: nextStreak,
        bufferShields: nextShields,
        wantToBuyItems: items.map((w) =>
          w.id === target.id
            ? {
                ...w,
                status: 'bought',
                resolvedAt: todayKey,
                fundingChoice: action.fundingChoice,
                ...(action.fundingChoice === 'sinking_fund' &&
                action.sinkingFundId
                  ? { sinkingFundId: action.sinkingFundId }
                  : {}),
              }
            : w
        ),
        entries: [entry, ...state.entries],
      };
    }

    default:
      return undefined;
  }
};
