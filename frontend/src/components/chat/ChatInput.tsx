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
      {/* 
        Single outer rounded container with frosted glass styles.
        All 4 corners equal (rounded-[24px]).
        Border, backdrop-filter, and shadow on this single element.
        NO overflow: hidden on this element to prevent browser corner clipping.
      */}
      <div
        className={cn(
          "group relative flex flex-col rounded-[24px] p-4 transition-all duration-200",
          // Glass styles
          "bg-[rgba(255,255,255,0.36)] backdrop-blur-[26px] [backdrop-filter:blur(26px)_saturate(140%)] [-webkit-backdrop-filter:blur(26px)_saturate(140%)]",
          "border border-[rgba(255,255,255,0.85)]",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_6px_24px_rgba(30,30,50,0.08)]",
          // Soft ring focus effect on container:focus-within
          "focus-within:border-[rgba(0,0,0,0.18)] focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_0_0_3px_rgba(0,0,0,0.08),0_8px_28px_rgba(30,30,50,0.12)]",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="relative w-full">
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
          />

          <div className="flex items-center justify-between pt-2.5">
            {/* Character counter */}
            <div className="text-[11px] font-medium text-[#71717a]">
              {isNearLimit && (
                <span className={value.length >= maxLength ? "text-danger font-semibold" : ""}>
                  {value.length}/{maxLength}
                </span>
              )}
            </div>

            {/* Action button: Send or Stop (>16px distance from outer corner) */}
            <div className="shrink-0 pl-2">
              {isStreaming ? (
                <GlassButton
                  size="icon"
                  variant="danger"
                  onClick={handleStop}
                  aria-label="Stop generating answer"
                  className="h-9 w-9 rounded-full"
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
                  className="h-9 w-9 rounded-full shadow-md"
                >
                  <ArrowUp className="h-4.5 w-4.5" />
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
