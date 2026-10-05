"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      strong = false,
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
          "group relative overflow-hidden rounded-2xl border transition-all duration-200",
          "liquid-glass-shadow",
          strong
            ? "border-white/80 bg-white/70 backdrop-blur-xl"
            : "border-white/60 bg-white/45 backdrop-blur-lg",
          interactive &&
            "hover:border-white/90 hover:bg-white/60 hover:shadow-lg active:scale-[0.99]",
          className
        )}
        {...props}
      >
        {/* Liquid glass displacement backdrop layer with fallback */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] liquid-refraction"
        />

        {/* Inner subtle rim highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/40"
        />

        {/* Hover sheen from liquidglass.md */}
        {interactive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />
        )}

        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
