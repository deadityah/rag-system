"use client";

import { motion, AnimatePresence } from "motion/react";
import { BookOpen, X, ShieldCheck } from "lucide-react";
import React from "react";
import type { DocumentInfo } from "@/lib/types";
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
  const sidebarCards = (
    <div className="flex h-full flex-col justify-between gap-4 overflow-y-auto p-4">
      {/* Upper Cards Area */}
      <div className="flex flex-col gap-4">
        {/* Card A: Header Card (Logo + Title block as its own separate glass card) */}
        <div className="glass-card rounded-[24px] p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-[#2b2b33] text-white shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="font-logo font-normal text-2xl tracking-normal text-[#1f1f23] block leading-none">
                DocuMind
              </span>
              <p className="text-[11px] text-[#5b5b66] mt-0.5 font-medium">
                Intelligent Document RAG
              </p>
            </div>
          </div>

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

        {/* Card B: Upload PDF Document Card */}
        <UploadZone
          onFileSelect={onUploadFile}
          isUploading={isUploading}
          uploadStep={uploadStep}
          error={uploadError}
          documentCount={documents.length}
          maxDocuments={5}
        />

        {/* Section C: Uploaded Files (Title as plain text over dots + each file as its own card) */}
        <DocumentList
          documents={documents}
          onDelete={onDeleteDocument}
        />
      </div>

      {/* Card E: Anonymous Session Card */}
      <div className="glass-card rounded-[24px] p-4 text-[11px] text-[#5b5b66] shrink-0">
        <div className="flex items-center gap-1.5 font-heading font-semibold text-[#1f1f23] mb-1">
          <ShieldCheck className="h-4 w-4" />
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
      {/* Desktop Sidebar: Fully transparent wrapper, separate cards over dots */}
      <aside className="hidden lg:flex h-full w-[350px] shrink-0 flex-col bg-transparent">
        {sidebarCards}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute top-0 bottom-0 left-0 w-[320px] max-w-[85vw]"
            >
              {sidebarCards}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
