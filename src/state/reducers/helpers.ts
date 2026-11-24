import {
  BankAccount,
  CreditCardAccount,
  DebtItem,
  TransactionEntry,
  TreatVaultItem,
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

export function canEditEntry(
  entry: TransactionEntry,
  treats: TreatVaultItem[]
): boolean {
  if (!isEditableEntryType(entry)) return false;
  if (entry.type === 'treat_direct' && entry.treatId) {
    const linkedTreat = treats.find((t) => t.id === entry.treatId);
    if (linkedTreat && linkedTreat.claimed) {
      return false;
    }
  }
  return true;
}

export function isEditableEntry(
  state: PersistedBudgetState,
  entryId: string
): boolean {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target) return false;
  return canEditEntry(target, state.treats);
}

export function getUndoEligibility(
  target: TransactionEntry,
  treats: TreatVaultItem[],
  debts: DebtItem[]
): { ok: true } | { ok: false; reason: string } {
  if (
    (target.type === 'treat_direct' ||
      target.type === 'impulse_skipped' ||
      target.type === 'midnight_split') &&
    target.treatId
  ) {
    const linkedTreat = treats.find((t) => t.id === target.treatId);
    if (linkedTreat && linkedTreat.claimed) {
      return {
        ok: false,
        reason: 'Cannot undo entries for an already-claimed treat.',
      };
    }
  }
  if (
    (target.type === 'debt_outflow' || target.type === 'debt_inflow') &&
    target.debtAction === 'created' &&
    target.debtId
  ) {
    const linkedDebt = debts.find((d) => d.id === target.debtId);
    if (linkedDebt && linkedDebt.paidAmount > 0) {
      return {
        ok: false,
        reason: 'Undo recorded debt payments before undoing debt creation.',
      };
    }
  }
  return { ok: true };
}

export function canUndoEntry(
  state: PersistedBudgetState,
  entryId: string
): { ok: true } | { ok: false; reason: string } {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target) {
    return { ok: false, reason: 'Entry not found.' };
  }
  return getUndoEligibility(target, state.treats, state.debts || []);
}

export function makeUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export type ResolvedPaymentSource =
  | { kind: 'cash'; id: 'cash'; label: 'Cash'; balance: number }
  | { kind: 'bank'; id: string; label: string; balance: number }
  | { kind: 'card'; id: string; label: string; used: number; limit: number }
  | { kind: 'none'; id: undefined; label: undefined };

export function resolvePaymentSource(
  state: Pick<PersistedBudgetState, 'cashOnHand' | 'banks' | 'creditCards'>,
  sourceId?: string
): ResolvedPaymentSource {
  if (!sourceId || sourceId === 'none') {
    return { kind: 'none', id: undefined, label: undefined };
  }
  if (sourceId === 'cash') {
    return { kind: 'cash', id: 'cash', label: 'Cash', balance: state.cashOnHand };
  }
  const bank = state.banks.find((b) => b.id === sourceId);
  if (bank) {
    return {
      kind: 'bank',
      id: bank.id,
      label: bank.name,
      balance: bank.balance,
    };
  }
  const card = state.creditCards.find((c) => c.id === sourceId);
  if (card) {
    return {
      kind: 'card',
      id: card.id,
      label: card.name,
      used: card.used,
      limit: card.limit,
    };
  }
  return { kind: 'none', id: undefined, label: undefined };
}

export interface WalletDeltaResult {
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  appliedDelta: number;
  effectiveSourceId?: string;
  sourceLabel?: string;
  sourceKind: ResolvedPaymentSource['kind'];
}

/**
 * Applies a single Cash, Bank, or Credit Card balance movement with 0-clamping.
 * - `outflow`: reduces Cash/Bank balance (clamped at 0); increases Card `used`.
 * - `inflow`: increases Cash/Bank balance; reduces Card `used` (when `allowCardInflow` is true).
 */
export function applyWalletDelta(
  state: Pick<PersistedBudgetState, 'cashOnHand' | 'banks' | 'creditCards'>,
  sourceId: string | undefined,
  direction: 'outflow' | 'inflow',
  rawAmount: number,
  options?: { allowCardInflow?: boolean }
): WalletDeltaResult {
  const resolved = resolvePaymentSource(state, sourceId);
  const cleanAmount = roundCurrency(Math.max(0, rawAmount));
  const allowCardInflow = options?.allowCardInflow ?? false;

  if (resolved.kind === 'none' || cleanAmount <= 0) {
    return {
      cashOnHand: state.cashOnHand,
      banks: state.banks,
      creditCards: state.creditCards,
      appliedDelta: 0,
      effectiveSourceId: resolved.id,
      sourceLabel: resolved.label,
      sourceKind: resolved.kind,
    };
  }

  if (resolved.kind === 'cash') {
    const nextCash =
      direction === 'outflow'
        ? Math.max(0, roundCurrency(state.cashOnHand - cleanAmount))
        : roundCurrency(state.cashOnHand + cleanAmount);
    const appliedDelta =
      direction === 'outflow'
        ? roundCurrency(state.cashOnHand - nextCash)
        : cleanAmount;
    return {
      cashOnHand: nextCash,
      banks: state.banks,
      creditCards: state.creditCards,
      appliedDelta,
      effectiveSourceId: 'cash',
      sourceLabel: 'Cash',
      sourceKind: 'cash',
    };
  }

  if (resolved.kind === 'bank') {
    let appliedDelta = cleanAmount;
    const nextBanks = state.banks.map((b) => {
      if (b.id !== resolved.id) return b;
      const nextBal =
        direction === 'outflow'
          ? Math.max(0, roundCurrency(b.balance - cleanAmount))
          : roundCurrency(b.balance + cleanAmount);
      appliedDelta =
        direction === 'outflow'
          ? roundCurrency(b.balance - nextBal)
          : cleanAmount;
      return { ...b, balance: nextBal };
    });
    return {
      cashOnHand: state.cashOnHand,
      banks: nextBanks,
      creditCards: state.creditCards,
      appliedDelta,
      effectiveSourceId: resolved.id,
      sourceLabel: resolved.label,
      sourceKind: 'bank',
    };
  }

  // Credit card
  if (direction === 'inflow' && !allowCardInflow) {
    return {
      cashOnHand: state.cashOnHand,
      banks: state.banks,
      creditCards: state.creditCards,
      appliedDelta: 0,
      effectiveSourceId: undefined,
      sourceLabel: undefined,
      sourceKind: 'none',
    };
  }

  let appliedDelta = cleanAmount;
  const nextCards = state.creditCards.map((c) => {
    if (c.id !== resolved.id) return c;
    if (direction === 'outflow') {
      const nextUsed = roundCurrency(c.used + cleanAmount);
      appliedDelta = cleanAmount;
      return { ...c, used: nextUsed };
    }
    const nextUsed = Math.max(0, roundCurrency(c.used - cleanAmount));
    appliedDelta = roundCurrency(c.used - nextUsed);
    return { ...c, used: nextUsed };
  });

  return {
    cashOnHand: state.cashOnHand,
    banks: state.banks,
    creditCards: nextCards,
    appliedDelta,
    effectiveSourceId: resolved.id,
    sourceLabel: resolved.label,
    sourceKind: 'card',
  };
}

/**
 * Reconciles an edited transaction's wallet impact without intermediate 0-clamping
 * that would otherwise fabricate phantom cash or phantom credit-card debt.
 */
export function reconcileEditedWalletDelta(
  state: Pick<PersistedBudgetState, 'cashOnHand' | 'banks' | 'creditCards'>,
  sourceId: string | undefined,
  direction: 'outflow' | 'inflow',
  oldApplied: number,
  rawNewAmount: number
): {
  cashOnHand: number;
  banks: BankAccount[];
  creditCards: CreditCardAccount[];
  nextAppliedDelta: number;
} {
  const resolved = resolvePaymentSource(state, sourceId);
  const cleanOld = roundCurrency(Math.max(0, oldApplied));
  const cleanNew = roundCurrency(Math.max(0, rawNewAmount));

  if (resolved.kind === 'none') {
    return {
      cashOnHand: state.cashOnHand,
      banks: state.banks,
      creditCards: state.creditCards,
      nextAppliedDelta: cleanOld,
    };
  }

  if (resolved.kind === 'cash') {
    if (direction === 'outflow') {
      const restored = roundCurrency(state.cashOnHand + cleanOld);
      const nextCash = Math.max(0, roundCurrency(restored - cleanNew));
      return {
        cashOnHand: nextCash,
        banks: state.banks,
        creditCards: state.creditCards,
        nextAppliedDelta: roundCurrency(restored - nextCash),
      };
    }
    // Inflow edit on cash: apply net difference directly
    const nextCash = Math.max(
      0,
      roundCurrency(state.cashOnHand + (cleanNew - cleanOld))
    );
    return {
      cashOnHand: nextCash,
      banks: state.banks,
      creditCards: state.creditCards,
      nextAppliedDelta: Math.min(
        cleanNew,
        Math.max(0, roundCurrency(cleanOld + (nextCash - state.cashOnHand)))
      ),
    };
  }

  if (resolved.kind === 'bank') {
    let nextAppliedDelta = cleanNew;
    const nextBanks = state.banks.map((b) => {
      if (b.id !== resolved.id) return b;
      if (direction === 'outflow') {
        const restored = roundCurrency(b.balance + cleanOld);
        const nextBal = Math.max(0, roundCurrency(restored - cleanNew));
        nextAppliedDelta = roundCurrency(restored - nextBal);
        return { ...b, balance: nextBal };
      }
      const nextBal = Math.max(
        0,
        roundCurrency(b.balance + (cleanNew - cleanOld))
      );
      nextAppliedDelta = Math.min(
        cleanNew,
        Math.max(0, roundCurrency(cleanOld + (nextBal - b.balance)))
      );
      return { ...b, balance: nextBal };
    });
    return {
      cashOnHand: state.cashOnHand,
      banks: nextBanks,
      creditCards: state.creditCards,
      nextAppliedDelta,
    };
  }

  // Credit card
  let nextAppliedDelta = cleanNew;
  const nextCards = state.creditCards.map((c) => {
    if (c.id !== resolved.id) return c;
    if (direction === 'outflow') {
      // Apply net delta directly without clamping (c.used - cleanOld) at 0 first
      const nextUsed = Math.max(
        0,
        roundCurrency(c.used + (cleanNew - cleanOld))
      );
      nextAppliedDelta = Math.min(
        cleanNew,
        Math.max(0, roundCurrency(cleanOld + (nextUsed - c.used)))
      );
      return { ...c, used: nextUsed };
    }
    // Inflow (card payment) edit: restore prior payment, apply new payment
    const restored = roundCurrency(c.used + cleanOld);
    const nextUsed = Math.max(0, roundCurrency(restored - cleanNew));
    nextAppliedDelta = roundCurrency(restored - nextUsed);
    return { ...c, used: nextUsed };
  });

  return {
    cashOnHand: state.cashOnHand,
    banks: state.banks,
    creditCards: nextCards,
    nextAppliedDelta,
  };
}

/**
 * Marks today as checked-in and increments streakDays by +1 (awarding a buffer
 * shield on every 7th streak day) ONLY on the first check-in of the day.
 */
export function applyDaytimeCheckIn(
  state: Pick<
    PersistedBudgetState,
    'checkedInToday' | 'streakDays' | 'bufferShields'
  >,
  isToday: boolean
): {
  checkedInToday: boolean;
  streakDays: number;
  bufferShields: number;
} {
  if (!isToday || state.checkedInToday) {
    return {
      checkedInToday: state.checkedInToday,
      streakDays: state.streakDays,
      bufferShields: state.bufferShields,
    };
  }
  const nextStreak = state.streakDays + 1;
  const nextShields =
    nextStreak % 7 === 0 ? state.bufferShields + 1 : state.bufferShields;
  return {
    checkedInToday: true,
    streakDays: nextStreak,
    bufferShields: nextShields,
  };
}

export function findActiveUnclaimedTreat(
  treats: TreatVaultItem[],
  activeTreatId: string
): TreatVaultItem | null {
  return (
    treats.find((t) => t.id === activeTreatId && !t.claimed) ||
    treats.find((t) => !t.claimed) ||
    null
  );
}

/**
 * Allocates up to the active unclaimed treat's remaining target and spills any
 * overflow cleanly into savings so treats never become overfunded past 100%.
 */
export function allocateToTreatWithSpill(
  treats: TreatVaultItem[],
  activeTreatId: string,
  rawAmount: number,
  sourceField: 'fromRollovers' | 'fromImpulses' = 'fromRollovers'
): {
  nextTreats: TreatVaultItem[];
  treatAdded: number;
  spillToSavings: number;
  targetTreatId?: string;
} {
  const cleanAmount = Math.max(0, roundCurrency(rawAmount));
  if (cleanAmount <= 0) {
    return {
      nextTreats: treats,
      treatAdded: 0,
      spillToSavings: 0,
    };
  }

  const activeTreat = findActiveUnclaimedTreat(treats, activeTreatId);
  if (!activeTreat) {
    return {
      nextTreats: treats,
      treatAdded: 0,
      spillToSavings: cleanAmount,
    };
  }

  const remainingNeeded = Math.max(
    0,
    roundCurrency(activeTreat.target - activeTreat.funded)
  );
  const treatAdded = roundCurrency(Math.min(cleanAmount, remainingNeeded));
  const spillToSavings = roundCurrency(cleanAmount - treatAdded);

  if (treatAdded <= 0) {
    return {
      nextTreats: treats,
      treatAdded: 0,
      spillToSavings: cleanAmount,
    };
  }

  const nextTreats = treats.map((t) =>
    t.id === activeTreat.id
      ? {
          ...t,
          funded: roundCurrency(t.funded + treatAdded),
          [sourceField]: roundCurrency(t[sourceField] + treatAdded),
        }
      : t
  );

  return {
    nextTreats,
    treatAdded,
    spillToSavings,
    targetTreatId: activeTreat.id,
  };
}
