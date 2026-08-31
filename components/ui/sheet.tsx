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
            className="fixed inset-0 z-[90] bg-ink/40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn(
              "fixed right-0 top-0 z-[100] h-full w-full max-w-[460px] overflow-y-auto border-l border-line bg-panel p-6 shadow-card",
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-[10px] border border-line text-ink3 transition hover:text-ink"
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
