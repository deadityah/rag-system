"use client";

import { motion, AnimatePresence } from "motion/react";
import { Plus, FileText, HelpCircle, X } from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/components/ui/GlassButton";

export interface NavBarProps {
  onNewChat: () => void;
  onToggleDocuments: () => void;
  hasMessages?: boolean;
  documentCount?: number;
  className?: string;
}

export function NavBar({
  onNewChat,
  onToggleDocuments,
  hasMessages = false,
  documentCount,
  className,
}: NavBarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isHowItWorksOpen) setIsHowItWorksOpen(false);
        if (showClearConfirm) setShowClearConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHowItWorksOpen, showClearConfirm]);

  const handleNewChatClick = () => {
    if (hasMessages) {
      setShowClearConfirm(true);
    } else {
      onNewChat();
    }
  };

  const handleConfirmClear = () => {
    onNewChat();
    setShowClearConfirm(false);
  };

  return (
    <>
      {/* Floating Pill NavBar at top center */}
      <nav
        aria-label="Main Navigation"
        className={cn("relative flex items-center justify-center", className)}
      >
        <div className="glass-card inline-flex items-center gap-0.5 rounded-full p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_6px_24px_rgba(30,30,50,0.08)]">
          {/* Item 1: New Chat (with inline confirmation) */}
          <AnimatePresence mode="wait" initial={false}>
            {showClearConfirm ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1"
              >
                <span className="whitespace-nowrap text-xs font-semibold text-[#1f1f23]">
                  Clear this chat?
                </span>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  aria-label="Confirm clear chat"
                  className="rounded-full bg-[#2b2b33] px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#1f1f23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  aria-label="Cancel clear chat"
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#5b5b66] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  No
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                type="button"
                onClick={handleNewChatClick}
                aria-label="New chat"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1f1f23] transition-all duration-200 hover:bg-black/[0.06] active:bg-black/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>New chat</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Item 2: Documents */}
          <button
            type="button"
            onClick={onToggleDocuments}
            aria-label="Documents"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1f1f23] transition-all duration-200 hover:bg-black/[0.06] active:bg-black/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-sm"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Documents</span>
            {documentCount !== undefined && documentCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px] font-semibold text-[#1f1f23]">
                {documentCount}
              </span>
            )}
          </button>

          {/* Item 3: How it works */}
          <button
            type="button"
            onClick={() => setIsHowItWorksOpen(true)}
            aria-label="How it works"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1f1f23] transition-all duration-200 hover:bg-black/[0.06] active:bg-black/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-sm"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">How it works</span>
            <span className="sm:hidden">Help</span>
          </button>
        </div>
      </nav>

      {/* Item 3 Modal: How it works */}
      <AnimatePresence>
        {isHowItWorksOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="how-it-works-title"
              className="glass-card relative w-full max-w-md rounded-[24px] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#1f1f23]" />
                  <h3
                    id="how-it-works-title"
                    className="font-heading text-lg font-semibold text-[#1f1f23]"
                  >
                    How DocuMind Works
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHowItWorksOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 text-[#5b5b66] transition-colors hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 4 Short Steps */}
              <div className="mt-4 space-y-3.5 text-sm text-[#1f1f23]">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold text-[#1f1f23]">
                    1
                  </span>
                  <p className="font-body leading-relaxed pt-0.5">Upload a PDF.</p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold text-[#1f1f23]">
                    2
                  </span>
                  <p className="font-body leading-relaxed pt-0.5">
                    The app splits it into small pieces.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold text-[#1f1f23]">
                    3
                  </span>
                  <p className="font-body leading-relaxed pt-0.5">
                    Your question finds the best pieces.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold text-[#1f1f23]">
                    4
                  </span>
                  <p className="font-body leading-relaxed pt-0.5">
                    The AI answers only from them and shows the page.
                  </p>
                </div>
              </div>

              {/* Modal footer */}
              <div className="mt-6 flex justify-end">
                <GlassButton
                  size="sm"
                  variant="primary"
                  onClick={() => setIsHowItWorksOpen(false)}
                >
                  Got it
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default NavBar;
