import { BudgetSettings, TreatVaultItem } from '../../types/budget';
import { roundCurrency, sumBills } from '../budgetMath';
import { createDemoState, createNewUserState } from '../defaults';
import { normalizePersistedState } from '../persistence';
import { SliceReducer } from './types';

export const handleLifecycleAndPrefsAction: SliceReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'COMPLETE_ONBOARDING': {
      const { params } = action;
      const trimmedTreat = (params.treatName || '').trim();
      const cleanTreatTarget = roundCurrency(params.treatTarget || 0);
      const preserve = Boolean(params.preserveExistingData);
      const nextBills = params.billItems ? params.billItems : state.billItems;
      const totalBills = params.billItems
        ? sumBills(params.billItems)
        : roundCurrency(Math.max(0, params.bills));

      const nextSettings: BudgetSettings = {
        monthlyIncome: roundCurrency(Math.max(0, params.income)),
        fixedBills: totalBills,
        monthlySavingsGoal: roundCurrency(Math.max(0, params.savings)),
        salaryFrequency: params.salaryFrequency,
        payday1: Math.max(1, Math.min(31, Math.round(params.payday1))),
        payday2: Math.max(1, Math.min(31, Math.round(params.payday2))),
      };

      if (preserve) {
        let updatedTreats = state.treats;
        let updatedActiveId = state.activeTreatId;
        if (trimmedTreat && cleanTreatTarget > 0 && state.treats.length < 3) {
          const newId = `treat-${Date.now()}`;
          updatedTreats = [
            {
              id: newId,
              name: trimmedTreat,
              icon: params.treatIcon || 'gift',
              target: cleanTreatTarget,
              funded: 0,
              fromImpulses: 0,
              fromRollovers: 0,
              claimed: false,
            },
            ...state.treats,
          ];
          updatedActiveId = newId;
        }
        return {
          ...state,
          hasCompletedOnboarding: true,
          billItems: nextBills,
          cashOnHand: Math.max(0, roundCurrency(params.cashOnHand)),
          settings: nextSettings,
          treats: updatedTreats,
          activeTreatId: updatedActiveId,
        };
      }

      let nextTreats: TreatVaultItem[] = [];
      let nextActiveTreatId = '';
      if (trimmedTreat && cleanTreatTarget > 0) {
        const newId = `treat-${Date.now()}`;
        nextTreats = [
          {
            id: newId,
            name: trimmedTreat,
            icon: params.treatIcon || 'gift',
            target: cleanTreatTarget,
            funded: 0,
            fromImpulses: 0,
            fromRollovers: 0,
            claimed: false,
          },
        ];
        nextActiveTreatId = newId;
      }

      return {
        ...state,
        hasCompletedOnboarding: true,
        hasSeenTutorial: false,
        billItems: nextBills,
        cashOnHand: Math.max(0, roundCurrency(params.cashOnHand)),
        settings: nextSettings,
        monthlySaved: 0,
        rolloverBalance: 0,
        entries: [],
        monthlyArchives: [],
        activeTreatId: nextActiveTreatId,
        treats: nextTreats,
        installments: [],
        envelopes: [],
        sinkingFunds: [],
        unlockedMilestones: [],
      };
    }

    case 'REOPEN_ONBOARDING':
      return { ...state, hasCompletedOnboarding: false };

    case 'CANCEL_REOPENED_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };

    case 'COMPLETE_TUTORIAL':
      return { ...state, hasSeenTutorial: true };

    case 'OPEN_TUTORIAL':
      return { ...state, hasSeenTutorial: false };

    case 'RESET_NEW_USER':
      return createNewUserState(action.todayKey);

    case 'RESET_DEMO':
      return createDemoState(action.todayKey);

    case 'TOGGLE_PRIVACY_MODE':
      return { ...state, privacyMode: !state.privacyMode };

    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.mode };

    case 'MARK_BACKUP_EXPORTED':
      return {
        ...state,
        lastBackupAt: action.exportedAt,
      };

    case 'RESTORE_BACKUP':
      return normalizePersistedState(action.data);

    default:
      return undefined;
  }
};
