"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentInfo } from "@/lib/types";
import { listDocuments, uploadDocument, deleteDocument } from "@/lib/api";

export interface UseDocumentsReturn {
  documents: DocumentInfo[];
  isLoading: boolean;
  isUploading: boolean;
  uploadStep: string;
  uploadError: string | null;
  fetchDocuments: () => Promise<void>;
  handleUploadFile: (file: File) => Promise<DocumentInfo | null>;
  handleDeleteDocument: (id: string) => Promise<boolean>;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentInfo[]>>;
  setUploadError: (error: string | null) => void;
  setUploadStep: (step: string) => void;
  setIsUploading: (isUploading: boolean) => void;
}

export function useDocuments(sessionId: string | null): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("Uploading…");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const stepTimerRef1 = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef2 = useRef<NodeJS.Timeout | null>(null);

  const clearStepTimers = () => {
    if (stepTimerRef1.current) {
      clearTimeout(stepTimerRef1.current);
      stepTimerRef1.current = null;
    }
    if (stepTimerRef2.current) {
      clearTimeout(stepTimerRef2.current);
      stepTimerRef2.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearStepTimers();
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const docs = await listDocuments(sessionId);
      setDocuments(docs);
    } catch (err: unknown) {
      // If fetching fails on initial load (e.g. backend temporarily sleeping),
      // we log but don't crash the UI
      console.warn("Could not fetch documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchDocuments();
    }
  }, [sessionId, fetchDocuments]);

  const handleUploadFile = useCallback(
    async (file: File): Promise<DocumentInfo | null> => {
      setUploadError(null);
      clearStepTimers();

      // 1. Client-side extension check
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setUploadError("Only PDF files are supported.");
        return null;
      }

      // 2. Client-side size check (max 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("That file is larger than 10 MB.");
        return null;
      }

      // 3. Client-side empty file check
      if (file.size === 0) {
        setUploadError("The file is empty.");
        return null;
      }

      // 4. Client-side document count limit (max 5)
      if (documents.length >= 5) {
        setUploadError("You can keep up to 5 documents. Delete one to add another.");
        return null;
      }

      // 5. Client-side magic bytes check (%PDF-)
      try {
        const headerBuffer = await file.slice(0, 1024).arrayBuffer();
        const headerText = new TextDecoder("latin1").decode(headerBuffer);
        if (!headerText.includes("%PDF-")) {
          setUploadError("Only PDF files are supported.");
          return null;
        }
      } catch {
        setUploadError("Only PDF files are supported.");
        return null;
      }

      if (!sessionId) {
        setUploadError("Session ID is required to upload files.");
        return null;
      }

      setIsUploading(true);
      setUploadStep("Uploading…");

      stepTimerRef1.current = setTimeout(() => {
        setUploadStep("Reading pages…");
      }, 600);

      stepTimerRef2.current = setTimeout(() => {
        setUploadStep("Understanding text…");
      }, 1800);

      try {
        const uploadedDoc = await uploadDocument(file, sessionId);
        setDocuments((prev) => [uploadedDoc, ...prev]);
        setUploadStep("Ready");
        return uploadedDoc;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Upload failed. Please try again.";
        setUploadError(message);
        return null;
      } finally {
        clearStepTimers();
        setIsUploading(false);
      }
    },
    [sessionId, documents.length]
  );

  const handleDeleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!sessionId) return false;

      try {
        await deleteDocument(id, sessionId);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete document.";
        setUploadError(message);
        return false;
      }
    },
    [sessionId]
  );

  return {
    documents,
    isLoading,
    isUploading,
    uploadStep,
    uploadError,
    fetchDocuments,
    handleUploadFile,
    handleDeleteDocument,
    setDocuments,
    setUploadError,
    setUploadStep,
    setIsUploading,
  };
}
