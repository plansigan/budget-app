import {
  BankAccount,
  CreditCardAccount,
  TransactionEntry,
} from '../../types/budget';
import { roundCurrency } from '../budgetMath';
import { PersistedBudgetState } from '../defaults';

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

export function makeUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function applyOptionalDebtWalletMovement(params: {
  isOutflow: boolean;
  amount: number;
  sourceId?: string;
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
}): {
  nextCash: number;
  nextBanks: BankAccount[];
  nextCards: CreditCardAccount[];
  effectiveSourceId?: string;
  sourceLabel?: string;
  appliedWalletDelta: number;
} {
  const { isOutflow, amount, sourceId, cashOnHand, banks, creditCards } =
    params;
  if (!sourceId || sourceId === 'none') {
    return {
      nextCash: cashOnHand,
      nextBanks: banks,
      nextCards: creditCards,
      effectiveSourceId: undefined,
      sourceLabel: undefined,
      appliedWalletDelta: 0,
    };
  }

  if (sourceId === 'cash') {
    const nextCash = isOutflow
      ? Math.max(0, roundCurrency(cashOnHand - amount))
      : roundCurrency(cashOnHand + amount);
    const appliedWalletDelta = isOutflow
      ? roundCurrency(cashOnHand - nextCash)
      : amount;
    return {
      nextCash,
      nextBanks: banks,
      nextCards: creditCards,
      effectiveSourceId: 'cash',
      sourceLabel: 'Cash',
      appliedWalletDelta,
    };
  }

  const matchedBank = banks.find((b) => b.id === sourceId);
  if (matchedBank) {
    let appliedWalletDelta = amount;
    const nextBanks = banks.map((b) => {
      if (b.id !== sourceId) return b;
      const nextBal = isOutflow
        ? Math.max(0, roundCurrency(b.balance - amount))
        : roundCurrency(b.balance + amount);
      appliedWalletDelta = isOutflow
        ? roundCurrency(b.balance - nextBal)
        : amount;
      return { ...b, balance: nextBal };
    });
    return {
      nextCash: cashOnHand,
      nextBanks,
      nextCards: creditCards,
      effectiveSourceId: matchedBank.id,
      sourceLabel: matchedBank.name,
      appliedWalletDelta,
    };
  }

  if (isOutflow) {
    const matchedCard = creditCards.find((c) => c.id === sourceId);
    if (matchedCard) {
      const nextCards = creditCards.map((c) =>
        c.id === sourceId
          ? { ...c, used: roundCurrency(c.used + amount) }
          : c
      );
      return {
        nextCash: cashOnHand,
        nextBanks: banks,
        nextCards,
        effectiveSourceId: matchedCard.id,
        sourceLabel: matchedCard.name,
        appliedWalletDelta: amount,
      };
    }
  }

  return {
    nextCash: cashOnHand,
    nextBanks: banks,
    nextCards: creditCards,
    effectiveSourceId: undefined,
    sourceLabel: undefined,
    appliedWalletDelta: 0,
  };
}
