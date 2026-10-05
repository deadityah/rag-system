"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onEnterSubmit?: () => void;
  maxRows?: number;
}

export const GlassInput = React.forwardRef<
  HTMLTextAreaElement,
  GlassInputProps
>(
  (
    {
      className,
      value,
      onChange,
      onKeyDown,
      onEnterSubmit,
      maxRows = 5,
      disabled,
      placeholder = "Ask a question about your documents…",
      ...props
    },
    forwardedRef
  ) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    // Auto-grow calculation up to maxRows (no layout shifts)
    useEffect(() => {
      const textarea = localRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      const lineHeight = 24;
      const maxHeight = lineHeight * maxRows;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${Math.max(newHeight, lineHeight)}px`;
    }, [value, maxRows]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (onEnterSubmit && !disabled) {
          onEnterSubmit();
        }
      }
      onKeyDown?.(e);
    };

    return (
      <textarea
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        rows={1}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full resize-none border-0 bg-transparent p-0 font-body text-[15px] sm:text-[16px] leading-relaxed text-[#1f1f23] placeholder:text-[#71717a] outline-none shadow-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 no-scrollbar",
          className
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        {...props}
      />
    );
  }
);

GlassInput.displayName = "GlassInput";

export default GlassInput;
