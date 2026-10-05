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
        "bg-[#2b2b33] text-white shadow-md hover:bg-[#1f1f23] active:bg-[#151518] border border-black/10",
      secondary:
        "border border-white/80 bg-white/60 text-[#1f1f23] liquid-glass-shadow backdrop-blur-md hover:bg-white/80 active:bg-white/95",
      ghost:
        "border border-transparent bg-transparent text-[#5b5b66] hover:bg-white/40 hover:text-[#1f1f23] active:bg-white/60",
      danger:
        "border border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100/80 active:bg-red-100",
    }[variant];

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
