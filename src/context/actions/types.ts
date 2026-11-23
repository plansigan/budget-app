import type React from 'react';
import type { PersistedBudgetState } from '../../state/defaults';
import type { BudgetAction } from '../../state/budgetReducer';

export interface ActionHookDeps {
  dispatch: React.Dispatch<BudgetAction>;
  stateRef: React.MutableRefObject<PersistedBudgetState>;
  selectedDateKeyRef: React.MutableRefObject<string>;
  showToast: (text: string, isDopamine: boolean) => void;
}
