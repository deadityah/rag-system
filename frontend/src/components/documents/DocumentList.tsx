"use client";

import { motion, AnimatePresence } from "motion/react";
import { FileText, Trash2, Check, X, Loader2 } from "lucide-react";
import React, { useState } from "react";
import type { DocumentInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface DocumentListProps {
  documents: DocumentInfo[];
  onDelete?: (id: string) => void;
  selectedDocIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function DocumentList({
  documents,
  onDelete,
}: DocumentListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-[#5b5b66]">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#5b5b66]">
        <span>Uploaded Files ({documents.length}/5)</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {documents.map((doc) => {
            const isConfirming = confirmDeleteId === doc.id;

            return (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative flex items-center justify-between rounded-xl p-3 transition-all",
                  "border border-[rgba(255,255,255,0.85)]",
                  "shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)]",
                  "backdrop-blur-[30px] bg-white/55",
                  "hover:bg-white/70 hover:shadow-md"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/80 text-[#1f1f23] shadow-sm">
                    {doc.status === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#1f1f23]" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-semibold text-xs text-[#1f1f23]"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </p>
                    <p className="text-[11px] text-[#5b5b66]">
                      {doc.status === "processing" ? (
                        <span className="text-amber-700 font-medium">Processing…</span>
                      ) : doc.status === "failed" ? (
                        <span className="text-red-600 font-medium">Failed</span>
                      ) : (
                        `${doc.page_count} ${doc.page_count === 1 ? "page" : "pages"}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Delete / Inline Confirm Area */}
                <div className="ml-2 shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-white/95 p-1 shadow-sm">
                      <span className="text-[10px] text-red-600 font-semibold px-1">
                        Delete?
                      </span>
                      <button
                        onClick={() => {
                          onDelete?.(doc.id);
                          setConfirmDeleteId(null);
                        }}
                        aria-label="Confirm delete"
                        className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        aria-label="Cancel delete"
                        className="rounded p-1 text-[#5b5b66] hover:bg-black/5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(doc.id)}
                      aria-label={`Delete ${doc.filename}`}
                      className="rounded-lg border border-transparent p-1.5 text-[#5b5b66] opacity-70 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DocumentList;
