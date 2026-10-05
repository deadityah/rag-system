"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  textDense?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      textDense = false,
      interactive = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-[24px] transition-all duration-200",
          textDense ? "glass-card-text" : "glass-card",
          interactive &&
            "hover:shadow-xl active:scale-[0.99]",
          className
        )}
        {...props}
      >
        <div className="relative z-10 h-full w-full">{children}</div>
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
