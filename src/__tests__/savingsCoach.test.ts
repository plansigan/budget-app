import { describe, expect, it } from 'vitest';
import {
  CoachStateInput,
  computeBudgetHealth,
  detectNextUnlockedMilestone,
  generatePersonalizedTips,
} from '../utils/savingsCoach';

function makeCoachInput(overrides: Partial<CoachStateInput> = {}): CoachStateInput {
  const todayDay = new Date().getDate();
  return {
    settings: {
      monthlyIncome: 50000,
      fixedBills: 15000,
      monthlySavingsGoal: 8000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    },
    monthlySaved: 2000,
    baseDailyAllowance: 900,
    safeToSpendToday: 777,
    cashOnHand: 5678,
    banks: [{ id: 'b1', name: 'BPI', balance: 40000 }],
    creditCards: [
      { id: 'cc1', name: 'BDO Visa', limit: 20000, used: 12345, cutoffDay: todayDay },
    ],
    treats: [],
    entries: [],
    streakDays: 2,
    privacyMode: false,
    ...overrides,
  };
}

describe('savingsCoach', () => {
  it('computes 50/30/20 budget health metrics and guards against 0 income', () => {
    const healthy = computeBudgetHealth({
      monthlyIncome: 50000,
      fixedBills: 25000,
      monthlySavingsGoal: 10000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    });
    expect(healthy.billsPct).toBe(50);
    expect(healthy.savingsPct).toBe(20);
    expect(healthy.dailyPct).toBe(30);
    expect(healthy.emergencyTarget3Mo).toBe(75000);
    expect(healthy.emergencyTarget6Mo).toBe(150000);

    const zeroIncome = computeBudgetHealth({
      monthlyIncome: 0,
      fixedBills: 5000,
      monthlySavingsGoal: 1000,
      salaryFrequency: 1,
      payday1: 15,
      payday2: 30,
    });
    expect(zeroIncome.billsPct).toBe(0);
    expect(zeroIncome.savingsPct).toBe(0);
    expect(zeroIncome.dailyPct).toBe(0);
    expect(zeroIncome.emergencyTarget3Mo).toBe(15000);
  });

  it('masks user balances and card utilization figures when privacyMode is true', () => {
    const publicTips = generatePersonalizedTips(makeCoachInput({ privacyMode: false }));
    const publicJoined = publicTips.map((t) => `${t.title} ${t.body}`).join('\n');
    expect(publicJoined).toContain('12,345');
    expect(publicJoined).toContain('777');
    expect(publicJoined).toContain('45,678');
    expect(publicJoined).toContain('90,000');

    const privateTips = generatePersonalizedTips(makeCoachInput({ privacyMode: true }));
    const privateJoined = privateTips.map((t) => `${t.title} ${t.body}`).join('\n');
    expect(privateJoined).toContain('₱••••');
    expect(privateJoined).not.toContain('12,345');
    expect(privateJoined).not.toContain('777');
    expect(privateJoined).not.toContain('45,678');
    expect(privateJoined).not.toContain('90,000');
  });

  it('detects the next newly unlocked milestone and returns null when all earned are seen', () => {
    const input = makeCoachInput({
      monthlySaved: 1500,
      streakDays: 3,
      entries: [
        {
          id: 't1',
          type: 'treat_direct',
          amount: 100,
          label: 'Treat',
          icon: 'gift',
          timestamp: '2026-04-10T04:00:00.000Z',
        },
      ],
    });

    const first = detectNextUnlockedMilestone(input, []);
    expect(first?.id).toBe('first_save');

    const afterFirst = detectNextUnlockedMilestone(input, ['first_save']);
    expect(afterFirst?.id).toBe('first_treat_fund');

    const afterAllEarned = detectNextUnlockedMilestone(input, [
      'first_save',
      'first_treat_fund',
      'saved_1k',
      'streak_3',
    ]);
    expect(afterAllEarned).toBeNull();
  });
});
