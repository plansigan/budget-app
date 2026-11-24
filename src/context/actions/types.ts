import type React from 'react';
import type { BudgetAction } from '../../state/budgetReducer';
import type { PersistedBudgetState } from '../../state/defaults';
import type { DaySummary } from '../../types/budget';

export interface ActionHookDeps {
  dispatch: React.Dispatch<BudgetAction>;
  stateRef: React.MutableRefObject<PersistedBudgetState>;
  selectedDateKeyRef: React.MutableRefObject<string>;
  getDaySummaryRef: React.MutableRefObject<(dateKey: string) => DaySummary>;
  showToast: (text: string, isDopamine: boolean) => void;
}
