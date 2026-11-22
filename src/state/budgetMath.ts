import {
  BillItem,
  BudgetSettings,
  DaySummary,
  InstallmentItem,
  SpendingEnvelopeItem,
  TransactionEntry,
} from '../types/budget';
import { formatLocalDateKey } from '../utils/transactionDisplay';

export function sumBills(items: BillItem[]): number {
  return roundCurrency(
    items.reduce((acc, item) => acc + Math.max(0, item.amount), 0)
  );
}

export function getTodayKey(fromDate: Date = new Date()): string {
  return formatLocalDateKey(fromDate);
}

export function parseDateKeyLocal(dateKey: string): Date {
  const parts = dateKey.split('-').map((n) => parseInt(n, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function safeNum(
  value: unknown,
  fallback: number,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getBudgetedInstallmentsTotal(
  installments: InstallmentItem[]
): number {
  return roundCurrency(
    installments
      .filter((item) => item.includeInBudget && item.paidMonths < item.totalMonths)
      .reduce((sum, item) => sum + Math.max(0, item.monthlyAmount), 0)
  );
}

export function getMonthlyEnvelopeAllocation(
  envelope: SpendingEnvelopeItem,
  salaryFrequency: 1 | 2
): number {
  const multiplier = envelope.cadence === 'per_payday' ? salaryFrequency : 1;
  return roundCurrency(Math.max(0, envelope.amountPerCycle) * multiplier);
}

export function getTotalMonthlyEnvelopes(
  envelopes: SpendingEnvelopeItem[],
  salaryFrequency: 1 | 2
): number {
  return envelopes.reduce(
    (sum, env) =>
      roundCurrency(sum + getMonthlyEnvelopeAllocation(env, salaryFrequency)),
    0
  );
}

export function computeBaseDailyAllowance(
  settings: BudgetSettings,
  extraMonthlyFixed: number = 0,
  referenceDate: Date = new Date()
): number {
  const discretionary =
    settings.monthlyIncome -
    settings.fixedBills -
    Math.max(0, extraMonthlyFixed) -
    settings.monthlySavingsGoal;
  const days = getDaysInMonth(referenceDate);
  return Math.max(0, Math.round((discretionary / days) * 100) / 100);
}

export function computeDayMetricsFromEntries(
  entries: TransactionEntry[],
  dateKey: string,
  baseDaily: number,
  rolloverForToday: number,
  todayKey: string,
  fallbackDateKey: string
): DaySummary {
  const dayEntries = entries.filter(
    (e) => (e.dateKey || fallbackDateKey) === dateKey
  );

  let spent = 0;
  let savedOrSkipped = 0;

  for (const e of dayEntries) {
    if (
      e.type === 'spend' ||
      e.type === 'save_direct' ||
      e.type === 'treat_direct'
    ) {
      spent = roundCurrency(spent + e.amount);
    }
    if (e.type === 'midnight_split' && typeof e.savingsDelta === 'number') {
      spent = roundCurrency(spent + e.amount + e.savingsDelta);
    }
    if (
      e.type === 'treat_direct' ||
      e.type === 'impulse_skipped' ||
      e.type === 'save_direct'
    ) {
      savedOrSkipped = roundCurrency(savedOrSkipped + e.amount);
    }
    if (e.type === 'midnight_split') {
      savedOrSkipped = roundCurrency(
        savedOrSkipped + e.amount + (e.savingsDelta || 0)
      );
    }
  }

  const rollover = dateKey === todayKey ? rolloverForToday : 0;
  const safeRemaining = roundCurrency(baseDaily + rollover - spent);

  return {
    spent,
    savedOrSkipped,
    safeRemaining,
    entriesCount: dayEntries.length,
  };
}
