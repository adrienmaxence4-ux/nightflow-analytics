"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered modal dialog built on Framer Motion. */
export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] grid place-items-center bg-night-950/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "glass-card relative w-full max-w-md p-6",
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-glass-border bg-glass text-ink-dim transition hover:border-neon-pink hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
