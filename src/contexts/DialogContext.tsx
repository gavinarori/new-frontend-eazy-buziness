import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
};

type DialogContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = (): DialogContextType => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((v: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setPendingResolve(() => resolve);
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setIsOpen(false);
    if (pendingResolve) pendingResolve(result);
    setPendingResolve(null);
    // small delay to avoid flash when reopening quickly
    setTimeout(() => setOpts(null), 150);
  }, [pendingResolve]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {isOpen && opts && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => handleClose(false)} />
          <div className="relative w-full max-w-md mx-4">
            <div className="rounded-lg shadow-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{opts.title || 'Please confirm'}</h3>
              </div>
              <div className="px-5 py-4 text-gray-700 dark:text-gray-300">
                {opts.message}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-900/20">
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:bg-transparent dark:hover:bg-gray-700/50"
                >
                  {opts.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className={
                    `px-4 py-2 rounded-lg text-white ${
                      (opts.tone === 'danger')
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`
                  }
                >
                  {opts.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};


