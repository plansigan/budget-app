import { TransactionEntry, TransactionType } from '../../types/budget';
import { formatEntryDateLocal } from '../../utils/transactionDisplay';

export type HistoryFilterKey =
  | 'all'
  | 'spend'
  | 'envelopes'
  | 'bills'
  | 'debts'
  | 'savings'
  | 'wallet';

export const HISTORY_FILTERS: Array<{ key: HistoryFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'spend', label: 'Spends' },
  { key: 'envelopes', label: 'Allowances' },
  { key: 'bills', label: 'Bills' },
  { key: 'debts', label: 'Debts' },
  { key: 'savings', label: 'Savings' },
  { key: 'wallet', label: 'Wallet' },
];

export function matchesHistoryFilter(
  type: TransactionType,
  filter: HistoryFilterKey
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'spend':
      return type === 'spend' || type === 'savings_spend';
    case 'envelopes':
      return type === 'envelope_spend' || type === 'envelope_refill';
    case 'bills':
      return type === 'bill_paid' || type === 'installment_paid';
    case 'debts':
      return type === 'debt_outflow' || type === 'debt_inflow';
    case 'savings':
      return (
        type === 'save_direct' ||
        type === 'treat_direct' ||
        type === 'impulse_skipped' ||
        type === 'midnight_split' ||
        type === 'sinking_fund' ||
        type === 'savings_spend'
      );
    case 'wallet':
      return (
        type === 'wallet_deposit' ||
        type === 'wallet_adjust' ||
        type === 'wallet_transfer'
      );
  }
}

export function filterHistoryEntries(
  entries: TransactionEntry[],
  filterKey: HistoryFilterKey,
  monthFilter: string | null,
  query: string
): TransactionEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!matchesHistoryFilter(entry.type, filterKey)) return false;
    const entryDate = formatEntryDateLocal(entry);
    if (monthFilter && !entryDate.startsWith(monthFilter)) return false;
    if (needle) {
      const haystack = [
        entry.label,
        entry.paymentSourceLabel || '',
        entry.toPaymentSourceLabel || '',
        entryDate,
        entry.category || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
