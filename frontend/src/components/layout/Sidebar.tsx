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
    <div className="flex h-full flex-col justify-between p-4 space-y-4">
      {/* Scrollable upper section - completely see-through so UploadZone sees dot background */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        {/* Brand Header with Playwrite Argentina Logo */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-[#2b2b33] text-white shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="font-logo font-normal text-2xl tracking-normal text-[#1f1f23] block leading-none">
                DocuMind
              </span>
              <p className="text-[11px] text-[#5b5b66] mt-0.5">
                Intelligent Document RAG
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-[#5b5b66] hover:bg-black/5 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Upload Zone (see-through liquid glass) */}
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

      {/* Session Info Badge */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.85)] bg-white/[0.12] p-3.5 text-[11px] text-[#5b5b66] shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)] backdrop-blur-[20px]">
        <div className="flex items-center gap-1.5 font-heading font-semibold text-[#1f1f23] mb-1">
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
      <div className="hidden lg:block h-full w-[330px] shrink-0">
        <GlassPanel className="h-full w-full">
          {sidebarContent}
        </GlassPanel>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute top-0 bottom-0 left-0 w-[310px] max-w-[85vw] p-2.5"
            >
              <GlassPanel className="h-full w-full shadow-2xl">
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
