"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AiLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}

export function AiLoading({
  texts = [
    "Thinking...",
    "Searching documents...",
    "Analyzing text...",
    "Synthesizing answer...",
  ],
  className,
  interval = 1500,
}: AiLoadingProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label="AI is thinking"
      className={cn(
        "glass-card-text relative inline-flex items-center rounded-[24px] rounded-bl-sm px-5 py-3.5 shadow-sm",
        className
      )}
    >
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTextIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              backgroundPosition: ["200% center", "-200% center"],
            }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
              opacity: { duration: 0.25 },
              y: { duration: 0.25 },
              backgroundPosition: {
                duration: 2.5,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              },
            }}
            className="flex min-w-max items-center whitespace-nowrap bg-[length:200%_100%] bg-gradient-to-r from-[#1f1f23] via-[#8c8c97] to-[#1f1f23] bg-clip-text font-semibold text-[15px] text-transparent select-none"
          >
            {texts[currentTextIndex]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default AiLoading;
