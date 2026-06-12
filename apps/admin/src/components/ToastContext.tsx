import { createContext, useContext, type ReactNode } from 'react';
import { Toast, useToast, type ToastSpec } from '@plynth/shared/ui';

const ToastCtx = createContext<((t: ToastSpec) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, fire] = useToast();
  return (
    <ToastCtx.Provider value={fire}>
      {children}
      {toast && <Toast {...toast} />}
    </ToastCtx.Provider>
  );
}

export function useToastFire() {
  const fire = useContext(ToastCtx);
  if (!fire) throw new Error('useToastFire must be used inside <ToastProvider>');
  return fire;
}
