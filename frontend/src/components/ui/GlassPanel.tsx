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
          "group relative overflow-hidden rounded-[24px] transition-all duration-200",
          className
        )}
        {...props}
      >
        {/* Layer 1: Background Glass Layer (absolutely positioned behind as sibling) */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] glass-panel-bg",
            strong && "bg-white/[0.25]"
          )}
        />

        {/* Liquid refraction backdrop layer from liquidglass.md with CSS fallback */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] liquid-refraction opacity-70"
        />

        {/* Hover reflection sheen from reference/liquidglass.md */}
        {interactive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          />
        )}

        {/* Layer 2: Content Layer (sibling, sits on top so children can see dots directly) */}
        <div className="relative z-10 h-full w-full">{children}</div>
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
