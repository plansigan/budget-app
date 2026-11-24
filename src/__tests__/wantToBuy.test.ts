import { describe, expect, it } from 'vitest';
import { addDaysToDateKey, getDaysUntilDateKey } from '../state/budgetMath';
import { budgetReducer } from '../state/budgetReducer';
import { createNewUserState, PersistedBudgetState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';

function makeWtbState(
  overrides: Partial<PersistedBudgetState> = {}
): PersistedBudgetState {
  const base = createNewUserState('2026-11-24');
  return {
    ...base,
    hasCompletedOnboarding: true,
    cashOnHand: 5000,
    banks: [{ id: 'bank-bpi', name: 'BPI', balance: 10000 }],
    creditCards: [
      { id: 'cc-bdo', name: 'BDO Visa', limit: 20000, used: 1000, cutoffDay: 15 },
    ],
    monthlySaved: 4000,
    sinkingFunds: [
      {
        id: 'sf-ef',
        name: 'Emergency Fund',
        icon: 'shield',
        target: 45000,
        saved: 6000,
        monthsToGoal: 12,
      },
    ],
    wantToBuyItems: [],
    ...overrides,
  };
}

describe('Things I Want to Buy (7-day cool-off)', () => {
  it('computes 7-day calendar countdown accurately across month boundaries', () => {
    expect(addDaysToDateKey('2026-11-24', 7)).toBe('2026-12-01');
    expect(getDaysUntilDateKey('2026-12-01', '2026-11-24')).toBe(7);
    expect(getDaysUntilDateKey('2026-12-01', '2026-12-01')).toBe(0);
    expect(getDaysUntilDateKey('2026-12-01', '2026-12-03')).toBe(-2);
  });

  it('adds, extends, skips (+score), and removes WantToBuy items', () => {
    let state = makeWtbState();
    state = budgetReducer(state, {
      type: 'ADD_WANT_TO_BUY',
      name: 'Espresso Machine',
      price: 3500,
      icon: 'coffee',
      note: 'Check if still wanted',
      todayKey: '2026-11-24',
    });

    expect(state.wantToBuyItems).toHaveLength(1);
    const id = state.wantToBuyItems[0].id;
    expect(state.wantToBuyItems[0]).toMatchObject({
      name: 'Espresso Machine',
      price: 3500,
      createdAt: '2026-11-24',
      reevaluateOn: '2026-12-01',
      status: 'waiting',
    });

    state = budgetReducer(state, {
      type: 'EXTEND_WANT_TO_BUY',
      id,
      extraDays: 7,
      todayKey: '2026-12-01',
    });
    expect(state.wantToBuyItems[0].reevaluateOn).toBe('2026-12-08');

    const prevScore = state.disciplineScore;
    state = budgetReducer(state, {
      type: 'SKIP_WANT_TO_BUY',
      id,
      todayKey: '2026-12-02',
    });
    expect(state.wantToBuyItems[0].status).toBe('skipped');
    expect(state.wantToBuyItems[0].resolvedAt).toBe('2026-12-02');
    expect(state.disciplineScore).toBe(Math.min(999, prevScore + 15));

    state = budgetReducer(state, { type: 'DELETE_WANT_TO_BUY', id });
    expect(state.wantToBuyItems).toHaveLength(0);
  });

  it('buys via Daily Spending, Savings Jar, or Sinking Fund and reverts cleanly on Undo', () => {
    const waitingItem = {
      id: 'wtb-1',
      name: 'Keyboard',
      price: 2500,
      icon: 'shopping-bag',
      createdAt: '2026-11-17',
      reevaluateOn: '2026-11-24',
      status: 'waiting' as const,
    };

    // 1) Daily spending option logs regular spend + debits cash
    const dailyBought = budgetReducer(
      makeWtbState({ wantToBuyItems: [waitingItem] }),
      {
        type: 'BUY_WANT_TO_BUY',
        id: 'wtb-1',
        fundingChoice: 'daily',
        paymentSourceId: 'cash',
        category: 'shop',
        todayKey: '2026-11-24',
      }
    );
    expect(dailyBought.cashOnHand).toBe(2500);
    expect(dailyBought.monthlySaved).toBe(4000);
    expect(dailyBought.entries[0]).toMatchObject({
      type: 'spend',
      amount: 2500,
      wantToBuyId: 'wtb-1',
      paymentSourceId: 'cash',
    });
    expect(dailyBought.wantToBuyItems[0].status).toBe('bought');

    const undoneDaily = budgetReducer(dailyBought, {
      type: 'UNDO_ENTRY',
      entryId: dailyBought.entries[0].id,
    });
    expect(undoneDaily.cashOnHand).toBe(5000);
    expect(undoneDaily.wantToBuyItems[0].status).toBe('waiting');
    expect(undoneDaily.wantToBuyItems[0].fundingChoice).toBeUndefined();

    // 2) Savings Jar option deducts monthlySaved + wallet without affecting Daily spend
    const jarBought = budgetReducer(
      makeWtbState({ wantToBuyItems: [waitingItem] }),
      {
        type: 'BUY_WANT_TO_BUY',
        id: 'wtb-1',
        fundingChoice: 'savings_jar',
        paymentSourceId: 'bank-bpi',
        todayKey: '2026-11-24',
      }
    );
    expect(jarBought.banks[0].balance).toBe(7500);
    expect(jarBought.monthlySaved).toBe(1500);
    expect(jarBought.entries[0]).toMatchObject({
      type: 'savings_spend',
      amount: 2500,
      savingsDelta: 2500,
      wantToBuyId: 'wtb-1',
      paymentSourceId: 'bank-bpi',
    });

    const undoneJar = budgetReducer(jarBought, {
      type: 'UNDO_ENTRY',
      entryId: jarBought.entries[0].id,
    });
    expect(undoneJar.banks[0].balance).toBe(10000);
    expect(undoneJar.monthlySaved).toBe(4000);
    expect(undoneJar.wantToBuyItems[0].status).toBe('waiting');

    // 3) Sinking Fund bucket option deducts bucket.saved and restores cleanly
    const fundBought = budgetReducer(
      makeWtbState({ wantToBuyItems: [waitingItem] }),
      {
        type: 'BUY_WANT_TO_BUY',
        id: 'wtb-1',
        fundingChoice: 'sinking_fund',
        sinkingFundId: 'sf-ef',
        paymentSourceId: 'none',
        todayKey: '2026-11-24',
      }
    );
    expect(fundBought.sinkingFunds[0].saved).toBe(3500);
    expect(fundBought.cashOnHand).toBe(5000);
    expect(fundBought.entries[0]).toMatchObject({
      type: 'savings_spend',
      sinkingFundId: 'sf-ef',
      savingsDelta: 2500,
      wantToBuyId: 'wtb-1',
    });

    const undoneFund = budgetReducer(fundBought, {
      type: 'UNDO_ENTRY',
      entryId: fundBought.entries[0].id,
    });
    expect(undoneFund.sinkingFunds[0].saved).toBe(6000);
    expect(undoneFund.wantToBuyItems[0].status).toBe('waiting');
  });

  it('normalizes legacy states lacking wantToBuyItems and validates savings_spend entries', () => {
    const normalized = normalizePersistedState({
      entries: [
        {
          id: 'ss-1',
          type: 'savings_spend',
          amount: 1200,
          label: 'Coat (From Savings Jar)',
          icon: 'shopping-bag',
          timestamp: '2026-11-24T04:00:00.000Z',
          dateKey: '2026-11-24',
          savingsDelta: 1200,
          wantToBuyId: 'wtb-legacy',
        },
      ],
    });
    expect(normalized.wantToBuyItems).toEqual([]);
    expect(normalized.entries[0].type).toBe('savings_spend');
    expect(normalized.entries[0].wantToBuyId).toBe('wtb-legacy');
  });
});
