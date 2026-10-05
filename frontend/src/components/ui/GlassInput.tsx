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

    // Auto-grow calculation up to maxRows
    useEffect(() => {
      const textarea = localRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      const singleLineHeight = 24;
      const maxHeight = singleLineHeight * maxRows + 20; // 20px padding
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
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
          "w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

GlassInput.displayName = "GlassInput";

export default GlassInput;
