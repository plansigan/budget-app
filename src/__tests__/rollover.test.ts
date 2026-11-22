import { describe, expect, it } from 'vitest';
import { roundCurrency } from '../state/budgetMath';
import { createNewUserState, PersistedBudgetState } from '../state/defaults';
import { applyMidnightRollover } from '../state/rollover';

function makeBaseState(overrides: Partial<PersistedBudgetState> = {}): PersistedBudgetState {
  const base = createNewUserState('2026-04-10');
  return {
    ...base,
    hasCompletedOnboarding: true,
    settings: {
      monthlyIncome: 30000,
      fixedBills: 10000,
      monthlySavingsGoal: 5000,
      salaryFrequency: 2,
      payday1: 15,
      payday2: 30,
    },
    billItems: [{ id: 'b1', name: 'Rent', icon: 'home', amount: 10000 }],
    // April has 30 days -> discretionary 15,000 / 30 = 500/day
    rolloverBalance: 0,
    monthlySaved: 1000,
    streakDays: 6,
    bufferShields: 1,
    disciplineScore: 760,
    ...overrides,
  };
}

describe('applyMidnightRollover', () => {
  it('splits remaining budget 50/50 into the active Treat Vault on consecutive day rollover', () => {
    const state = makeBaseState({
      activeTreatId: 'treat-1',
      treats: [
        {
          id: 'treat-1',
          name: 'Samgyup Night',
          icon: 'gift',
          target: 1500,
          funded: 200,
          fromImpulses: 100,
          fromRollovers: 100,
          claimed: false,
        },
      ],
      entries: [
        {
          id: 'sp-1',
          type: 'spend',
          amount: 100,
          label: 'Lunch',
          icon: 'shopping-bag',
          timestamp: '2026-04-10T04:00:00.000Z',
          dateKey: '2026-04-10',
        },
      ],
    });

    // Safe remaining = 500 - 100 = 400 -> 200 vault, 200 rollover
    const res = applyMidnightRollover(state, '2026-04-11', 0);
    expect(res.vaultAdded).toBe(200);
    expect(res.rolloverNext).toBe(200);
    expect(res.nextState.rolloverBalance).toBe(200);
    expect(res.nextState.monthlySaved).toBe(1000); // went to treat, not monthlySaved
    expect(res.nextState.treats[0].funded).toBe(400);
    expect(res.nextState.treats[0].fromRollovers).toBe(300);
    expect(res.nextState.streakDays).toBe(7);
    expect(res.nextState.bufferShields).toBe(2); // earned shield at 7-day milestone
    expect(res.nextState.disciplineScore).toBe(770);
    expect(res.nextState.lastActiveDate).toBe('2026-04-11');
    expect(res.nextState.entries[0]).toMatchObject({
      type: 'midnight_split',
      amount: 200,
      savingsDelta: 0,
      rolloverDelta: 200,
      isAutoRollover: true,
    });
  });

  it('sends 50% vault share directly to monthlySaved when no active unclaimed treat exists', () => {
    const state = makeBaseState({
      activeTreatId: '',
      treats: [
        {
          id: 'treat-done',
          name: 'Claimed Reward',
          icon: 'gift',
          target: 500,
          funded: 500,
          fromImpulses: 0,
          fromRollovers: 500,
          claimed: true,
        },
      ],
    });

    const res = applyMidnightRollover(state, '2026-04-11', 0);
    expect(res.vaultAdded).toBe(250);
    expect(res.rolloverNext).toBe(250);
    expect(res.nextState.monthlySaved).toBe(1250);
    expect(res.nextState.entries[0]).toMatchObject({
      type: 'midnight_split',
      amount: 0,
      savingsDelta: 250,
      rolloverDelta: 250,
      isAutoRollover: true,
    });
  });

  it('consumes buffer shields for multi-day gaps and resets streak when gap exceeds shields', () => {
    const coveredState = makeBaseState({
      streakDays: 4,
      bufferShields: 2,
    });
    // 2026-04-10 -> 2026-04-12 => daysElapsed = 2, missedDays = 1 <= 2 shields
    const covered = applyMidnightRollover(coveredState, '2026-04-12', 0);
    expect(covered.nextState.streakDays).toBe(5);
    expect(covered.nextState.bufferShields).toBe(1);

    // 2026-04-10 -> 2026-04-15 => daysElapsed = 5, missedDays = 4 > 1 shield
    const blown = applyMidnightRollover(
      makeBaseState({ streakDays: 5, bufferShields: 1 }),
      '2026-04-15',
      0,
    );
    expect(blown.nextState.streakDays).toBe(0);
    expect(blown.nextState.bufferShields).toBe(0);
  });

  it('archives completed month snapshot and resets monthlySaved across month boundary without duplicates', () => {
    // March has 31 days -> discretionary 15,000 / 31 = 483.87
    const marchState = makeBaseState({
      lastActiveDate: '2026-03-31',
      activeTreatId: '',
      treats: [],
      monthlySaved: 2000,
      monthlyArchives: [
        {
          monthKey: '2026-03',
          monthTitle: 'MARCH 2026 WRAP-UP',
          totalSpent: 0,
          totalSaved: 100,
          savingsRatePct: 0,
          monthlyIncome: 30000,
          monthlySavingsGoal: 5000,
          streakDays: 1,
          disciplineScore: 760,
          topCategoryLabel: 'None',
          topCategoryAmount: 0,
          topSourceLabel: 'None',
          txCount: 0,
          grade: 'C',
          headline: 'old',
        },
      ],
    });

    const res = applyMidnightRollover(marchState, '2026-04-01', 0);
    expect(res.nextState.monthlySaved).toBe(0);
    const marchArchives = res.nextState.monthlyArchives.filter((a) => a.monthKey === '2026-03');
    expect(marchArchives).toHaveLength(1);
    expect(marchArchives[0].totalSaved).toBe(
      roundCurrency(2000 + res.vaultAdded)
    );
  });
});
