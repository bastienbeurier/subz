"use client";

import { AnimatePresence, motion } from "framer-motion";

interface PhaseTransitionProps {
  phaseKey: string;
  children: React.ReactNode;
}

export function PhaseTransition({ phaseKey, children }: PhaseTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
