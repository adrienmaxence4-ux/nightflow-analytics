"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { Check, Info, X } from "lucide-react";

type ToastVariant = "success" | "info";
interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastContext = createContext<
  (message: string, variant?: ToastVariant) => void
>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-glass-hi bg-night-900/95 px-4 py-3 text-[13px] font-semibold text-white shadow-premium backdrop-blur-xl"
            >
              <span
                className={`grid h-6 w-6 flex-none place-items-center rounded-full text-night-950 ${
                  t.variant === "success"
                    ? "bg-gradient-to-b from-neon-lime to-emerald-400"
                    : "bg-gradient-to-b from-neon-cyan to-neon-cyansoft"
                }`}
              >
                {t.variant === "success" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <Info className="h-3.5 w-3.5" strokeWidth={3} />
                )}
              </span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
                className="text-ink-mut transition hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
