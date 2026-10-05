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
          "relative flex flex-col rounded-2xl border border-white/80 bg-white/60 p-1.5 shadow-sm liquid-glass-shadow backdrop-blur-xl transition-all",
          "focus-within:border-white focus-within:bg-white/75 focus-within:shadow-md",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
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
          className="pr-12"
        />

        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          {/* Character counter (shows when near limit) */}
          <div className="text-[11px] text-text-muted">
            {isNearLimit && (
              <span className={value.length >= maxLength ? "text-danger font-medium" : ""}>
                {value.length}/{maxLength}
              </span>
            )}
          </div>

          {/* Action button: Send or Stop */}
          <div>
            {isStreaming ? (
              <GlassButton
                size="icon"
                variant="secondary"
                onClick={handleStop}
                aria-label="Stop generating answer"
                className="h-8 w-8 rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
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
                className="h-8 w-8 rounded-full shadow-sm"
              >
                <ArrowUp className="h-4 w-4" />
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
