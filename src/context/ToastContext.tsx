import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToastMessage } from '../types/budget';

interface ToastActionsContextValue {
  showToast: (text: string, isDopamine: boolean) => void;
  dismissToast: () => void;
}

const ToastStateContext = createContext<ToastMessage | null | undefined>(
  undefined
);
const ToastActionsContext = createContext<ToastActionsContextValue | null>(
  null
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeqRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const showToast = useCallback(
    (text: string, isDopamine: boolean) => {
      clearTimer();
      const id = ++toastSeqRef.current;
      setToast({ id, text, isDopamine });
      timerRef.current = setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
        timerRef.current = null;
      }, 2800);
    },
    [clearTimer]
  );

  const dismissToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const actionsValue = useMemo<ToastActionsContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  );

  return (
    <ToastActionsContext.Provider value={actionsValue}>
      <ToastStateContext.Provider value={toast}>
        {children}
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
};

export function useToastActions(): ToastActionsContextValue {
  const ctx = useContext(ToastActionsContext);
  if (!ctx) {
    throw new Error('useToastActions must be used within a ToastProvider');
  }
  return ctx;
}

export function useToast(): ToastActionsContextValue & {
  toast: ToastMessage | null;
} {
  const toast = useContext(ToastStateContext);
  const actions = useToastActions();
  if (toast === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return useMemo(() => ({ toast, ...actions }), [toast, actions]);
}
