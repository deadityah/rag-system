"use client";

import { motion, AnimatePresence } from "motion/react";
import { BookOpen, X, ShieldCheck } from "lucide-react";
import React from "react";
import type { DocumentInfo } from "@/lib/types";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentList } from "@/components/documents/DocumentList";

export interface SidebarProps {
  documents: DocumentInfo[];
  onUploadFile?: (file: File) => void;
  onDeleteDocument?: (id: string) => void;
  isUploading?: boolean;
  uploadStep?: string;
  uploadError?: string | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  documents,
  onUploadFile,
  onDeleteDocument,
  isUploading = false,
  uploadStep,
  uploadError = null,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5 space-y-6">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-base tracking-tight text-text-primary">
                DocuMind
              </h1>
              <p className="text-[11px] text-text-muted">
                Intelligent Document RAG
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-text-secondary hover:bg-black/5 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Upload Zone */}
        <UploadZone
          onFileSelect={onUploadFile}
          isUploading={isUploading}
          uploadStep={uploadStep}
          error={uploadError}
          documentCount={documents.length}
          maxDocuments={5}
        />

        {/* Document List */}
        <DocumentList
          documents={documents}
          onDelete={onDeleteDocument}
        />
      </div>

      {/* Safety and Session Info */}
      <div className="rounded-xl border border-white/40 bg-white/30 p-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5 font-medium text-text-secondary mb-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Anonymous Session</span>
        </div>
        <p className="leading-relaxed">
          Files are stored locally for this browser session. Max 5 PDFs, 100 pages per file.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-full w-[320px] shrink-0">
        <GlassPanel className="h-full w-full overflow-y-auto">
          {sidebarContent}
        </GlassPanel>
      </div>

      {/* Mobile Drawer (with backdrop and Motion spring transition) */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            {/* Slide-in drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute top-0 bottom-0 left-0 w-[300px] max-w-[85vw] p-2"
            >
              <GlassPanel strong className="h-full w-full overflow-y-auto shadow-2xl">
                {sidebarContent}
              </GlassPanel>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
