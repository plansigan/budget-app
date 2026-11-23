import { TransactionEntry } from '../../types/budget';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  getTodayKey,
  getTotalMonthlyEnvelopes,
  roundCurrency,
} from '../budgetMath';
import { applyMidnightRollover } from '../rollover';
import { canUndoEntry, isEditableEntry, makeUid } from './helpers';
import { SliceReducer } from './types';

export const handleDailyAndEntriesAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'APPLY_ROLLOVER':
      return applyMidnightRollover(
        state,
        action.newDateKey,
        action.minimumSplitFallback ?? 0
      ).nextState;

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
      let nextDebts = state.debts || [];
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
      } else if (
        freshTarget.type === 'debt_outflow' ||
        freshTarget.type === 'debt_inflow'
      ) {
        const src = freshTarget.paymentSourceId;
        const walletDelta =
          typeof freshTarget.appliedWalletDelta === 'number'
            ? freshTarget.appliedWalletDelta
            : src
            ? freshTarget.amount
            : 0;
        if (freshTarget.type === 'debt_outflow') {
          if (src === 'cash') {
            nextCash = roundCurrency(nextCash + walletDelta);
          } else if (src && nextBanks.some((b) => b.id === src)) {
            nextBanks = nextBanks.map((b) =>
              b.id === src
                ? { ...b, balance: roundCurrency(b.balance + walletDelta) }
                : b
            );
          } else if (src && nextCards.some((c) => c.id === src)) {
            nextCards = nextCards.map((c) =>
              c.id === src
                ? { ...c, used: Math.max(0, roundCurrency(c.used - walletDelta)) }
                : c
            );
          }
        } else {
          if (src === 'cash') {
            nextCash = Math.max(0, roundCurrency(nextCash - walletDelta));
          } else if (src && nextBanks.some((b) => b.id === src)) {
            nextBanks = nextBanks.map((b) =>
              b.id === src
                ? {
                    ...b,
                    balance: Math.max(0, roundCurrency(b.balance - walletDelta)),
                  }
                : b
            );
          }
        }

        if (freshTarget.debtId) {
          if (freshTarget.debtAction === 'payment') {
            nextDebts = nextDebts.map((d) => {
              if (d.id !== freshTarget.debtId) return d;
              const nextPaid = Math.max(
                0,
                roundCurrency(d.paidAmount - freshTarget.amount)
              );
              return {
                ...d,
                paidAmount: nextPaid,
                settledAt: nextPaid >= d.amount ? d.settledAt : undefined,
              };
            });
          } else if (freshTarget.debtAction === 'created') {
            const linkedDebt = nextDebts.find(
              (d) => d.id === freshTarget.debtId
            );
            if (linkedDebt && linkedDebt.paidAmount === 0) {
              nextDebts = nextDebts.filter((d) => d.id !== freshTarget.debtId);
            }
          }
        }
      }

      return {
        ...state,
        cashOnHand: nextCash,
        banks: nextBanks,
        creditCards: nextCards,
        billItems: nextBillItems,
        envelopes: nextEnvelopes,
        debts: nextDebts,
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

    default:
      return undefined;
  }
};
