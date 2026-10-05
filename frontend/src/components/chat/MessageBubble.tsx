"use client";

import { motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const renderFormattedText = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 text-[16px] leading-[1.65] font-normal text-[#1f1f23]">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#1f1f23]">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc pl-5 space-y-1 last:mb-0 text-[16px] text-[#1f1f23]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal pl-5 space-y-1 last:mb-0 text-[16px] text-[#1f1f23]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[13px] text-[#1f1f23]">
                {children}
              </code>
            ) : (
              <pre className="my-2 overflow-x-auto rounded-xl border border-black/10 bg-white/50 p-3 font-mono text-xs text-[#1f1f23]">
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group flex w-full flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-[16px] leading-[1.65] transition-all",
          "border border-[rgba(255,255,255,0.85)]",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)]",
          "backdrop-blur-[30px]",
          isUser
            ? "bg-white/70 text-[#1f1f23] rounded-br-sm"
            : "bg-white/55 text-[#1f1f23] rounded-bl-sm"
        )}
      >
        {/* Assistant Copy Button */}
        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            aria-label="Copy answer to clipboard"
            className="absolute -top-3 right-3 rounded-full border border-white/90 bg-white/95 p-1.5 text-[#5b5b66] opacity-0 shadow-sm transition-all hover:bg-white hover:text-[#1f1f23] group-hover:opacity-100"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}

        <div className="prose prose-sm max-w-none text-[#1f1f23]">
          {renderFormattedText(message.content)}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
