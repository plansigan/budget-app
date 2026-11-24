import { describe, expect, it } from 'vitest';
import {
  classifySpendCategory,
  computeMonthlyWrapUp,
  computeSinkingFundPace,
  computeSpendingBreakdown,
} from '../utils/insightsEngine';
import { formatEntryDateLocal, formatLocalDateKey } from '../utils/transactionDisplay';
import { getDaysUntilDayOfMonth, TransactionEntry } from '../types/budget';

describe('insightsEngine & transactionDisplay', () => {
  it('formats local date keys accurately around UTC+8 midnight and honors explicit dateKey', () => {
    const localMidnight = new Date(2026, 2, 15, 0, 5, 0); // 2026-03-15 00:05 local
    expect(formatLocalDateKey(localMidnight)).toBe('2026-03-15');

    const withDateKey: TransactionEntry = {
      id: '1',
      type: 'spend',
      amount: 100,
      label: 'Midnight snack',
      icon: 'tag',
      timestamp: '2026-03-14T16:05:00.000Z',
      dateKey: '2026-03-15',
    };
    expect(formatEntryDateLocal(withDateKey)).toBe('2026-03-15');
  });

  it('classifies spend categories with word boundaries and respects explicit category', () => {
    const base = {
      id: 'x',
      type: 'spend' as const,
      amount: 100,
      icon: 'tag',
      timestamp: '2026-04-10T05:00:00.000Z',
    };

    expect(classifySpendCategory({ ...base, label: 'Grilled steak' }).key).toBe('other'); // not "tea" -> cafe
    expect(classifySpendCategory({ ...base, label: 'Business lunch' }).key).toBe('food'); // not "bus" -> ride
    expect(classifySpendCategory({ ...base, label: 'Refund processing' }).key).toBe('other'); // not "fun"
    expect(
      classifySpendCategory({ ...base, label: 'Steak & tea', category: 'health' }).key,
    ).toBe('health');
  });

  it('computes spending breakdown sorted by highest slice for week and month', () => {
    const now = new Date(2026, 3, 10, 12, 0, 0); // 2026-04-10
    const entries: TransactionEntry[] = [
      {
        id: '1',
        type: 'spend',
        amount: 300,
        label: 'GrabFood lunch',
        icon: 'shopping-bag',
        timestamp: '2026-04-09T04:00:00.000Z',
        dateKey: '2026-04-09',
      },
      {
        id: '2',
        type: 'spend',
        amount: 150,
        label: 'Iced Latte',
        icon: 'coffee',
        timestamp: '2026-04-10T01:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '3',
        type: 'spend',
        amount: 550,
        label: 'Earlier in April',
        icon: 'shopping-cart',
        timestamp: '2026-04-01T04:00:00.000Z',
        dateKey: '2026-04-01',
      },
    ];

    const weekRes = computeSpendingBreakdown(entries, 'week', now);
    expect(weekRes.totalSpent).toBe(450);
    expect(weekRes.topSlice?.key).toBe('food');

    const monthRes = computeSpendingBreakdown(entries, 'month', now, '2026-04');
    expect(monthRes.totalSpent).toBe(1000);
    expect(monthRes.topSlice?.key).toBe('shop');
  });

  it('computes sinking fund remaining, pct, and ceiling monthlyNeeded', () => {
    const pace = computeSinkingFundPace(
      { id: 'sf', name: 'Travel', icon: 'plane', target: 10000, saved: 2500, monthsToGoal: 4 },
      new Date(2026, 3, 1),
    );
    expect(pace.remaining).toBe(7500);
    expect(pace.pct).toBe(25);
    expect(pace.monthlyNeeded).toBe(1875);
    expect(pace.targetMonthLabel).toBe('Aug 2026');

    const reached = computeSinkingFundPace({
      id: 'sf2',
      name: 'Done',
      icon: 'shield',
      target: 5000,
      saved: 5000,
      monthsToGoal: 3,
    });
    expect(reached.targetMonthLabel).toBe('Goal Reached!');
  });

  it('includes sinking fund deposits in monthly wrap-up totalSaved and redacts shareText in privacyMode', () => {
    const entries: TransactionEntry[] = [
      {
        id: 'sp',
        type: 'spend',
        amount: 1200,
        label: 'Lunch',
        icon: 'shopping-bag',
        timestamp: '2026-04-08T04:00:00.000Z',
        dateKey: '2026-04-08',
        paymentSourceLabel: 'GCash',
      },
      {
        id: 'sf',
        type: 'sinking_fund',
        amount: 2500,
        label: 'Emergency Fund',
        icon: 'umbrella',
        timestamp: '2026-04-09T04:00:00.000Z',
        dateKey: '2026-04-09',
      },
    ];

    const wrapPublic = computeMonthlyWrapUp({
      settings: {
        monthlyIncome: 40000,
        fixedBills: 15000,
        monthlySavingsGoal: 10000,
        salaryFrequency: 2,
        payday1: 15,
        payday2: 30,
      },
      monthlySaved: 8000,
      entries,
      streakDays: 9,
      disciplineScore: 840,
      monthKey: '2026-04',
      privacyMode: false,
    });
    expect(wrapPublic.totalSaved).toBe(10500);
    expect(wrapPublic.grade).toBe('A+');
    expect(wrapPublic.shareText).toContain('Saved: ₱10,500.00');
    expect(wrapPublic.shareText).toContain('Spent: ₱1,200.00');

    const wrapPrivate = computeMonthlyWrapUp({
      settings: {
        monthlyIncome: 40000,
        fixedBills: 15000,
        monthlySavingsGoal: 10000,
        salaryFrequency: 2,
        payday1: 15,
        payday2: 30,
      },
      monthlySaved: 8000,
      entries,
      streakDays: 9,
      disciplineScore: 840,
      monthKey: '2026-04',
      privacyMode: true,
    });
    expect(wrapPrivate.shareText).not.toContain('₱10,500.00');
    expect(wrapPrivate.shareText).not.toContain('₱1,200.00');
    expect(wrapPrivate.shareText).toContain('Savings Rate:');
  });

  it('computes cross-month upcoming bill countdown and chronological ordering across month-end', () => {
    const april29 = new Date(2026, 3, 29, 9, 0, 0);
    const bills = [
      { name: 'May 2 Rent', dueDay: 2 },
      { name: 'Apr 30 Net', dueDay: 30 },
      { name: 'Apr 29 Power', dueDay: 29 },
    ]
      .map((b) => ({ ...b, daysLeft: getDaysUntilDayOfMonth(b.dueDay, april29) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    expect(bills).toEqual([
      { name: 'Apr 29 Power', dueDay: 29, daysLeft: 0 },
      { name: 'Apr 30 Net', dueDay: 30, daysLeft: 1 },
      { name: 'May 2 Rent', dueDay: 2, daysLeft: 3 },
    ]);
  });
});
