import {
  DebtDirection,
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendCategoryKey,
  ThemeMode,
} from '../../types/budget';
import { OnboardingParams, PersistedBudgetState } from '../defaults';

export type BudgetAction =
  | { type: 'HYDRATE'; state: PersistedBudgetState }
  | {
      type: 'APPLY_ROLLOVER';
      newDateKey: string;
      minimumSplitFallback?: number;
    }
  | { type: 'UNLOCK_MILESTONE'; milestoneId: string }
  | { type: 'BOOST_SAVINGS_GOAL'; delta: number }
  | {
      type: 'LOG_SPEND';
      amount: number;
      label: string;
      icon: string;
      paymentSourceId: string;
      category?: SpendCategoryKey;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'FUND_ACTIVE_TREAT';
      amount: number;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'SAVE_TO_JAR';
      amount: number;
      dateKey: string;
      todayKey?: string;
    }
  | {
      type: 'BANK_TODAY_SURPLUS';
      dateKey: string;
      todayKey?: string;
    }
  | { type: 'CLAIM_TREAT'; treatId: string }
  | { type: 'ADD_TREAT'; name: string; icon: string; target: number }
  | { type: 'DELETE_TREAT'; treatId: string }
  | { type: 'SET_ACTIVE_TREAT'; treatId: string }
  | { type: 'UNDO_ENTRY'; entryId: string }
  | {
      type: 'UPDATE_BUDGET_CONFIG';
      income: number;
      bills: number;
      savings: number;
    }
  | {
      type: 'UPDATE_SALARY_SCHEDULE';
      frequency: 1 | 2;
      payday1: number;
      payday2: number;
    }
  | { type: 'UPDATE_BILL_AMOUNT'; billId: string; amount: number }
  | {
      type: 'UPDATE_BILL_ITEM';
      billId: string;
      name: string;
      icon: string;
      amount: number;
      dueDay?: number;
    }
  | {
      type: 'ADD_BILL_ITEM';
      name: string;
      icon: string;
      amount: number;
      dueDay?: number;
    }
  | { type: 'UPDATE_BILL_DUE_DAY'; billId: string; dueDay?: number }
  | {
      type: 'MARK_BILL_PAID';
      billId: string;
      paymentSourceId?: string;
      amountOverride?: number;
      todayKey?: string;
    }
  | { type: 'REMOVE_BILL_ITEM'; billId: string }
  | {
      type: 'DEPOSIT_TO_WALLET';
      sourceId: string;
      amount: number;
      note?: string;
      todayKey?: string;
    }
  | {
      type: 'SET_ACCOUNT_BALANCE';
      sourceId: string;
      newBalance: number;
      note?: string;
      todayKey?: string;
    }
  | { type: 'ADD_BANK'; name: string; balance: number }
  | { type: 'UPDATE_BANK'; bankId: string; name: string }
  | { type: 'REMOVE_BANK'; bankId: string }
  | {
      type: 'ADD_CREDIT_CARD';
      name: string;
      limit: number;
      used: number;
      cutoffDay: number;
    }
  | {
      type: 'UPDATE_CREDIT_CARD';
      cardId: string;
      name: string;
      limit: number;
      cutoffDay: number;
    }
  | { type: 'REMOVE_CREDIT_CARD'; cardId: string }
  | { type: 'COMPLETE_ONBOARDING'; params: OnboardingParams }
  | { type: 'REOPEN_ONBOARDING' }
  | { type: 'CANCEL_REOPENED_ONBOARDING' }
  | { type: 'COMPLETE_TUTORIAL' }
  | { type: 'OPEN_TUTORIAL' }
  | { type: 'RESET_NEW_USER'; todayKey?: string }
  | { type: 'RESET_DEMO'; todayKey?: string }
  | { type: 'TOGGLE_PRIVACY_MODE' }
  | { type: 'SET_THEME_MODE'; mode: ThemeMode }
  | {
      type: 'LOG_PAYDAY_CHECKIN';
      amount: number;
      sourceId: string;
      savingsAllocation: number;
      note?: string;
      todayKey?: string;
      refillEnvelopeIds?: string[];
    }
  | { type: 'DISMISS_PAYDAY_PROMPT'; dateKey: string }
  | {
      type: 'ADD_ENVELOPE';
      name: string;
      icon: string;
      amountPerCycle: number;
      cadence: EnvelopeCadence;
      rolloverMode: EnvelopeRolloverMode;
    }
  | {
      type: 'UPDATE_ENVELOPE';
      id: string;
      name: string;
      icon: string;
      amountPerCycle: number;
      cadence: EnvelopeCadence;
      rolloverMode: EnvelopeRolloverMode;
      balance?: number;
    }
  | { type: 'DELETE_ENVELOPE'; id: string }
  | {
      type: 'SPEND_FROM_ENVELOPE';
      envelopeId: string;
      amount: number;
      label: string;
      icon: string;
      paymentSourceId?: string;
      category?: SpendCategoryKey;
      dateKey: string;
      todayKey?: string;
    }
  | { type: 'REFILL_ENVELOPE'; envelopeId: string; todayKey?: string }
  | {
      type: 'ADD_INSTALLMENT';
      params: {
        name: string;
        provider: string;
        monthlyAmount: number;
        totalMonths: number;
        paidMonths: number;
        includeInBudget: boolean;
      };
    }
  | {
      type: 'UPDATE_INSTALLMENT';
      id: string;
      params: {
        name: string;
        provider: string;
        monthlyAmount: number;
        totalMonths: number;
        paidMonths: number;
        includeInBudget: boolean;
      };
    }
  | { type: 'MARK_INSTALLMENT_PAID'; id: string; todayKey?: string }
  | { type: 'TOGGLE_INSTALLMENT_IN_BUDGET'; id: string }
  | { type: 'REMOVE_INSTALLMENT'; id: string }
  | {
      type: 'ADD_SINKING_FUND';
      name: string;
      icon: string;
      target: number;
      monthsToGoal: number;
    }
  | {
      type: 'DEPOSIT_TO_SINKING_FUND';
      id: string;
      amount: number;
      todayKey?: string;
    }
  | { type: 'DELETE_SINKING_FUND'; id: string }
  | { type: 'MARK_BACKUP_EXPORTED'; exportedAt: string }
  | { type: 'RESTORE_BACKUP'; data: Partial<PersistedBudgetState> }
  | {
      type: 'TRANSFER_BETWEEN_ACCOUNTS';
      fromSourceId: string;
      toSourceId: string;
      amount: number;
      note?: string;
      todayKey?: string;
    }
  | {
      type: 'EDIT_ENTRY';
      entryId: string;
      amount: number;
      label: string;
      category?: SpendCategoryKey;
      icon?: string;
      paymentSourceId?: string;
    }
  | {
      type: 'ADD_DEBT';
      direction: DebtDirection;
      personName: string;
      amount: number;
      note?: string;
      paymentSourceId?: string;
      affectsDailyBudget?: boolean;
      dateKey?: string;
      todayKey?: string;
    }
  | {
      type: 'UPDATE_DEBT';
      id: string;
      direction: DebtDirection;
      personName: string;
      amount: number;
      note?: string;
    }
  | { type: 'DELETE_DEBT'; id: string }
  | {
      type: 'RECORD_DEBT_PAYMENT';
      id: string;
      amount: number;
      paymentSourceId?: string;
      affectsDailyBudget?: boolean;
      dateKey?: string;
      todayKey?: string;
    }
  | {
      type: 'ADD_WANT_TO_BUY';
      name: string;
      price: number;
      icon: string;
      note?: string;
      todayKey?: string;
      coolOffDays?: number;
    }
  | {
      type: 'EXTEND_WANT_TO_BUY';
      id: string;
      extraDays?: number;
      todayKey?: string;
    }
  | { type: 'SKIP_WANT_TO_BUY'; id: string; todayKey?: string }
  | { type: 'DELETE_WANT_TO_BUY'; id: string }
  | {
      type: 'BUY_WANT_TO_BUY';
      id: string;
      fundingChoice: 'daily' | 'savings_jar' | 'sinking_fund';
      sinkingFundId?: string;
      paymentSourceId?: string;
      category?: SpendCategoryKey;
      todayKey?: string;
    };

export type SliceReducer = (
  state: PersistedBudgetState,
  action: BudgetAction
) => PersistedBudgetState | undefined;
