"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Side panel (shadcn "sheet" equivalent), built on Framer Motion.
 * Slides in from the right with a blurred overlay.
 */
export function Sheet({
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
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-night-950/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn(
              "fixed right-0 top-0 z-[100] h-full w-full max-w-[440px] overflow-y-auto border-l border-glass-hi bg-gradient-to-b from-night-900/97 to-night-950/97 p-6 shadow-premium backdrop-blur-xl",
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl border border-glass-border bg-glass text-ink-dim transition hover:border-neon-pink hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
