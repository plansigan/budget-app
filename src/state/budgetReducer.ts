import { PersistedBudgetState } from './defaults';
import { handleBillsAndEnvelopesAction } from './reducers/billsAndEnvelopes';
import { handleDailyAndEntriesAction } from './reducers/dailyAndEntries';
import { handleGoalsAndTreatsAction } from './reducers/goalsAndTreats';
import { handleInstallmentsAndDebtsAction } from './reducers/installmentsAndDebts';
import { handleLifecycleAndPrefsAction } from './reducers/lifecycleAndPrefs';
import { BudgetAction, SliceReducer } from './reducers/types';
import { handleWalletAndAccountsAction } from './reducers/walletAndAccounts';

export type { BudgetAction } from './reducers/types';
export {
  canUndoEntry,
  isEditableEntry,
  isEditableEntryType,
} from './reducers/helpers';

const SLICE_REDUCERS: SliceReducer[] = [
  handleLifecycleAndPrefsAction,
  handleDailyAndEntriesAction,
  handleWalletAndAccountsAction,
  handleBillsAndEnvelopesAction,
  handleGoalsAndTreatsAction,
  handleInstallmentsAndDebtsAction,
];

export function budgetReducer(
  state: PersistedBudgetState,
  action: BudgetAction
): PersistedBudgetState {
  for (const slice of SLICE_REDUCERS) {
    const next = slice(state, action);
    if (next !== undefined) {
      return next;
    }
  }
  return state;
}
