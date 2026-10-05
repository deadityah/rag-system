"use client";

import { motion } from "motion/react";
import React from "react";

export function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0, opacity: 0.35 },
    animate: { y: -4, opacity: 0.95 },
  };

  return (
    <div
      aria-label="Thinking"
      className="glass-card-text inline-flex items-center gap-1.5 rounded-[24px] px-4 py-3"
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-[#1f1f23]"
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
        className="h-1.5 w-1.5 rounded-full bg-[#1f1f23]"
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
        className="h-1.5 w-1.5 rounded-full bg-[#1f1f23]"
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
