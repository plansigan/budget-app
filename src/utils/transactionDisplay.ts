import { ThemeShade } from '../theme/palette';
import { TransactionEntry } from '../types/budget';
import { formatPeso } from './numberFormat';

export interface TransactionPresentation {
  deltaText: string;
  deltaColor: string;
  csvSignedAmount: number;
  isTreatHighlight: boolean;
}

/**
 * Formats a Date into a local YYYY-MM-DD key without UTC conversion drift.
 */
export function formatLocalDateKey(dt: Date = new Date()): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves a transaction entry's local YYYY-MM-DD date key, parsing ISO timestamps
 * in local timezone instead of slicing the UTC prefix.
 */
export function formatEntryDateLocal(
  entry: TransactionEntry,
  fallbackDateKey?: string
): string {
  if (entry.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey)) {
    return entry.dateKey;
  }
  if (entry.timestamp) {
    const parsed = new Date(entry.timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDateKey(parsed);
    }
  }
  if (fallbackDateKey && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDateKey)) {
    return fallbackDateKey;
  }
  return formatLocalDateKey(new Date());
}

/**
 * Unified presentation formatter for all transaction types across TodayScreen,
 * TreatVaultScreen, WalletScreen, and CSV exports.
 */
export function getTransactionPresentation(
  entry: TransactionEntry,
  shade: ThemeShade,
  privacyMode: boolean
): TransactionPresentation {
  const maskIfNeeded = (visibleText: string) =>
    privacyMode ? '₱••••' : visibleText;

  switch (entry.type) {
    case 'spend': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`-${formatPeso(amt)}`),
        deltaColor: shade.text,
        csvSignedAmount: -amt,
        isTreatHighlight: false,
      };
    }

    case 'installment_paid':
    case 'bill_paid': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`-${formatPeso(amt)}`),
        deltaColor: shade.text,
        csvSignedAmount: -amt,
        isTreatHighlight: false,
      };
    }

    case 'envelope_spend': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`-${formatPeso(amt)}`),
        deltaColor: shade.dopamine,
        csvSignedAmount: -amt,
        isTreatHighlight: true,
      };
    }

    case 'envelope_refill': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`+${formatPeso(amt)} Env`),
        deltaColor: shade.positive,
        csvSignedAmount: 0,
        isTreatHighlight: false,
      };
    }

    case 'save_direct': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`+${formatPeso(amt)} Saved`),
        deltaColor: shade.positive,
        csvSignedAmount: amt,
        isTreatHighlight: false,
      };
    }

    case 'treat_direct':
    case 'impulse_skipped': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`+${formatPeso(amt)} Treat`),
        deltaColor: shade.dopamine,
        csvSignedAmount: amt,
        isTreatHighlight: true,
      };
    }

    case 'sinking_fund': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`+${formatPeso(amt)} Fund`),
        deltaColor: shade.positive,
        csvSignedAmount: amt,
        isTreatHighlight: false,
      };
    }

    case 'wallet_deposit': {
      const amt = Math.abs(entry.amount);
      const isCardPayment =
        entry.icon === 'credit-card' ||
        /payment/i.test(entry.label || '');
      return {
        deltaText: maskIfNeeded(
          isCardPayment ? `Paid ${formatPeso(amt)}` : `+${formatPeso(amt)}`
        ),
        deltaColor: shade.positive,
        csvSignedAmount: amt,
        isTreatHighlight: false,
      };
    }

    case 'wallet_adjust': {
      const delta =
        typeof entry.signedDelta === 'number'
          ? entry.signedDelta
          : entry.amount;
      const absDelta = Math.abs(delta);
      const isPositive = delta >= 0;
      return {
        deltaText: maskIfNeeded(
          `${isPositive ? '+' : '-'}${formatPeso(absDelta)}`
        ),
        deltaColor: isPositive ? shade.positive : shade.warning,
        csvSignedAmount: delta,
        isTreatHighlight: false,
      };
    }

    case 'wallet_transfer': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(formatPeso(amt)),
        deltaColor: shade.accent,
        csvSignedAmount: 0,
        isTreatHighlight: false,
      };
    }

    case 'debt_outflow': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`-${formatPeso(amt)}`),
        deltaColor: shade.text,
        csvSignedAmount: -amt,
        isTreatHighlight: false,
      };
    }

    case 'debt_inflow': {
      const amt = Math.abs(entry.amount);
      return {
        deltaText: maskIfNeeded(`+${formatPeso(amt)}`),
        deltaColor: shade.positive,
        csvSignedAmount: amt,
        isTreatHighlight: false,
      };
    }

    case 'midnight_split': {
      const savingsAmt = Math.max(0, entry.savingsDelta ?? 0);
      const treatAmt = Math.max(0, entry.amount);
      const rolloverAmt = Math.max(0, entry.rolloverDelta ?? 0);
      const parts: string[] = [];

      if (savingsAmt > 0) {
        parts.push(`+${formatPeso(savingsAmt)} Sav`);
      }
      if (treatAmt > 0) {
        parts.push(`+${formatPeso(treatAmt)} Treat`);
      }
      if (rolloverAmt > 0) {
        parts.push(`+${formatPeso(rolloverAmt)} Roll`);
      }

      const visible = parts.length > 0 ? parts.join(' / ') : `+${formatPeso(0)}`;
      return {
        deltaText: maskIfNeeded(visible),
        deltaColor: savingsAmt > 0 ? shade.positive : shade.dopamine,
        csvSignedAmount: treatAmt + savingsAmt,
        isTreatHighlight: treatAmt > 0 && savingsAmt === 0,
      };
    }
  }
}
