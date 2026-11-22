import {
  BankAccount,
  BillItem,
  BudgetSettings,
  CreditCardAccount,
  EnvelopeCadence,
  EnvelopeRolloverMode,
  InstallmentItem,
  SinkingFundItem,
  SpendCategoryKey,
  SpendingEnvelopeItem,
  ThemeMode,
  TransactionEntry,
  TreatVaultItem,
} from '../types/budget';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  roundCurrency,
  sumBills,
} from './budgetMath';
import {
  OnboardingParams,
  PersistedBudgetState,
  createDemoState,
  createNewUserState,
} from './defaults';
import { normalizePersistedState } from './persistence';
import { applyMidnightRollover } from './rollover';

export type BudgetAction =
  | { type: 'HYDRATE'; state: PersistedBudgetState }
  | {
      type: 'APPLY_ROLLOVER';
      newDateKey: string;
      minimumSplitFallback?: number;
    }
  | { type: 'UNLOCK_MILESTONE'; milestoneId: string }
  | { type: 'BOOST_SAVINGS_GOAL'; delta: number }
  | {
      type: 'LOG_SPEND';
      amount: number;
      label: string;
      icon: string;
      paymentSourceId: string;
      category?: SpendCategoryKey;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'FUND_ACTIVE_TREAT';
      amount: number;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'SAVE_TO_JAR';
      amount: number;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'BANK_TODAY_SURPLUS';
      dateKey: string;
      todayKey?: string;
    }
  | { type: 'CLAIM_TREAT'; treatId: string }
  | { type: 'ADD_TREAT'; name: string; icon: string; target: number }
  | { type: 'DELETE_TREAT'; treatId: string }
  | { type: 'SET_ACTIVE_TREAT'; treatId: string }
  | { type: 'UNDO_ENTRY'; entryId: string }
  | {
      type: 'UPDATE_BUDGET_CONFIG';
      income: number;
      bills: number;
      savings: number;
    }
  | {
      type: 'UPDATE_SALARY_SCHEDULE';
      frequency: 1 | 2;
      payday1: number;
      payday2: number;
    }
  | { type: 'UPDATE_BILL_AMOUNT'; billId: string; amount: number }
  | {
      type: 'UPDATE_BILL_ITEM';
      billId: string;
      name: string;
      icon: string;
      amount: number;
      dueDay?: number;
    }
  | {
      type: 'ADD_BILL_ITEM';
      name: string;
      icon: string;
      amount: number;
      dueDay?: number;
    }
  | { type: 'UPDATE_BILL_DUE_DAY'; billId: string; dueDay?: number }
  | {
      type: 'MARK_BILL_PAID';
      billId: string;
      paymentSourceId?: string;
      amountOverride?: number;
      todayKey?: string;
    }
  | { type: 'REMOVE_BILL_ITEM'; billId: string }
  | {
      type: 'DEPOSIT_TO_WALLET';
      sourceId: string;
      amount: number;
      note?: string;
      todayKey?: string;
    }
  | {
      type: 'SET_ACCOUNT_BALANCE';
      sourceId: string;
      newBalance: number;
      note?: string;
      todayKey?: string;
    }
  | { type: 'ADD_BANK'; name: string; balance: number }
  | { type: 'UPDATE_BANK'; bankId: string; name: string }
  | { type: 'REMOVE_BANK'; bankId: string }
  | {
      type: 'ADD_CREDIT_CARD';
      name: string;
      limit: number;
      used: number;
      cutoffDay: number;
    }
  | {
      type: 'UPDATE_CREDIT_CARD';
      cardId: string;
      name: string;
      limit: number;
      cutoffDay: number;
    }
  | { type: 'REMOVE_CREDIT_CARD'; cardId: string }
  | { type: 'COMPLETE_ONBOARDING'; params: OnboardingParams }
  | { type: 'REOPEN_ONBOARDING' }
  | { type: 'CANCEL_REOPENED_ONBOARDING' }
  | { type: 'COMPLETE_TUTORIAL' }
  | { type: 'OPEN_TUTORIAL' }
  | { type: 'RESET_NEW_USER'; todayKey?: string }
  | { type: 'RESET_DEMO'; todayKey?: string }
  | { type: 'TOGGLE_PRIVACY_MODE' }
  | { type: 'SET_THEME_MODE'; mode: ThemeMode }
  | {
      type: 'LOG_PAYDAY_CHECKIN';
      amount: number;
      sourceId: string;
      savingsAllocation: number;
      note?: string;
      todayKey?: string;
      refillEnvelopeIds?: string[];
    }
  | { type: 'DISMISS_PAYDAY_PROMPT'; dateKey: string }
  | {
      type: 'ADD_ENVELOPE';
      name: string;
      icon: string;
      amountPerCycle: number;
      cadence: EnvelopeCadence;
      rolloverMode: EnvelopeRolloverMode;
    }
  | {
      type: 'UPDATE_ENVELOPE';
      id: string;
      name: string;
      icon: string;
      amountPerCycle: number;
      cadence: EnvelopeCadence;
      rolloverMode: EnvelopeRolloverMode;
      balance?: number;
    }
  | { type: 'DELETE_ENVELOPE'; id: string }
  | {
      type: 'SPEND_FROM_ENVELOPE';
      envelopeId: string;
      amount: number;
      label: string;
      icon: string;
      paymentSourceId?: string;
      category?: SpendCategoryKey;
      dateKey: string;
      todayKey?: string;
    }
  | { type: 'REFILL_ENVELOPE'; envelopeId: string; todayKey?: string }
  | {
      type: 'ADD_INSTALLMENT';
      params: {
        name: string;
        provider: string;
        monthlyAmount: number;
        totalMonths: number;
        paidMonths: number;
        includeInBudget: boolean;
      };
    }
  | {
      type: 'UPDATE_INSTALLMENT';
      id: string;
      params: {
        name: string;
        provider: string;
        monthlyAmount: number;
        totalMonths: number;
        paidMonths: number;
        includeInBudget: boolean;
      };
    }
  | { type: 'MARK_INSTALLMENT_PAID'; id: string; todayKey?: string }
  | { type: 'TOGGLE_INSTALLMENT_IN_BUDGET'; id: string }
  | { type: 'REMOVE_INSTALLMENT'; id: string }
  | {
      type: 'ADD_SINKING_FUND';
      name: string;
      icon: string;
      target: number;
      monthsToGoal: number;
    }
  | {
      type: 'DEPOSIT_TO_SINKING_FUND';
      id: string;
      amount: number;
      todayKey?: string;
    }
  | { type: 'DELETE_SINKING_FUND'; id: string }
  | { type: 'MARK_BACKUP_EXPORTED'; exportedAt: string }
  | { type: 'RESTORE_BACKUP'; data: Partial<PersistedBudgetState> }
  | {
      type: 'TRANSFER_BETWEEN_ACCOUNTS';
      fromSourceId: string;
      toSourceId: string;
      amount: number;
      note?: string;
      todayKey?: string;
    }
  | {
      type: 'EDIT_ENTRY';
      entryId: string;
      amount: number;
      label: string;
      category?: SpendCategoryKey;
      icon?: string;
    };

export function isEditableEntryType(entry: TransactionEntry): boolean {
  return (
    entry.type === 'spend' ||
    entry.type === 'envelope_spend' ||
    entry.type === 'bill_paid' ||
    entry.type === 'wallet_deposit' ||
    entry.type === 'save_direct' ||
    entry.type === 'treat_direct'
  );
}

export function isEditableEntry(
  state: PersistedBudgetState,
  entryId: string
): boolean {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target || !isEditableEntryType(target)) return false;
  if (target.type === 'treat_direct') {
    return canUndoEntry(state, entryId).ok;
  }
  return true;
}

export function canUndoEntry(
  state: PersistedBudgetState,
  entryId: string
): { ok: true } | { ok: false; reason: string } {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target) {
    return { ok: false, reason: 'Entry not found.' };
  }
  if (
    (target.type === 'treat_direct' ||
      target.type === 'impulse_skipped' ||
      target.type === 'midnight_split') &&
    target.treatId
  ) {
    const linkedTreat = state.treats.find((t) => t.id === target.treatId);
    if (linkedTreat && linkedTreat.claimed) {
      return {
        ok: false,
        reason: 'Cannot undo entries for an already-claimed treat.',
      };
    }
  }
  return { ok: true };
}

function makeUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function budgetReducer(
  state: PersistedBudgetState,
  action: BudgetAction
): PersistedBudgetState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'APPLY_ROLLOVER':
      return applyMidnightRollover(
        state,
        action.newDateKey,
        action.minimumSplitFallback ?? 0
      ).nextState;

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

    case 'LOG_SPEND': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const paymentSourceId = action.paymentSourceId || 'cash';

      let sourceLabel = 'Cash';
      if (paymentSourceId !== 'cash') {
        const matchedBank = state.banks.find((b) => b.id === paymentSourceId);
        const matchedCard = state.creditCards.find(
          (c) => c.id === paymentSourceId
        );
        if (matchedBank) sourceLabel = matchedBank.name;
        else if (matchedCard) sourceLabel = matchedCard.name;
      }

      const isToday = targetDateKey === todayKey;
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let appliedWalletDelta = cleanAmount;

      if (paymentSourceId === 'cash') {
        nextCash = Math.max(0, roundCurrency(state.cashOnHand - cleanAmount));
        appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
      } else if (state.banks.some((b) => b.id === paymentSourceId)) {
        nextBanks = state.banks.map((b) => {
          if (b.id !== paymentSourceId) return b;
          const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
          appliedWalletDelta = roundCurrency(b.balance - nextBal);
          return { ...b, balance: nextBal };
        });
      } else if (state.creditCards.some((c) => c.id === paymentSourceId)) {
        nextCards = state.creditCards.map((c) =>
          c.id === paymentSourceId
            ? { ...c, used: roundCurrency(c.used + cleanAmount) }
            : c
        );
        appliedWalletDelta = cleanAmount;
      }

      const entry: TransactionEntry = {
        id: makeUid('spend'),
        type: 'spend',
        amount: cleanAmount,
        label: action.label.trim() || 'Expense',
        icon: action.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: action.category,
        paymentSourceId,
        paymentSourceLabel: sourceLabel,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        lastPaymentSourceId: paymentSourceId,
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
        entries: [entry, ...state.entries],
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

    case 'SAVE_TO_JAR': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const baseDaily = computeBaseDailyAllowance(
        state.settings,
        getBudgetedInstallmentsTotal(state.installments) +
          getTotalMonthlyEnvelopes(
            state.envelopes || [],
            state.settings.salaryFrequency
          )
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
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;
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
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
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
          )
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

      const activeUnclaimed =
        state.treats.find((t) => t.id === state.activeTreatId && !t.claimed) ||
        state.treats.find((t) => !t.claimed);

      const toSavings = activeUnclaimed
        ? roundCurrency(remaining * 0.5)
        : remaining;
      const toTreat = activeUnclaimed
        ? roundCurrency(remaining - toSavings)
        : 0;

      const isToday = targetDateKey === todayKey;
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;
      const entry: TransactionEntry = {
        id: makeUid('bank'),
        type: 'midnight_split',
        amount: toTreat,
        label: activeUnclaimed
          ? 'End Day & Save (50/50)'
          : 'End Day & Save to Jar',
        icon: 'moon',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        treatId: activeUnclaimed ? activeUnclaimed.id : undefined,
        savingsDelta: toSavings,
      };

      return {
        ...state,
        monthlySaved: roundCurrency(state.monthlySaved + toSavings),
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
        disciplineScore: Math.min(999, state.disciplineScore + 20),
        treats: activeUnclaimed
          ? state.treats.map((t) =>
              t.id === activeUnclaimed.id
                ? {
                    ...t,
                    funded: roundCurrency(t.funded + toTreat),
                    fromRollovers: roundCurrency(t.fromRollovers + toTreat),
                  }
                : t
            )
          : state.treats,
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

    case 'UNDO_ENTRY': {
      const check = canUndoEntry(state, action.entryId);
      if (!check.ok) return state;
      const freshTarget = state.entries.find((e) => e.id === action.entryId);
      if (!freshTarget) return state;

      let nextSaved = state.monthlySaved;
      let nextRollover = state.rolloverBalance;
      let nextScore = state.disciplineScore;
      let nextTreats = state.treats;
      let nextInstallments = state.installments;
      let nextSinkingFunds = state.sinkingFunds;
      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let nextBillItems = state.billItems;
      let nextEnvelopes = state.envelopes || [];
      let nextLastPaydayCheckInKey = state.lastPaydayCheckInKey;

      if (freshTarget.type === 'spend') {
        const src = freshTarget.paymentSourceId;
        const restoreAmt =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : freshTarget.amount;
        if (src === 'cash') {
          nextCash = roundCurrency(state.cashOnHand + restoreAmt);
        } else if (src && state.banks.some((b) => b.id === src)) {
          nextBanks = state.banks.map((b) =>
            b.id === src
              ? { ...b, balance: roundCurrency(b.balance + restoreAmt) }
              : b
          );
        } else if (src && state.creditCards.some((c) => c.id === src)) {
          nextCards = state.creditCards.map((c) =>
            c.id === src
              ? { ...c, used: Math.max(0, roundCurrency(c.used - restoreAmt)) }
              : c
          );
        }
      } else if (freshTarget.type === 'save_direct') {
        nextSaved = Math.max(
          0,
          roundCurrency(state.monthlySaved - freshTarget.amount)
        );
        nextScore = Math.max(700, state.disciplineScore - 10);
      } else if (
        freshTarget.type === 'treat_direct' ||
        freshTarget.type === 'impulse_skipped'
      ) {
        nextScore = Math.max(
          700,
          state.disciplineScore - (freshTarget.type === 'treat_direct' ? 10 : 15)
        );
        if (
          freshTarget.treatId &&
          state.treats.some((t) => t.id === freshTarget.treatId)
        ) {
          nextTreats = state.treats.map((t) =>
            t.id === freshTarget.treatId && !t.claimed
              ? {
                  ...t,
                  funded: Math.max(
                    0,
                    roundCurrency(t.funded - freshTarget.amount)
                  ),
                  fromImpulses: Math.max(
                    0,
                    roundCurrency(t.fromImpulses - freshTarget.amount)
                  ),
                }
              : t
          );
        } else {
          nextSaved = Math.max(
            0,
            roundCurrency(state.monthlySaved - freshTarget.amount)
          );
        }
      } else if (freshTarget.type === 'midnight_split') {
        const scorePenalty =
          !freshTarget.isAutoRollover &&
          typeof freshTarget.savingsDelta === 'number'
            ? 20
            : 10;
        nextScore = Math.max(700, state.disciplineScore - scorePenalty);
        if (typeof freshTarget.rolloverDelta === 'number') {
          nextRollover = Math.max(
            0,
            roundCurrency(state.rolloverBalance - freshTarget.rolloverDelta)
          );
        }
        if (typeof freshTarget.savingsDelta === 'number') {
          nextSaved = Math.max(
            0,
            roundCurrency(state.monthlySaved - freshTarget.savingsDelta)
          );
        }
        if (
          freshTarget.treatId &&
          state.treats.some((t) => t.id === freshTarget.treatId)
        ) {
          nextTreats = state.treats.map((t) =>
            t.id === freshTarget.treatId && !t.claimed
              ? {
                  ...t,
                  funded: Math.max(
                    0,
                    roundCurrency(t.funded - freshTarget.amount)
                  ),
                  fromRollovers: Math.max(
                    0,
                    roundCurrency(t.fromRollovers - freshTarget.amount)
                  ),
                }
              : t
          );
        } else {
          nextSaved = Math.max(
            0,
            roundCurrency(nextSaved - freshTarget.amount)
          );
        }
      } else if (freshTarget.type === 'wallet_deposit') {
        const src = freshTarget.paymentSourceId;
        const reverseAmt =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : freshTarget.amount;
        if (src === 'cash') {
          nextCash = Math.max(0, roundCurrency(state.cashOnHand - reverseAmt));
        } else if (src && state.banks.some((b) => b.id === src)) {
          nextBanks = state.banks.map((b) =>
            b.id === src
              ? {
                  ...b,
                  balance: Math.max(0, roundCurrency(b.balance - reverseAmt)),
                }
              : b
          );
        } else if (src && state.creditCards.some((c) => c.id === src)) {
          nextCards = state.creditCards.map((c) =>
            c.id === src
              ? { ...c, used: roundCurrency(c.used + reverseAmt) }
              : c
          );
        }
        if (freshTarget.isPaydayCheckIn) {
          if (
            typeof freshTarget.savingsDelta === 'number' &&
            freshTarget.savingsDelta > 0
          ) {
            nextSaved = Math.max(
              0,
              roundCurrency(nextSaved - freshTarget.savingsDelta)
            );
          }
          nextScore = Math.max(700, nextScore - 15);
          nextLastPaydayCheckInKey = freshTarget.previousPaydayCheckInKey || '';
          if (
            Array.isArray(freshTarget.refilledEnvelopeSnapshots) &&
            freshTarget.refilledEnvelopeSnapshots.length > 0
          ) {
            const snapMap = new Map(
              freshTarget.refilledEnvelopeSnapshots.map((s) => [s.id, s])
            );
            nextEnvelopes = nextEnvelopes.map((env) => {
              const snap = snapMap.get(env.id);
              return snap
                ? {
                    ...env,
                    balance: snap.previousBalance,
                    lastRefillKey: snap.previousRefillKey,
                  }
                : env;
            });
          }
        }
      } else if (freshTarget.type === 'wallet_adjust') {
        const src = freshTarget.paymentSourceId;
        const delta = freshTarget.signedDelta || 0;
        if (src === 'cash') {
          nextCash = Math.max(0, roundCurrency(state.cashOnHand - delta));
        } else if (src && state.banks.some((b) => b.id === src)) {
          nextBanks = state.banks.map((b) =>
            b.id === src
              ? {
                  ...b,
                  balance: Math.max(0, roundCurrency(b.balance - delta)),
                }
              : b
          );
        } else if (src && state.creditCards.some((c) => c.id === src)) {
          nextCards = state.creditCards.map((c) =>
            c.id === src
              ? { ...c, used: Math.max(0, roundCurrency(c.used - delta)) }
              : c
          );
        }
      } else if (freshTarget.type === 'installment_paid') {
        if (freshTarget.installmentId) {
          nextInstallments = state.installments.map((item) =>
            item.id === freshTarget.installmentId
              ? { ...item, paidMonths: Math.max(0, item.paidMonths - 1) }
              : item
          );
        }
      } else if (freshTarget.type === 'sinking_fund') {
        const targetFundId = freshTarget.sinkingFundId || freshTarget.treatId;
        if (targetFundId) {
          nextSinkingFunds = state.sinkingFunds.map((f) =>
            f.id === targetFundId
              ? {
                  ...f,
                  saved: Math.max(
                    0,
                    roundCurrency(f.saved - freshTarget.amount)
                  ),
                }
              : f
          );
        }
      } else if (freshTarget.type === 'bill_paid') {
        const src = freshTarget.paymentSourceId;
        const restoreAmt =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : freshTarget.amount;
        if (src === 'cash') {
          nextCash = roundCurrency(nextCash + restoreAmt);
        } else if (src && nextBanks.some((b) => b.id === src)) {
          nextBanks = nextBanks.map((b) =>
            b.id === src
              ? { ...b, balance: roundCurrency(b.balance + restoreAmt) }
              : b
          );
        } else if (src && nextCards.some((c) => c.id === src)) {
          nextCards = nextCards.map((c) =>
            c.id === src
              ? { ...c, used: Math.max(0, roundCurrency(c.used - restoreAmt)) }
              : c
          );
        }
        if (freshTarget.billId) {
          nextBillItems = nextBillItems.map((b) =>
            b.id === freshTarget.billId
              ? { ...b, lastPaidMonth: freshTarget.previousBillPaidMonth }
              : b
          );
        }
      } else if (freshTarget.type === 'envelope_spend') {
        const src = freshTarget.paymentSourceId;
        const restoreAmt =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : freshTarget.amount;
        if (src === 'cash') {
          nextCash = roundCurrency(nextCash + restoreAmt);
        } else if (src && nextBanks.some((b) => b.id === src)) {
          nextBanks = nextBanks.map((b) =>
            b.id === src
              ? { ...b, balance: roundCurrency(b.balance + restoreAmt) }
              : b
          );
        } else if (src && nextCards.some((c) => c.id === src)) {
          nextCards = nextCards.map((c) =>
            c.id === src
              ? { ...c, used: Math.max(0, roundCurrency(c.used - restoreAmt)) }
              : c
          );
        }
        if (freshTarget.envelopeId) {
          nextEnvelopes = nextEnvelopes.map((env) => {
            if (env.id !== freshTarget.envelopeId) return env;
            const restoredBal =
              typeof freshTarget.previousEnvelopeBalance === 'number'
                ? freshTarget.previousEnvelopeBalance
                : roundCurrency(env.balance + freshTarget.amount);
            return { ...env, balance: restoredBal };
          });
        }
      } else if (freshTarget.type === 'envelope_refill') {
        if (freshTarget.envelopeId) {
          nextEnvelopes = nextEnvelopes.map((env) => {
            if (env.id !== freshTarget.envelopeId) return env;
            const restoredBal =
              typeof freshTarget.previousEnvelopeBalance === 'number'
                ? freshTarget.previousEnvelopeBalance
                : Math.max(0, roundCurrency(env.balance - freshTarget.amount));
            return {
              ...env,
              balance: restoredBal,
              lastRefillKey: freshTarget.previousEnvelopeRefillKey,
            };
          });
        }
      } else if (freshTarget.type === 'wallet_transfer') {
        const fromId = freshTarget.paymentSourceId;
        const fromRestore =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : freshTarget.amount;
        if (fromId === 'cash') {
          nextCash = roundCurrency(nextCash + fromRestore);
        } else if (fromId && nextBanks.some((b) => b.id === fromId)) {
          nextBanks = nextBanks.map((b) =>
            b.id === fromId
              ? { ...b, balance: roundCurrency(b.balance + fromRestore) }
              : b
          );
        }

        const toId = freshTarget.toPaymentSourceId;
        const toReverse =
          typeof freshTarget.appliedToWalletDelta === 'number'
            ? freshTarget.appliedToWalletDelta
            : freshTarget.amount;
        if (toId === 'cash') {
          nextCash = Math.max(0, roundCurrency(nextCash - toReverse));
        } else if (toId && nextBanks.some((b) => b.id === toId)) {
          nextBanks = nextBanks.map((b) =>
            b.id === toId
              ? { ...b, balance: Math.max(0, roundCurrency(b.balance - toReverse)) }
              : b
          );
        } else if (toId && nextCards.some((c) => c.id === toId)) {
          nextCards = nextCards.map((c) =>
            c.id === toId
              ? { ...c, used: roundCurrency(c.used + toReverse) }
              : c
          );
        }
      }

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        billItems: nextBillItems,
        envelopes: nextEnvelopes,
        lastPaydayCheckInKey: nextLastPaydayCheckInKey,
        monthlySaved: nextSaved,
        rolloverBalance: nextRollover,
        disciplineScore: nextScore,
        treats: nextTreats,
        installments: nextInstallments,
        sinkingFunds: nextSinkingFunds,
        entries: state.entries.filter((e) => e.id !== action.entryId),
      };
    }

    case 'UPDATE_BUDGET_CONFIG':
      return {
        ...state,
        settings: {
          ...state.settings,
          monthlyIncome: roundCurrency(Math.max(0, action.income)),
          fixedBills: roundCurrency(Math.max(0, action.bills)),
          monthlySavingsGoal: roundCurrency(Math.max(0, action.savings)),
        },
      };

    case 'UPDATE_SALARY_SCHEDULE':
      return {
        ...state,
        settings: {
          ...state.settings,
          salaryFrequency: action.frequency,
          payday1: Math.max(1, Math.min(31, Math.round(action.payday1))),
          payday2: Math.max(1, Math.min(31, Math.round(action.payday2))),
        },
      };

    case 'UPDATE_BILL_AMOUNT': {
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      const nextBills = state.billItems.map((b) =>
        b.id === action.billId ? { ...b, amount: cleanAmount } : b
      );
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'UPDATE_BILL_ITEM': {
      const trimmed = action.name.trim();
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      if (!trimmed) return state;
      const cleanDue =
        typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
          ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
          : undefined;
      const nextBills = state.billItems.map((b) =>
        b.id === action.billId
          ? {
              ...b,
              name: trimmed,
              icon: action.icon || b.icon,
              amount: cleanAmount,
              dueDay: cleanDue,
            }
          : b
      );
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'ADD_BILL_ITEM': {
      const trimmed = action.name.trim();
      const cleanAmount = roundCurrency(Math.max(0, action.amount));
      if (!trimmed || cleanAmount <= 0) return state;
      const newBill: BillItem = {
        id: makeUid('bill'),
        name: trimmed,
        icon: action.icon,
        amount: cleanAmount,
        dueDay:
          typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
            ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
            : undefined,
      };
      const nextBills = [...state.billItems, newBill];
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'UPDATE_BILL_DUE_DAY': {
      const cleanDue =
        typeof action.dueDay === 'number' && Number.isFinite(action.dueDay)
          ? Math.max(1, Math.min(31, Math.round(action.dueDay)))
          : undefined;
      return {
        ...state,
        billItems: state.billItems.map((b) =>
          b.id === action.billId ? { ...b, dueDay: cleanDue } : b
        ),
      };
    }

    case 'MARK_BILL_PAID': {
      const bill = state.billItems.find((b) => b.id === action.billId);
      if (!bill) return state;
      const targetDateKey = action.todayKey || getTodayKey();
      const monthKey = targetDateKey.slice(0, 7);
      if (bill.lastPaidMonth === monthKey) return state;

      const cleanAmount = roundCurrency(
        Math.max(0, action.amountOverride ?? bill.amount)
      );
      const src = action.paymentSourceId;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let effectiveSourceId: string | undefined;
      let sourceLabel: string | undefined;
      let appliedWalletDelta = 0;

      if (cleanAmount > 0) {
        if (src === 'cash') {
          nextCash = Math.max(0, roundCurrency(state.cashOnHand - cleanAmount));
          appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
          effectiveSourceId = 'cash';
          sourceLabel = 'Cash';
        } else if (src && state.banks.some((b) => b.id === src)) {
          nextBanks = state.banks.map((b) => {
            if (b.id !== src) return b;
            const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
            appliedWalletDelta = roundCurrency(b.balance - nextBal);
            sourceLabel = b.name;
            return { ...b, balance: nextBal };
          });
          effectiveSourceId = src;
        } else if (src && state.creditCards.some((c) => c.id === src)) {
          nextCards = state.creditCards.map((c) => {
            if (c.id !== src) return c;
            sourceLabel = c.name;
            return { ...c, used: roundCurrency(c.used + cleanAmount) };
          });
          appliedWalletDelta = cleanAmount;
          effectiveSourceId = src;
        }
      }

      const entry: TransactionEntry = {
        id: makeUid('bill-pay'),
        type: 'bill_paid',
        amount: cleanAmount,
        label: `Paid Bill: ${bill.name}`,
        icon: bill.icon || 'file-text',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: 'bills',
        billId: bill.id,
        previousBillPaidMonth: bill.lastPaidMonth,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        billItems: state.billItems.map((b) =>
          b.id === bill.id ? { ...b, lastPaidMonth: monthKey } : b
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'REMOVE_BILL_ITEM': {
      const nextBills = state.billItems.filter((b) => b.id !== action.billId);
      return {
        ...state,
        billItems: nextBills,
        settings: { ...state.settings, fixedBills: sumBills(nextBills) },
      };
    }

    case 'DEPOSIT_TO_WALLET': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const isCash = action.sourceId === 'cash';
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);
      const matchedCard = state.creditCards.find(
        (c) => c.id === action.sourceId
      );
      if (!isCash && !matchedBank && !matchedCard) return state;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      let appliedWalletDelta = cleanAmount;
      let nextCards = state.creditCards;
      if (matchedCard) {
        nextCards = state.creditCards.map((c) => {
          if (c.id !== action.sourceId) return c;
          const nextUsed = Math.max(0, roundCurrency(c.used - cleanAmount));
          appliedWalletDelta = roundCurrency(c.used - nextUsed);
          return { ...c, used: nextUsed };
        });
      }

      const entry: TransactionEntry = {
        id: makeUid('dep'),
        type: 'wallet_deposit',
        amount: cleanAmount,
        label:
          action.note?.trim() ||
          (matchedCard ? 'Card Bill Payment' : 'Added Funds / Deposit'),
        icon: matchedCard ? 'credit-card' : 'arrow-down-left',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: action.sourceId,
        paymentSourceLabel: sourceLabel,
        signedDelta: cleanAmount,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: isCash
          ? roundCurrency(state.cashOnHand + cleanAmount)
          : state.cashOnHand,
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === action.sourceId
                ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
                : b
            )
          : state.banks,
        creditCards: nextCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'SET_ACCOUNT_BALANCE': {
      const cleanBalance = Math.max(0, roundCurrency(action.newBalance));
      const isCash = action.sourceId === 'cash';
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);
      const matchedCard = state.creditCards.find(
        (c) => c.id === action.sourceId
      );
      if (!isCash && !matchedBank && !matchedCard) return state;

      const oldBalance = isCash
        ? state.cashOnHand
        : matchedBank
        ? matchedBank.balance
        : matchedCard!.used;
      const delta = roundCurrency(cleanBalance - oldBalance);
      if (delta === 0) return state;

      const sourceLabel = isCash
        ? 'Cash'
        : matchedBank
        ? matchedBank.name
        : matchedCard!.name;

      const entry: TransactionEntry = {
        id: makeUid('adj'),
        type: 'wallet_adjust',
        amount: Math.abs(delta),
        signedDelta: delta,
        label: action.note?.trim() || 'Balance Adjustment',
        icon: 'rotate-ccw',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: action.sourceId,
        paymentSourceLabel: sourceLabel,
      };

      return {
        ...state,
        cashOnHand: isCash ? cleanBalance : state.cashOnHand,
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === action.sourceId ? { ...b, balance: cleanBalance } : b
            )
          : state.banks,
        creditCards: matchedCard
          ? state.creditCards.map((c) =>
              c.id === action.sourceId ? { ...c, used: cleanBalance } : c
            )
          : state.creditCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'ADD_BANK': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      const newBank: BankAccount = {
        id: makeUid('bank'),
        name: trimmed,
        balance: Math.max(0, roundCurrency(action.balance)),
      };
      return { ...state, banks: [...state.banks, newBank] };
    }

    case 'UPDATE_BANK': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      return {
        ...state,
        banks: state.banks.map((b) =>
          b.id === action.bankId ? { ...b, name: trimmed } : b
        ),
      };
    }

    case 'REMOVE_BANK':
      return {
        ...state,
        banks: state.banks.filter((b) => b.id !== action.bankId),
      };

    case 'ADD_CREDIT_CARD': {
      const trimmed = action.name.trim();
      if (!trimmed || action.limit <= 0) return state;
      const newCard: CreditCardAccount = {
        id: makeUid('cc'),
        name: trimmed,
        limit: Math.max(0.01, roundCurrency(action.limit)),
        used: Math.max(0, roundCurrency(action.used)),
        cutoffDay: Math.max(1, Math.min(31, Math.round(action.cutoffDay))),
      };
      return { ...state, creditCards: [...state.creditCards, newCard] };
    }

    case 'UPDATE_CREDIT_CARD': {
      const trimmed = action.name.trim();
      if (!trimmed || action.limit <= 0) return state;
      return {
        ...state,
        creditCards: state.creditCards.map((c) =>
          c.id === action.cardId
            ? {
                ...c,
                name: trimmed,
                limit: Math.max(0.01, roundCurrency(action.limit)),
                cutoffDay: Math.max(
                  1,
                  Math.min(31, Math.round(action.cutoffDay))
                ),
              }
            : c
        ),
      };
    }

    case 'REMOVE_CREDIT_CARD':
      return {
        ...state,
        creditCards: state.creditCards.filter((c) => c.id !== action.cardId),
      };

    case 'COMPLETE_ONBOARDING': {
      const { params } = action;
      const trimmedTreat = (params.treatName || '').trim();
      const cleanTreatTarget = roundCurrency(params.treatTarget || 0);
      const preserve = Boolean(params.preserveExistingData);
      const nextBills = params.billItems ? params.billItems : state.billItems;
      const totalBills = params.billItems
        ? sumBills(params.billItems)
        : roundCurrency(Math.max(0, params.bills));

      const nextSettings: BudgetSettings = {
        monthlyIncome: roundCurrency(Math.max(0, params.income)),
        fixedBills: totalBills,
        monthlySavingsGoal: roundCurrency(Math.max(0, params.savings)),
        salaryFrequency: params.salaryFrequency,
        payday1: Math.max(1, Math.min(31, Math.round(params.payday1))),
        payday2: Math.max(1, Math.min(31, Math.round(params.payday2))),
      };

      if (preserve) {
        let updatedTreats = state.treats;
        let updatedActiveId = state.activeTreatId;
        if (trimmedTreat && cleanTreatTarget > 0 && state.treats.length < 3) {
          const newId = `treat-${Date.now()}`;
          updatedTreats = [
            {
              id: newId,
              name: trimmedTreat,
              icon: params.treatIcon || 'gift',
              target: cleanTreatTarget,
              funded: 0,
              fromImpulses: 0,
              fromRollovers: 0,
              claimed: false,
            },
            ...state.treats,
          ];
          updatedActiveId = newId;
        }
        return {
          ...state,
          hasCompletedOnboarding: true,
          billItems: nextBills,
          cashOnHand: Math.max(0, roundCurrency(params.cashOnHand)),
          settings: nextSettings,
          treats: updatedTreats,
          activeTreatId: updatedActiveId,
        };
      }

      let nextTreats: TreatVaultItem[] = [];
      let nextActiveTreatId = '';
      if (trimmedTreat && cleanTreatTarget > 0) {
        const newId = `treat-${Date.now()}`;
        nextTreats = [
          {
            id: newId,
            name: trimmedTreat,
            icon: params.treatIcon || 'gift',
            target: cleanTreatTarget,
            funded: 0,
            fromImpulses: 0,
            fromRollovers: 0,
            claimed: false,
          },
        ];
        nextActiveTreatId = newId;
      }

      return {
        ...state,
        hasCompletedOnboarding: true,
        hasSeenTutorial: false,
        billItems: nextBills,
        cashOnHand: Math.max(0, roundCurrency(params.cashOnHand)),
        settings: nextSettings,
        monthlySaved: 0,
        rolloverBalance: 0,
        entries: [],
        monthlyArchives: [],
        activeTreatId: nextActiveTreatId,
        treats: nextTreats,
        installments: [],
        envelopes: [],
        sinkingFunds: [],
        unlockedMilestones: [],
      };
    }

    case 'REOPEN_ONBOARDING':
      return { ...state, hasCompletedOnboarding: false };

    case 'CANCEL_REOPENED_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };

    case 'COMPLETE_TUTORIAL':
      return { ...state, hasSeenTutorial: true };

    case 'OPEN_TUTORIAL':
      return { ...state, hasSeenTutorial: false };

    case 'RESET_NEW_USER':
      return createNewUserState(action.todayKey);

    case 'RESET_DEMO':
      return createDemoState(action.todayKey);

    case 'TOGGLE_PRIVACY_MODE':
      return { ...state, privacyMode: !state.privacyMode };

    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.mode };

    case 'LOG_PAYDAY_CHECKIN': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const cleanSavings = roundCurrency(Math.max(0, action.savingsAllocation));
      const targetDateKey = action.todayKey || getTodayKey();
      const matchedBank = state.banks.find((b) => b.id === action.sourceId);

      const effectiveSourceId = matchedBank ? matchedBank.id : 'cash';
      const sourceLabel = matchedBank ? matchedBank.name : 'Cash';

      const refillSet = new Set(action.refillEnvelopeIds || []);
      const refilledSnapshots: Array<{
        id: string;
        previousBalance: number;
        previousRefillKey?: string;
      }> = [];
      const nextEnvelopes =
        refillSet.size > 0
          ? (state.envelopes || []).map((env) => {
              if (!refillSet.has(env.id)) return env;
              refilledSnapshots.push({
                id: env.id,
                previousBalance: env.balance,
                previousRefillKey: env.lastRefillKey,
              });
              const nextBalance =
                env.rolloverMode === 'rollover'
                  ? roundCurrency(env.balance + env.amountPerCycle)
                  : roundCurrency(env.amountPerCycle);
              return {
                ...env,
                balance: nextBalance,
                lastRefillKey: targetDateKey,
              };
            })
          : state.envelopes || [];

      const entry: TransactionEntry = {
        id: makeUid('payday'),
        type: 'wallet_deposit',
        amount: cleanAmount,
        signedDelta: cleanAmount,
        appliedWalletDelta: cleanAmount,
        label:
          action.note?.trim() ||
          (cleanSavings > 0
            ? 'Payday Check-In (+Savings)'
            : 'Payday Check-In'),
        icon: 'dollar-sign',
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        isPaydayCheckIn: true,
        savingsDelta: cleanSavings,
        previousPaydayCheckInKey: state.lastPaydayCheckInKey,
        refilledEnvelopeSnapshots:
          refilledSnapshots.length > 0 ? refilledSnapshots : undefined,
      };

      return {
        ...state,
        cashOnHand: matchedBank
          ? state.cashOnHand
          : roundCurrency(state.cashOnHand + cleanAmount),
        banks: matchedBank
          ? state.banks.map((b) =>
              b.id === matchedBank.id
                ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
                : b
            )
          : state.banks,
        envelopes: nextEnvelopes,
        monthlySaved: roundCurrency(state.monthlySaved + cleanSavings),
        disciplineScore: Math.min(999, state.disciplineScore + 15),
        lastPaydayCheckInKey: targetDateKey,
        entries: [entry, ...state.entries],
      };
    }

    case 'DISMISS_PAYDAY_PROMPT':
      return { ...state, lastPaydayCheckInKey: action.dateKey };

    case 'ADD_ENVELOPE': {
      const trimmed = action.name.trim();
      const cleanAmt = roundCurrency(action.amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return state;
      const newEnv: SpendingEnvelopeItem = {
        id: makeUid('env'),
        name: trimmed,
        icon: action.icon || 'heart',
        amountPerCycle: cleanAmt,
        cadence: action.cadence === 'monthly' ? 'monthly' : 'per_payday',
        rolloverMode: action.rolloverMode === 'reset' ? 'reset' : 'rollover',
        balance: cleanAmt,
      };
      return { ...state, envelopes: [...(state.envelopes || []), newEnv] };
    }

    case 'UPDATE_ENVELOPE': {
      const trimmed = action.name.trim();
      const cleanAmt = roundCurrency(action.amountPerCycle);
      if (!trimmed || cleanAmt <= 0) return state;
      return {
        ...state,
        envelopes: (state.envelopes || []).map((env) =>
          env.id === action.id
            ? {
                ...env,
                name: trimmed,
                icon: action.icon || env.icon,
                amountPerCycle: cleanAmt,
                cadence:
                  action.cadence === 'monthly' ? 'monthly' : 'per_payday',
                rolloverMode:
                  action.rolloverMode === 'reset' ? 'reset' : 'rollover',
                balance:
                  typeof action.balance === 'number' &&
                  Number.isFinite(action.balance)
                    ? Math.max(0, roundCurrency(action.balance))
                    : env.balance,
              }
            : env
        ),
      };
    }

    case 'DELETE_ENVELOPE':
      return {
        ...state,
        envelopes: (state.envelopes || []).filter((e) => e.id !== action.id),
      };

    case 'SPEND_FROM_ENVELOPE': {
      const env = (state.envelopes || []).find(
        (e) => e.id === action.envelopeId
      );
      if (!env) return state;

      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const todayKey = action.todayKey || getTodayKey();
      const targetDateKey = action.dateKey;
      const isToday = targetDateKey === todayKey;
      const bonusStreak = isToday && !state.checkedInToday ? 1 : 0;

      const src = action.paymentSourceId;
      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let effectiveSourceId: string | undefined;
      let sourceLabel: string | undefined;
      let appliedWalletDelta = 0;

      if (src === 'cash') {
        nextCash = Math.max(0, roundCurrency(state.cashOnHand - cleanAmount));
        appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
        effectiveSourceId = 'cash';
        sourceLabel = 'Cash';
      } else if (src && state.banks.some((b) => b.id === src)) {
        nextBanks = state.banks.map((b) => {
          if (b.id !== src) return b;
          const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
          appliedWalletDelta = roundCurrency(b.balance - nextBal);
          sourceLabel = b.name;
          return { ...b, balance: nextBal };
        });
        effectiveSourceId = src;
      } else if (src && state.creditCards.some((c) => c.id === src)) {
        nextCards = state.creditCards.map((c) => {
          if (c.id !== src) return c;
          sourceLabel = c.name;
          return { ...c, used: roundCurrency(c.used + cleanAmount) };
        });
        appliedWalletDelta = cleanAmount;
        effectiveSourceId = src;
      }

      const previousEnvelopeBalance = env.balance;
      const nextEnvBalance = Math.max(0, roundCurrency(env.balance - cleanAmount));

      const entry: TransactionEntry = {
        id: makeUid('env-sp'),
        type: 'envelope_spend',
        amount: cleanAmount,
        label: action.label.trim() || env.name,
        icon: action.icon || env.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        category: action.category,
        envelopeId: env.id,
        previousEnvelopeBalance,
        paymentSourceId: effectiveSourceId,
        paymentSourceLabel: sourceLabel,
        appliedWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        ...(effectiveSourceId
          ? { lastPaymentSourceId: effectiveSourceId }
          : {}),
        envelopes: (state.envelopes || []).map((item) =>
          item.id === env.id ? { ...item, balance: nextEnvBalance } : item
        ),
        checkedInToday: isToday ? true : state.checkedInToday,
        streakDays: state.streakDays + bonusStreak,
        entries: [entry, ...state.entries],
      };
    }

    case 'REFILL_ENVELOPE': {
      const env = (state.envelopes || []).find(
        (e) => e.id === action.envelopeId
      );
      if (!env) return state;

      const targetDateKey = action.todayKey || getTodayKey();
      const nextBalance =
        env.rolloverMode === 'rollover'
          ? roundCurrency(env.balance + env.amountPerCycle)
          : roundCurrency(env.amountPerCycle);

      const entry: TransactionEntry = {
        id: makeUid('env-ref'),
        type: 'envelope_refill',
        amount: env.amountPerCycle,
        label: `Refilled ${env.name}`,
        icon: env.icon,
        timestamp: new Date().toISOString(),
        dateKey: targetDateKey,
        envelopeId: env.id,
        previousEnvelopeBalance: env.balance,
        previousEnvelopeRefillKey: env.lastRefillKey,
      };

      return {
        ...state,
        envelopes: (state.envelopes || []).map((item) =>
          item.id === env.id
            ? { ...item, balance: nextBalance, lastRefillKey: targetDateKey }
            : item
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'ADD_INSTALLMENT': {
      const { params } = action;
      const trimmed = params.name.trim();
      if (!trimmed || params.monthlyAmount <= 0 || params.totalMonths <= 0) {
        return state;
      }
      const totalM = Math.max(1, Math.round(params.totalMonths));
      const paidM = Math.max(0, Math.min(totalM, Math.round(params.paidMonths)));
      const newItem: InstallmentItem = {
        id: makeUid('inst'),
        name: trimmed,
        provider: params.provider.trim() || 'Installment',
        monthlyAmount: roundCurrency(params.monthlyAmount),
        totalMonths: totalM,
        paidMonths: paidM,
        includeInBudget: params.includeInBudget,
      };
      return { ...state, installments: [...state.installments, newItem] };
    }

    case 'UPDATE_INSTALLMENT': {
      const { params } = action;
      const trimmed = params.name.trim();
      if (!trimmed || params.monthlyAmount <= 0 || params.totalMonths <= 0) {
        return state;
      }
      const totalM = Math.max(1, Math.round(params.totalMonths));
      const paidM = Math.max(0, Math.min(totalM, Math.round(params.paidMonths)));
      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id
            ? {
                ...item,
                name: trimmed,
                provider: params.provider.trim() || 'Installment',
                monthlyAmount: roundCurrency(params.monthlyAmount),
                totalMonths: totalM,
                paidMonths: paidM,
                includeInBudget: params.includeInBudget,
              }
            : item
        ),
      };
    }

    case 'MARK_INSTALLMENT_PAID': {
      const target = state.installments.find((i) => i.id === action.id);
      if (!target || target.paidMonths >= target.totalMonths) return state;

      const nextPaid = target.paidMonths + 1;
      const entry: TransactionEntry = {
        id: makeUid('inst-pay'),
        type: 'installment_paid',
        amount: target.monthlyAmount,
        label: `${target.name} (${nextPaid}/${target.totalMonths} mo)`,
        icon: 'calendar',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        installmentId: action.id,
      };

      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id ? { ...item, paidMonths: nextPaid } : item
        ),
        entries: [entry, ...state.entries],
      };
    }

    case 'TOGGLE_INSTALLMENT_IN_BUDGET':
      return {
        ...state,
        installments: state.installments.map((item) =>
          item.id === action.id
            ? { ...item, includeInBudget: !item.includeInBudget }
            : item
        ),
      };

    case 'REMOVE_INSTALLMENT':
      return {
        ...state,
        installments: state.installments.filter((i) => i.id !== action.id),
      };

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

    case 'MARK_BACKUP_EXPORTED':
      return {
        ...state,
        lastBackupAt: action.exportedAt,
      };

    case 'RESTORE_BACKUP':
      return normalizePersistedState(action.data);

    case 'TRANSFER_BETWEEN_ACCOUNTS': {
      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const { fromSourceId, toSourceId } = action;
      if (!fromSourceId || !toSourceId || fromSourceId === toSourceId) {
        return state;
      }

      const fromIsCash = fromSourceId === 'cash';
      const fromBank = state.banks.find((b) => b.id === fromSourceId);
      if (!fromIsCash && !fromBank) return state;

      const toIsCash = toSourceId === 'cash';
      const toBank = state.banks.find((b) => b.id === toSourceId);
      const toCard = state.creditCards.find((c) => c.id === toSourceId);
      if (!toIsCash && !toBank && !toCard) return state;

      const fromLabel = fromIsCash ? 'Cash' : fromBank!.name;
      const toLabel = toIsCash
        ? 'Cash'
        : toBank
        ? toBank.name
        : toCard!.name;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let appliedWalletDelta = cleanAmount;

      if (fromIsCash) {
        nextCash = Math.max(0, roundCurrency(nextCash - cleanAmount));
        appliedWalletDelta = roundCurrency(state.cashOnHand - nextCash);
      } else {
        nextBanks = nextBanks.map((b) => {
          if (b.id !== fromSourceId) return b;
          const nextBal = Math.max(0, roundCurrency(b.balance - cleanAmount));
          appliedWalletDelta = roundCurrency(b.balance - nextBal);
          return { ...b, balance: nextBal };
        });
      }

      let appliedToWalletDelta = cleanAmount;
      if (toIsCash) {
        nextCash = roundCurrency(nextCash + cleanAmount);
      } else if (toBank) {
        nextBanks = nextBanks.map((b) =>
          b.id === toSourceId
            ? { ...b, balance: roundCurrency(b.balance + cleanAmount) }
            : b
        );
      } else if (toCard) {
        nextCards = nextCards.map((c) => {
          if (c.id !== toSourceId) return c;
          const nextUsed = Math.max(0, roundCurrency(c.used - cleanAmount));
          appliedToWalletDelta = roundCurrency(c.used - nextUsed);
          return { ...c, used: nextUsed };
        });
      }

      const defaultLabel = toCard
        ? `Paid ${toLabel} from ${fromLabel}`
        : `Transfer: ${fromLabel} → ${toLabel}`;

      const entry: TransactionEntry = {
        id: makeUid('xfer'),
        type: 'wallet_transfer',
        amount: cleanAmount,
        label: action.note?.trim() || defaultLabel,
        icon: toCard ? 'credit-card' : 'repeat',
        timestamp: new Date().toISOString(),
        dateKey: action.todayKey || getTodayKey(),
        paymentSourceId: fromSourceId,
        paymentSourceLabel: fromLabel,
        toPaymentSourceId: toSourceId,
        toPaymentSourceLabel: toLabel,
        appliedWalletDelta,
        appliedToWalletDelta,
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        entries: [entry, ...state.entries],
      };
    }

    case 'EDIT_ENTRY': {
      if (!isEditableEntry(state, action.entryId)) return state;
      const target = state.entries.find((e) => e.id === action.entryId);
      if (!target) return state;

      const cleanAmount = roundCurrency(Math.max(0.01, action.amount));
      const cleanLabel = action.label.trim() || target.label;

      let nextCash = state.cashOnHand;
      let nextBanks = state.banks;
      let nextCards = state.creditCards;
      let nextEnvelopes = state.envelopes || [];
      let nextSaved = state.monthlySaved;
      let nextTreats = state.treats;

      let nextAppliedWalletDelta = target.appliedWalletDelta;
      let nextSignedDelta = target.signedDelta;
      let nextPreviousEnvelopeBalance = target.previousEnvelopeBalance;

      if (
        target.type === 'spend' ||
        target.type === 'bill_paid' ||
        target.type === 'envelope_spend'
      ) {
        const src = target.paymentSourceId;
        if (src) {
          const oldApplied =
            typeof target.appliedWalletDelta === 'number'
              ? target.appliedWalletDelta
              : target.amount;
          if (src === 'cash') {
            const restored = roundCurrency(nextCash + oldApplied);
            nextCash = Math.max(0, roundCurrency(restored - cleanAmount));
            nextAppliedWalletDelta = roundCurrency(restored - nextCash);
          } else if (nextBanks.some((b) => b.id === src)) {
            nextBanks = nextBanks.map((b) => {
              if (b.id !== src) return b;
              const restored = roundCurrency(b.balance + oldApplied);
              const nextBal = Math.max(0, roundCurrency(restored - cleanAmount));
              nextAppliedWalletDelta = roundCurrency(restored - nextBal);
              return { ...b, balance: nextBal };
            });
          } else if (nextCards.some((c) => c.id === src)) {
            nextCards = nextCards.map((c) => {
              if (c.id !== src) return c;
              const restored = Math.max(0, roundCurrency(c.used - oldApplied));
              const nextUsed = roundCurrency(restored + cleanAmount);
              nextAppliedWalletDelta = cleanAmount;
              return { ...c, used: nextUsed };
            });
          }
        }

        if (target.type === 'envelope_spend' && target.envelopeId) {
          nextEnvelopes = nextEnvelopes.map((env) => {
            if (env.id !== target.envelopeId) return env;
            const appliedEnv =
              typeof target.previousEnvelopeBalance === 'number'
                ? Math.min(target.amount, target.previousEnvelopeBalance)
                : target.amount;
            const restoredEnv = roundCurrency(env.balance + appliedEnv);
            const nextEnvBal = Math.max(
              0,
              roundCurrency(restoredEnv - cleanAmount)
            );
            nextPreviousEnvelopeBalance = restoredEnv;
            return { ...env, balance: nextEnvBal };
          });
        }
      } else if (target.type === 'wallet_deposit') {
        const src = target.paymentSourceId;
        const oldApplied =
          typeof target.appliedWalletDelta === 'number'
            ? target.appliedWalletDelta
            : target.amount;
        if (src === 'cash') {
          const restored = Math.max(0, roundCurrency(nextCash - oldApplied));
          nextCash = roundCurrency(restored + cleanAmount);
          nextAppliedWalletDelta = cleanAmount;
        } else if (src && nextBanks.some((b) => b.id === src)) {
          nextBanks = nextBanks.map((b) => {
            if (b.id !== src) return b;
            const restored = Math.max(0, roundCurrency(b.balance - oldApplied));
            nextAppliedWalletDelta = cleanAmount;
            return { ...b, balance: roundCurrency(restored + cleanAmount) };
          });
        } else if (src && nextCards.some((c) => c.id === src)) {
          nextCards = nextCards.map((c) => {
            if (c.id !== src) return c;
            const restored = roundCurrency(c.used + oldApplied);
            const nextUsed = Math.max(0, roundCurrency(restored - cleanAmount));
            nextAppliedWalletDelta = roundCurrency(restored - nextUsed);
            return { ...c, used: nextUsed };
          });
        }
        nextSignedDelta = cleanAmount;
      } else if (target.type === 'save_direct') {
        const delta = roundCurrency(cleanAmount - target.amount);
        nextSaved = Math.max(0, roundCurrency(state.monthlySaved + delta));
      } else if (target.type === 'treat_direct') {
        const delta = roundCurrency(cleanAmount - target.amount);
        if (
          target.treatId &&
          state.treats.some((t) => t.id === target.treatId)
        ) {
          nextTreats = state.treats.map((t) =>
            t.id === target.treatId && !t.claimed
              ? {
                  ...t,
                  funded: Math.max(0, roundCurrency(t.funded + delta)),
                  fromImpulses: Math.max(
                    0,
                    roundCurrency(t.fromImpulses + delta)
                  ),
                }
              : t
          );
        } else {
          nextSaved = Math.max(0, roundCurrency(nextSaved + delta));
        }
      }

      const canUpdateCat =
        target.type === 'spend' || target.type === 'envelope_spend';

      const updatedEntry: TransactionEntry = {
        ...target,
        amount: cleanAmount,
        label: cleanLabel,
        ...(canUpdateCat && action.category !== undefined
          ? { category: action.category }
          : {}),
        ...(canUpdateCat && action.icon !== undefined
          ? { icon: action.icon }
          : {}),
        ...(nextAppliedWalletDelta !== undefined
          ? { appliedWalletDelta: nextAppliedWalletDelta }
          : {}),
        ...(nextSignedDelta !== undefined
          ? { signedDelta: nextSignedDelta }
          : {}),
        ...(nextPreviousEnvelopeBalance !== undefined
          ? { previousEnvelopeBalance: nextPreviousEnvelopeBalance }
          : {}),
      };

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        envelopes: nextEnvelopes,
        monthlySaved: nextSaved,
        treats: nextTreats,
        entries: state.entries.map((e) =>
          e.id === action.entryId ? updatedEntry : e
        ),
      };
    }
  }
}
