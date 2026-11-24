import { PersistedBudgetState } from './defaults';
import { handleBillsAndEnvelopesAction } from './reducers/billsAndEnvelopes';
import { handleDailyActions } from './reducers/dailyActions';
import { handleEditEntryAction } from './reducers/editEntry';
import { handleGoalsAndTreatsAction } from './reducers/goalsAndTreats';
import { handleInstallmentsAndDebtsAction } from './reducers/installmentsAndDebts';
import { handleLifecycleAndPrefsAction } from './reducers/lifecycleAndPrefs';
import { SliceReducer } from './reducers/types';
import { handleUndoEntryAction } from './reducers/undoEntry';
import { handleWalletAndAccountsAction } from './reducers/walletAndAccounts';

export type { BudgetAction } from './reducers/types';
export {
  canEditEntry,
  canUndoEntry,
  getUndoEligibility,
  isEditableEntry,
  isEditableEntryType,
} from './reducers/helpers';

const SLICE_REDUCERS: SliceReducer[] = [
  handleLifecycleAndPrefsAction,
  handleDailyActions,
  handleUndoEntryAction,
  handleEditEntryAction,
  handleWalletAndAccountsAction,
  handleBillsAndEnvelopesAction,
  handleGoalsAndTreatsAction,
  handleInstallmentsAndDebtsAction,
];

export function budgetReducer(
  state: PersistedBudgetState,
  action: import('./reducers/types').BudgetAction
): PersistedBudgetState {
  for (const slice of SLICE_REDUCERS) {
    const next = slice(state, action);
    if (next !== undefined) {
      return next;
    }
  }
  return state;
}
