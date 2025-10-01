import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastContextType = {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const typeStyles: Record<ToastType, { container: string; icon: string }> = {
  success: { container: 'bg-green-600 text-white', icon: 'bg-white/20' },
  error: { container: 'bg-red-600 text-white', icon: 'bg-white/20' },
  info: { container: 'bg-blue-600 text-white', icon: 'bg-white/20' },
  warning: { container: 'bg-amber-500 text-white', icon: 'bg-white/20' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeoutId = timeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete timeoutsRef.current[id];
    }
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.durationMs ?? 3500;
    const newToast: Toast = { id, ...toast };
    setToasts((prev) => [newToast, ...prev]);
    timeoutsRef.current[id] = window.setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed z-[1100] bottom-4 right-4 space-y-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto w-80 shadow-lg rounded-lg overflow-hidden ${typeStyles[t.type].container}`}>
            <div className="flex">
              <div className={`w-1 ${typeStyles[t.type].icon}`} />
              <div className="flex-1 px-4 py-3">
                {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
                <div className="text-sm opacity-90">{t.message}</div>
              </div>
              <button
                className="px-3 py-2 text-white/80 hover:text-white"
                onClick={() => removeToast(t.id)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


