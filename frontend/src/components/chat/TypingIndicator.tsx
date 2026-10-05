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
      className="inline-flex items-center gap-1.5 rounded-2xl border border-[rgba(255,255,255,0.85)] bg-white/55 px-4 py-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)] backdrop-blur-[30px]"
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
