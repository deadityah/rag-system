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
          "glass-card-text group relative flex flex-col rounded-[24px] p-2 transition-all",
          "focus-within:bg-white/35 focus-within:shadow-xl",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="relative z-10">
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
            className="pr-12 text-[#1f1f23] placeholder:text-[#71717a] font-normal text-base"
          />

          <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
            {/* Character counter */}
            <div className="text-[11px] font-medium text-[#71717a]">
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
