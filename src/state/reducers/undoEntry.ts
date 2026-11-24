import { roundCurrency } from '../budgetMath';
import { applyWalletDelta, canUndoEntry } from './helpers';
import { SliceReducer } from './types';

export const handleUndoEntryAction: SliceReducer = (state, action) => {
  if (action.type !== 'UNDO_ENTRY') return undefined;

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
  let nextWantToBuy = state.wantToBuyItems || [];
  let nextLastPaydayCheckInKey = state.lastPaydayCheckInKey;

  const remainingEntries = state.entries.filter((e) => e.id !== action.entryId);

  if (
    freshTarget.type === 'spend' ||
    freshTarget.type === 'bill_paid' ||
    freshTarget.type === 'envelope_spend'
  ) {
    const restoreAmt =
      typeof freshTarget.appliedWalletDelta === 'number'
        ? freshTarget.appliedWalletDelta
        : freshTarget.amount;
    const rev = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      freshTarget.paymentSourceId,
      'inflow',
      restoreAmt,
      { allowCardInflow: true }
    );
    nextCash = rev.cashOnHand;
    nextBanks = rev.banks;
    nextCards = rev.creditCards;

    if (freshTarget.type === 'bill_paid' && freshTarget.billId) {
      const entryMonth = (freshTarget.dateKey || '').slice(0, 7);
      nextBillItems = nextBillItems.map((b) => {
        if (b.id !== freshTarget.billId) return b;
        // Only roll back lastPaidMonth if this entry matches the bill's current paid month
        if (entryMonth && b.lastPaidMonth && b.lastPaidMonth !== entryMonth) {
          return b;
        }
        const latestRemaining = remainingEntries
          .filter((e) => e.type === 'bill_paid' && e.billId === b.id && e.dateKey)
          .map((e) => e.dateKey!.slice(0, 7))
          .sort()
          .pop();
        return {
          ...b,
          lastPaidMonth: latestRemaining ?? freshTarget.previousBillPaidMonth,
        };
      });
    }

    if (freshTarget.type === 'envelope_spend' && freshTarget.envelopeId) {
      nextEnvelopes = nextEnvelopes.map((env) => {
        if (env.id !== freshTarget.envelopeId) return env;
        const appliedEnv =
          typeof freshTarget.appliedEnvelopeDelta === 'number'
            ? freshTarget.appliedEnvelopeDelta
            : typeof freshTarget.previousEnvelopeBalance === 'number'
            ? Math.min(freshTarget.amount, freshTarget.previousEnvelopeBalance)
            : freshTarget.amount;
        return {
          ...env,
          balance: roundCurrency(env.balance + appliedEnv),
        };
      });
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
    const reverseAmt =
      typeof freshTarget.appliedWalletDelta === 'number'
        ? freshTarget.appliedWalletDelta
        : freshTarget.amount;
    const rev = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      freshTarget.paymentSourceId,
      'outflow',
      reverseAmt
    );
    nextCash = rev.cashOnHand;
    nextBanks = rev.banks;
    nextCards = rev.creditCards;

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
      if (
        !freshTarget.dateKey ||
        state.lastPaydayCheckInKey === freshTarget.dateKey
      ) {
        nextLastPaydayCheckInKey = freshTarget.previousPaydayCheckInKey || '';
      }
      if (
        Array.isArray(freshTarget.refilledEnvelopeSnapshots) &&
        freshTarget.refilledEnvelopeSnapshots.length > 0
      ) {
        const snapMap = new Map(
          freshTarget.refilledEnvelopeSnapshots.map((s) => [s.id, s])
        );
        nextEnvelopes = nextEnvelopes.map((env) => {
          const snap = snapMap.get(env.id);
          if (!snap) return env;
          let restoredBal: number;
          if (env.rolloverMode === 'rollover') {
            restoredBal = Math.max(
              0,
              roundCurrency(env.balance - env.amountPerCycle)
            );
          } else {
            const spentSinceReset = Math.max(
              0,
              roundCurrency(env.amountPerCycle - env.balance)
            );
            restoredBal = Math.max(
              0,
              roundCurrency(snap.previousBalance - spentSinceReset)
            );
          }
          const nextRefillKey =
            !freshTarget.dateKey || env.lastRefillKey === freshTarget.dateKey
              ? snap.previousRefillKey
              : env.lastRefillKey;
          return {
            ...env,
            balance: restoredBal,
            lastRefillKey: nextRefillKey,
          };
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
  } else if (freshTarget.type === 'savings_spend') {
    const restoreWalletAmt =
      typeof freshTarget.appliedWalletDelta === 'number'
        ? freshTarget.appliedWalletDelta
        : freshTarget.paymentSourceId
        ? freshTarget.amount
        : 0;
    const rev = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      freshTarget.paymentSourceId,
      'inflow',
      restoreWalletAmt,
      { allowCardInflow: true }
    );
    nextCash = rev.cashOnHand;
    nextBanks = rev.banks;
    nextCards = rev.creditCards;

    const restoreSavingsAmt =
      typeof freshTarget.savingsDelta === 'number'
        ? freshTarget.savingsDelta
        : freshTarget.amount;
    const hasBucket =
      freshTarget.sinkingFundId &&
      nextSinkingFunds.some((f) => f.id === freshTarget.sinkingFundId);
    if (hasBucket) {
      nextSinkingFunds = nextSinkingFunds.map((f) =>
        f.id === freshTarget.sinkingFundId
          ? { ...f, saved: roundCurrency(f.saved + restoreSavingsAmt) }
          : f
      );
    } else {
      nextSaved = roundCurrency(nextSaved + restoreSavingsAmt);
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
    if (targetFundId && state.sinkingFunds.some((f) => f.id === targetFundId)) {
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
    } else {
      // DELETE_SINKING_FUND refunded target.saved to monthlySaved
      nextSaved = Math.max(0, roundCurrency(nextSaved - freshTarget.amount));
    }
  } else if (freshTarget.type === 'envelope_refill') {
    if (freshTarget.envelopeId) {
      nextEnvelopes = nextEnvelopes.map((env) => {
        if (env.id !== freshTarget.envelopeId) return env;
        let restoredBal: number;
        if (env.rolloverMode === 'rollover') {
          restoredBal = Math.max(
            0,
            roundCurrency(env.balance - freshTarget.amount)
          );
        } else if (typeof freshTarget.previousEnvelopeBalance === 'number') {
          const spentSinceReset = Math.max(
            0,
            roundCurrency(freshTarget.amount - env.balance)
          );
          restoredBal = Math.max(
            0,
            roundCurrency(freshTarget.previousEnvelopeBalance - spentSinceReset)
          );
        } else {
          restoredBal = Math.max(
            0,
            roundCurrency(env.balance - freshTarget.amount)
          );
        }
        const nextRefillKey =
          !freshTarget.dateKey || env.lastRefillKey === freshTarget.dateKey
            ? freshTarget.previousEnvelopeRefillKey
            : env.lastRefillKey;
        return {
          ...env,
          balance: restoredBal,
          lastRefillKey: nextRefillKey,
        };
      });
    }
  } else if (freshTarget.type === 'wallet_transfer') {
    const fromRestore =
      typeof freshTarget.appliedWalletDelta === 'number'
        ? freshTarget.appliedWalletDelta
        : freshTarget.amount;
    const revFrom = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      freshTarget.paymentSourceId,
      'inflow',
      fromRestore,
      { allowCardInflow: true }
    );
    nextCash = revFrom.cashOnHand;
    nextBanks = revFrom.banks;
    nextCards = revFrom.creditCards;

    const toReverse =
      typeof freshTarget.appliedToWalletDelta === 'number'
        ? freshTarget.appliedToWalletDelta
        : freshTarget.amount;
    const revTo = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      freshTarget.toPaymentSourceId,
      'outflow',
      toReverse
    );
    nextCash = revTo.cashOnHand;
    nextBanks = revTo.banks;
    nextCards = revTo.creditCards;
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
    const rev = applyWalletDelta(
      { cashOnHand: nextCash, banks: nextBanks, creditCards: nextCards },
      src,
      freshTarget.type === 'debt_outflow' ? 'inflow' : 'outflow',
      walletDelta,
      { allowCardInflow: freshTarget.type === 'debt_outflow' }
    );
    nextCash = rev.cashOnHand;
    nextBanks = rev.banks;
    nextCards = rev.creditCards;

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
        const linkedDebt = nextDebts.find((d) => d.id === freshTarget.debtId);
        if (linkedDebt && linkedDebt.paidAmount === 0) {
          nextDebts = nextDebts.filter((d) => d.id !== freshTarget.debtId);
        }
      }
    }
  }

  if (freshTarget.wantToBuyId) {
    nextWantToBuy = nextWantToBuy.map((w) => {
      if (w.id !== freshTarget.wantToBuyId) return w;
      return {
        id: w.id,
        name: w.name,
        price: w.price,
        icon: w.icon,
        ...(w.note ? { note: w.note } : {}),
        createdAt: w.createdAt,
        reevaluateOn: w.reevaluateOn,
        status: 'waiting',
      };
    });
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
    wantToBuyItems: nextWantToBuy,
    installments: nextInstallments,
    sinkingFunds: nextSinkingFunds,
    entries: remainingEntries,
  };
};
