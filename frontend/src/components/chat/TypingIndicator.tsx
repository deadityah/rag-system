"use client";

import { motion } from "motion/react";
import React from "react";

export function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: { y: -4, opacity: 0.9 },
  };

  return (
    <div
      aria-label="Thinking"
      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/40 px-3.5 py-2.5 backdrop-blur-md"
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-text-secondary"
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
          duration: 0.45,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-text-secondary"
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
          duration: 0.45,
          delay: 0.15,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-text-secondary"
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
          duration: 0.45,
          delay: 0.3,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export default TypingIndicator;
