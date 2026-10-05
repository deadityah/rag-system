"use client";

import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, Sparkles, AlertCircle, RefreshCw, Server } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassButton } from "@/components/ui/GlassButton";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatInput } from "@/components/chat/ChatInput";

export interface ChatWindowProps {
  messages: ChatMessage[];
  hasDocuments: boolean;
  isStreaming?: boolean;
  isThinking?: boolean;
  isWakingServer?: boolean;
  error?: string | null;
  onSendMessage?: (question: string) => void;
  onStopStreaming?: () => void;
  onRetry?: () => void;
  onSelectSuggestion?: (prompt: string) => void;
}

export function ChatWindow({
  messages,
  hasDocuments,
  isStreaming = false,
  isThinking = false,
  isWakingServer = false,
  error = null,
  onSendMessage,
  onStopStreaming,
  onRetry,
  onSelectSuggestion,
}: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  const suggestions = [
    "Summarize this document",
    "What are the key points?",
    "List important dates or numbers",
  ];

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const atBottom = distanceFromBottom < 60;
    isAutoScrollEnabled.current = atBottom;
    setShowScrollBottom(!atBottom && messages.length > 0);
  };

  useEffect(() => {
    if (isAutoScrollEnabled.current) {
      scrollToBottom();
    }
  }, [messages, isThinking]);

  return (
    <GlassPanel className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Cold start notification banner */}
      <AnimatePresence>
        {isWakingServer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-2 border-b border-amber-200/90 bg-amber-50/70 px-4 py-2 text-xs text-amber-800 backdrop-blur-md"
          >
            <Server className="h-3.5 w-3.5 animate-pulse text-amber-600" />
            <span className="font-semibold">
              Waking up the server, this can take up to a minute…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Message List (transparent background so dots are softly visible) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-4"
      >
        {!hasDocuments ? (
          // State: No documents uploaded yet
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[rgba(255,255,255,0.85)] bg-white/[0.20] shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)] backdrop-blur-[24px]">
              <Sparkles className="h-7 w-7 text-[#1f1f23]" />
            </div>
            <h2 className="mt-4 font-semibold text-lg text-[#1f1f23]">
              Welcome to DocuMind
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-[#5b5b66] leading-relaxed">
              Upload a PDF in the sidebar to get started. You can then ask questions
              and get answers with verified page citations.
            </p>
          </div>
        ) : messages.length === 0 ? (
          // State: Documents ready, no messages yet
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.85)] bg-white/[0.20] shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)] backdrop-blur-[24px]">
              <Sparkles className="h-6 w-6 text-[#1f1f23]" />
            </div>
            <h2 className="mt-4 font-semibold text-base text-[#1f1f23]">
              Documents are ready
            </h2>
            <p className="mt-1 text-xs text-[#5b5b66]">
              Choose a starter question or type your own below:
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
              {suggestions.map((suggestion) => (
                <GlassButton
                  key={suggestion}
                  size="sm"
                  variant="secondary"
                  onClick={() => onSelectSuggestion?.(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </GlassButton>
              ))}
            </div>
          </div>
        ) : (
          // Chat message history
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
          </>
        )}

        {/* Global Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200/90 bg-red-50/80 p-3 text-xs text-red-700 shadow-[0_0_0_1px_rgba(200,50,50,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[20px]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
            {onRetry && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={onRetry}
                className="h-7 text-xs text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Try again
              </GlassButton>
            )}
          </motion.div>
        )}
      </div>

      {/* Jump to latest button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-24 right-6 z-20"
          >
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => scrollToBottom()}
              className="gap-1.5 shadow-lg"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="text-xs">Jump to latest</span>
            </GlassButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Input Area - Transparent background so ChatInput sees dots directly through panel */}
      <div className="border-t border-white/60 bg-transparent p-4 sm:p-5">
        <ChatInput
          onSend={onSendMessage}
          onStop={onStopStreaming}
          isStreaming={isStreaming}
          disabled={!hasDocuments}
        />
      </div>
    </GlassPanel>
  );
}

export default ChatWindow;
