"use client";

import { motion } from "motion/react";
import { UploadCloud, FileText, AlertCircle } from "lucide-react";
import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
  isUploading?: boolean;
  uploadStep?: string;
  error?: string | null;
  disabled?: boolean;
  documentCount?: number;
  maxDocuments?: number;
}

export function UploadZone({
  onFileSelect,
  isUploading = false,
  uploadStep = "Reading pages…",
  error = null,
  disabled = false,
  documentCount = 0,
  maxDocuments = 5,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = documentCount >= maxDocuments;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading || isLimitReached) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading || isLimitReached) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        whileHover={disabled || isUploading || isLimitReached ? undefined : { scale: 1.01 }}
        whileTap={disabled || isUploading || isLimitReached ? undefined : { scale: 0.99 }}
        onClick={() => {
          if (!disabled && !isUploading && !isLimitReached) {
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "glass-card-text relative flex flex-col items-center justify-center rounded-[24px] p-6 text-center transition-all cursor-pointer",
          isDragOver && "bg-white/40 shadow-xl",
          (disabled || isLimitReached) && "cursor-not-allowed opacity-60",
          isUploading && "cursor-wait"
        )}
      >
        {/* Subtle inner dashed indicator for drag-and-drop affordance */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-2 rounded-[18px] border border-dashed transition-colors",
            isDragOver ? "border-black/30" : "border-white/50"
          )}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading || isLimitReached}
        />

        {isUploading ? (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
            <div className="space-y-1">
              <p className="font-heading font-semibold text-sm text-[#1f1f23]">
                {uploadStep}
              </p>
              <p className="text-xs text-[#5b5b66]">
                Extracting and indexing text chunks…
              </p>
            </div>
          </div>
        ) : isLimitReached ? (
          <div className="relative z-10 flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-[#5b5b66]" />
            <p className="font-heading font-semibold text-sm text-[#1f1f23]">
              Document limit reached ({maxDocuments}/{maxDocuments})
            </p>
            <p className="text-xs text-[#5b5b66]">
              Delete an existing document to upload another.
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
              <UploadCloud className="h-5 w-5 text-[#1f1f23]" />
            </div>
            <div className="space-y-1">
              <p className="font-heading font-semibold text-base text-[#1f1f23]">
                Upload PDF document
              </p>
              <p className="text-xs text-[#5b5b66]">
                Drag and drop or click to browse (up to 10 MB, 100 pages)
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Error state display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2.5 flex items-start gap-2 rounded-2xl border border-red-200/90 bg-red-50/80 p-3 text-xs text-red-700 shadow-[0_0_0_1px_rgba(200,50,50,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[20px]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="leading-relaxed font-medium">{error}</p>
        </motion.div>
      )}
    </div>
  );
}

export default UploadZone;
