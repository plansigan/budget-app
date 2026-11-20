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

interface ToastContextValue {
  toast: ToastMessage | null;
  showToast: (text: string, isDopamine: boolean) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const id = Date.now();
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

  const value = useMemo<ToastContextValue>(
    () => ({ toast, showToast, dismissToast }),
    [toast, showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
