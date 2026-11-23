import { describe, expect, it } from 'vitest';
import {
  computeBaseDailyAllowance,
  computeDayMetricsFromDayEntries,
  computeDayMetricsFromEntries,
  getBudgetedInstallmentsTotal,
  sumBills,
} from '../state/budgetMath';
import { BudgetSettings, InstallmentItem, TransactionEntry } from '../types/budget';

const BASE_SETTINGS: BudgetSettings = {
  monthlyIncome: 40000,
  fixedBills: 15000,
  monthlySavingsGoal: 5000,
  salaryFrequency: 2,
  payday1: 15,
  payday2: 30,
};

describe('budgetMath', () => {
  it('sums positive bill items and ignores negative amounts', () => {
    const total = sumBills([
      { id: '1', name: 'Rent', icon: 'home', amount: 8000 },
      { id: '2', name: 'Power', icon: 'zap', amount: 2500 },
      { id: '3', name: 'Invalid', icon: 'tag', amount: -500 },
    ]);
    expect(total).toBe(10500);
    expect(sumBills([])).toBe(0);
  });

  it('counts only active installments marked includeInBudget', () => {
    const items: InstallmentItem[] = [
      {
        id: 'inst-1',
        name: 'Phone',
        provider: 'BDO',
        monthlyAmount: 2500,
        totalMonths: 12,
        paidMonths: 4,
        includeInBudget: true,
      },
      {
        id: 'inst-2',
        name: 'Laptop',
        provider: 'BPI',
        monthlyAmount: 3000,
        totalMonths: 6,
        paidMonths: 6, // finished
        includeInBudget: true,
      },
      {
        id: 'inst-3',
        name: 'Watch',
        provider: 'Home Credit',
        monthlyAmount: 1500,
        totalMonths: 6,
        paidMonths: 1,
        includeInBudget: false,
      },
    ];
    expect(getBudgetedInstallmentsTotal(items)).toBe(2500);
  });

  it('computes daily allowance accurately across month lengths and clamps negatives', () => {
    // 40,000 - 15,000 - 5,000 = 20,000 discretionary
    expect(computeBaseDailyAllowance(BASE_SETTINGS, 0, new Date(2026, 3, 10))).toBe(666.67); // Apr (30d)
    expect(computeBaseDailyAllowance(BASE_SETTINGS, 0, new Date(2026, 0, 10))).toBe(645.16); // Jan (31d)
    expect(computeBaseDailyAllowance(BASE_SETTINGS, 0, new Date(2025, 1, 10))).toBe(714.29); // Feb non-leap (28d)
    expect(computeBaseDailyAllowance(BASE_SETTINGS, 0, new Date(2024, 1, 10))).toBe(689.66); // Feb leap (29d)
    expect(computeBaseDailyAllowance(BASE_SETTINGS, 25000, new Date(2026, 3, 10))).toBe(0);
  });

  it('computes day spend, savedOrSkipped, and safeRemaining without mixing non-daily types', () => {
    const entries: TransactionEntry[] = [
      {
        id: '1',
        type: 'spend',
        amount: 180,
        label: 'Coffee',
        icon: 'coffee',
        timestamp: '2026-04-10T01:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '2',
        type: 'impulse_skipped',
        amount: 250,
        label: 'Skipped Milk Tea',
        icon: 'coffee',
        timestamp: '2026-04-10T03:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '3',
        type: 'save_direct',
        amount: 120,
        label: 'Saved to Jar',
        icon: 'shield',
        timestamp: '2026-04-10T05:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '4',
        type: 'sinking_fund',
        amount: 1000,
        label: 'Emergency Fund',
        icon: 'umbrella',
        timestamp: '2026-04-10T06:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '5',
        type: 'installment_paid',
        amount: 2000,
        label: 'Phone Payment',
        icon: 'credit-card',
        timestamp: '2026-04-10T07:00:00.000Z',
        dateKey: '2026-04-10',
      },
    ];

    const todaySummary = computeDayMetricsFromEntries(
      entries,
      '2026-04-10',
      600,
      100,
      '2026-04-10',
      '2026-04-10',
    );
    expect(todaySummary.spent).toBe(300); // 180 spend + 120 save_direct
    expect(todaySummary.savedOrSkipped).toBe(370); // 250 impulse_skipped + 120 save_direct
    expect(todaySummary.safeRemaining).toBe(400); // (600 + 100 rollover) - 300
    expect(todaySummary.entriesCount).toBe(5);

    const pastSummary = computeDayMetricsFromEntries(
      entries,
      '2026-04-10',
      600,
      100,
      '2026-04-11',
      '2026-04-10',
    );
    expect(pastSummary.safeRemaining).toBe(300); // rollover only applies on todayKey

    const indexedSummary = computeDayMetricsFromDayEntries(
      entries,
      '2026-04-10',
      600,
      100,
      '2026-04-10',
    );
    expect(indexedSummary).toEqual(todaySummary);
  });
});
