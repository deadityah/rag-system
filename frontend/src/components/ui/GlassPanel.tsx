"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  interactive?: boolean;
  hasContentLayer?: boolean;
  children?: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      strong = false,
      interactive = false,
      hasContentLayer = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "group relative overflow-hidden rounded-[24px] transition-all duration-200",
          "glass-panel-outer",
          strong && "bg-white/60",
          interactive &&
            "hover:bg-white/50 hover:shadow-xl active:scale-[0.99]",
          className
        )}
        {...props}
      >
        {/* SVG liquid glass displacement backdrop layer from liquidglass.md with CSS fallback */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] liquid-refraction"
        />

        {/* Hover reflection sheen from reference/liquidglass.md */}
        {interactive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />
        )}

        {/* Optional inner content layer with strong blur (28-32px) and fill (~0.55) */}
        {hasContentLayer ? (
          <div className="relative z-10 m-2 h-[calc(100%-16px)] rounded-[20px] glass-content-layer p-4 overflow-hidden">
            {children}
          </div>
        ) : (
          <div className="relative z-10 h-full w-full">{children}</div>
        )}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
