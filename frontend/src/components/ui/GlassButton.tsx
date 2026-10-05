"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

export interface GlassButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  GlassButtonProps
>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3.5 text-xs gap-1.5 rounded-full",
      md: "h-10 px-4 text-sm gap-2 rounded-full",
      lg: "h-12 px-6 text-base gap-2.5 rounded-full",
      icon: "h-9 w-9 p-0 rounded-full flex items-center justify-center",
    }[size];

    const variantClasses = {
      primary:
        "bg-[#2b2b33] text-white border border-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.35),0_4px_16px_rgba(30,30,50,0.15)] hover:bg-[#1f1f23] active:bg-[#151518]",
      secondary:
        "border border-[rgba(255,255,255,0.9)] bg-white/30 text-[#1f1f23] shadow-[0_0_0_1px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.95),0_4px_16px_rgba(30,30,50,0.08)] backdrop-blur-[16px] hover:bg-white/45 active:bg-white/60",
      ghost:
        "border border-transparent bg-transparent text-[#1f1f23] hover:border-[rgba(255,255,255,0.8)] hover:bg-white/30 active:bg-white/50",
      danger:
        "border border-red-200/90 bg-red-50/80 text-red-700 shadow-[0_0_0_1px_rgba(200,50,50,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[16px] hover:bg-red-100 active:bg-red-200",
    }[variant];

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export default GlassButton;
