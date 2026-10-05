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
      <div className="py-4 text-center">
        <p className="text-xs text-[#5b5b66]">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Title as plain text directly over the dots (no card behind it) */}
      <div className="px-1 text-xs font-semibold text-[#5b5b66]">
        Uploaded Files ({documents.length}/5)
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
                  "glass-card-text group relative flex items-center justify-between rounded-[16px] p-3 transition-all",
                  "hover:bg-white/35 hover:shadow-lg"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/30 text-[#1f1f23] shadow-[0_0_0_1px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
                    {doc.status === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#1f1f23]" />
                    ) : (
                      <FileText className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-semibold text-xs text-[#1f1f23]"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </p>
                    <p className="text-[11px] text-[#5b5b66] font-medium">
                      {doc.status === "processing" ? (
                        <span className="text-amber-700 font-semibold">Processing…</span>
                      ) : doc.status === "failed" ? (
                        <span className="text-red-600 font-semibold">Failed</span>
                      ) : (
                        `${doc.page_count} ${doc.page_count === 1 ? "page" : "pages"}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Delete / Inline Confirm Area */}
                <div className="ml-2 shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-1 rounded-xl border border-red-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-md">
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
                      className="rounded-lg border border-transparent p-1.5 text-[#5b5b66] opacity-70 transition-all hover:border-white/80 hover:bg-white/40 hover:text-red-600 hover:opacity-100 group-hover:opacity-100"
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
