"use client";

import { motion } from "framer-motion";

/** Wraps page content with a subtle fade + rise transition. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className="flex flex-col gap-5"
    >
      {children}
    </motion.div>
  );
}
