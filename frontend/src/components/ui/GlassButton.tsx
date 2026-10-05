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
      sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
      md: "h-10 px-4 text-sm gap-2 rounded-full",
      lg: "h-12 px-6 text-base gap-2.5 rounded-full",
      icon: "h-9 w-9 p-0 rounded-full flex items-center justify-center",
    }[size];

    const variantClasses = {
      primary:
        "bg-[#2b2b33] text-white border border-white/50 shadow-[0_0_0_1px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3),0_4px_16px_rgba(40,40,60,0.15)] hover:bg-[#1f1f23] active:bg-[#151518]",
      secondary:
        "border border-[rgba(255,255,255,0.85)] bg-white/60 text-[#1f1f23] shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_4px_16px_rgba(40,40,60,0.08)] backdrop-blur-[24px] hover:bg-white/80 active:bg-white/95",
      ghost:
        "border border-[rgba(255,255,255,0.60)] bg-white/35 text-[#1f1f23] shadow-[0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-[16px] hover:bg-white/60 active:bg-white/80",
      danger:
        "border border-red-200/90 bg-red-50/80 text-red-700 shadow-[0_0_0_1px_rgba(200,50,50,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[20px] hover:bg-red-100/90 active:bg-red-100",
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
