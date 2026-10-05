"use client";

import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import React, { useState } from "react";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassButton } from "@/components/ui/GlassButton";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
  onSend?: (question: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Ask a question about your documents…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const maxLength = 1000;

  const handleSend = () => {
    if (!value.trim() || disabled || isStreaming) return;
    onSend?.(value.trim());
    setValue("");
  };

  const handleStop = () => {
    if (isStreaming) {
      onStop?.();
    }
  };

  const isNearLimit = value.length > 800;

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl p-1.5 transition-all",
          // Liquid glass styling: see-through, blur(24px) saturate(160%), light tint 0.10, exact borders & shadow
          "liquid-section-glass",
          "focus-within:bg-white/[0.16] focus-within:shadow-lg",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {/* SVG liquid glass displacement backdrop layer from liquidglass.md */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] liquid-refraction opacity-70"
        />

        {/* Hover reflection sheen from liquidglass.md */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
        />

        <div className="relative z-20">
          <GlassInput
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onEnterSubmit={handleSend}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={
              disabled
                ? "Upload a PDF document first to start chatting…"
                : placeholder
            }
            className="pr-12 text-[#1f1f23] placeholder:text-[#5b5b66] font-medium"
          />

          <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
            {/* Character counter */}
            <div className="text-[11px] font-medium text-[#5b5b66]">
              {isNearLimit && (
                <span className={value.length >= maxLength ? "text-danger font-semibold" : ""}>
                  {value.length}/{maxLength}
                </span>
              )}
            </div>

            {/* Action button: Send or Stop */}
            <div>
              {isStreaming ? (
                <GlassButton
                  size="icon"
                  variant="danger"
                  onClick={handleStop}
                  aria-label="Stop generating answer"
                  className="h-8 w-8 rounded-full"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </GlassButton>
              ) : (
                <GlassButton
                  size="icon"
                  variant="primary"
                  onClick={handleSend}
                  disabled={disabled || !value.trim()}
                  aria-label="Send question"
                  className="h-8 w-8 rounded-full shadow-md"
                >
                  <ArrowUp className="h-4 w-4" />
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
