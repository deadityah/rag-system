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

  // Helper to highlight citation markers like (report.pdf, p. 4)
  const renderFormattedText = (content: string) => {
    // Return markdown with custom components
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-[1.65]">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc pl-5 space-y-1 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal pl-5 space-y-1 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[13px] text-text-primary">
                {children}
              </code>
            ) : (
              <pre className="my-2 overflow-x-auto rounded-xl bg-black/5 p-3 font-mono text-xs text-text-primary">
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
          "relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] liquid-glass-shadow transition-all",
          isUser
            ? "border border-white/80 bg-white/70 text-text-primary backdrop-blur-md rounded-br-sm"
            : "border border-white/60 bg-white/45 text-text-primary backdrop-blur-md rounded-bl-sm"
        )}
      >
        {/* Assistant Copy Button */}
        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            aria-label="Copy answer to clipboard"
            className="absolute -top-3 right-3 rounded-full border border-white/80 bg-white/90 p-1.5 text-text-secondary opacity-0 shadow-sm transition-all hover:bg-white hover:text-text-primary group-hover:opacity-100"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}

        <div className="prose prose-sm max-w-none text-text-primary">
          {renderFormattedText(message.content)}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
