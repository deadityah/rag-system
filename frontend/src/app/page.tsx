"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { DocumentInfo, ChatMessage } from "@/lib/types";
import { useSession } from "@/hooks/useSession";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { DotBackground } from "@/components/background/DotBackground";
import { Sidebar } from "@/components/layout/Sidebar";
import { NavBar } from "@/components/layout/NavBar";
import { ChatWindow } from "@/components/chat/ChatWindow";

// Mock data used ONLY for Phase 2 State Preview in development mode
const MOCK_PREVIEW_DOCS: DocumentInfo[] = [
  {
    id: "doc-preview-1",
    filename: "q3_financial_report_2025.pdf",
    page_count: 14,
    chunk_count: 42,
    status: "ready",
  },
  {
    id: "doc-preview-2",
    filename: "product_architecture_spec.pdf",
    page_count: 8,
    chunk_count: 26,
    status: "ready",
  },
];

const MOCK_PREVIEW_MESSAGES: ChatMessage[] = [
  {
    id: "msg-preview-1",
    role: "user",
    content: "What were the main revenue drivers reported for Q3?",
  },
  {
    id: "msg-preview-2",
    role: "assistant",
    content:
      "According to the report, the primary revenue drivers for Q3 were:\n\n* **Cloud Services Growth**: Up by **34% year-over-year**, driven by enterprise migration contracts (q3_financial_report_2025.pdf, p. 3).\n* **Subscription Renewals**: Reached an all-time high retention rate of **94.2%** (q3_financial_report_2025.pdf, p. 5).\n* **Hardware Shipments**: Remained steady with **$12.4M** in regional sales (q3_financial_report_2025.pdf, p. 7).\n\nOperating expenses decreased by **4.1%** over the same period (q3_financial_report_2025.pdf, p. 8).",
    status: "done",
    sources: [
      {
        filename: "q3_financial_report_2025.pdf",
        page: 3,
        similarity: 0.88,
        snippet: "Cloud services revenue expanded by 34% year-over-year...",
      },
    ],
  },
];

export default function Home() {
  const sessionId = useSession();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Real backend documents hook
  const {
    documents,
    isUploading,
    uploadStep,
    uploadError,
    handleUploadFile,
    handleDeleteDocument,
    setDocuments,
    setUploadError,
    setUploadStep,
    setIsUploading,
  } = useDocuments(sessionId);

  // Real SSE chat hook
  const {
    messages,
    isStreaming,
    isThinking,
    isWakingServer,
    error: chatError,
    sendMessage,
    stopStreaming,
    clearMessages,
    retryLastQuestion,
    setMessages,
    setIsThinking,
    setIsWakingServer,
    setError: setChatError,
  } = useChat(sessionId);

  const handleToggleDocuments = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      const uploadEl = document.getElementById("sidebar-upload-zone");
      if (uploadEl) {
        uploadEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // State preview loader for development debugging
  const loadPresetState = (stateName: string) => {
    stopStreaming();
    setUploadError(null);
    setChatError(null);
    setIsWakingServer(false);
    setIsUploading(false);
    setIsThinking(false);

    switch (stateName) {
      case "empty":
        setDocuments([]);
        setMessages([]);
        break;
      case "docs-no-messages":
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages([]);
        break;
      case "uploading":
        setDocuments(MOCK_PREVIEW_DOCS);
        setIsUploading(true);
        setUploadStep("Understanding text…");
        break;
      case "upload-failed":
        setDocuments(MOCK_PREVIEW_DOCS);
        setUploadError(
          "This PDF looks like a scanned image. Please upload a text-based PDF."
        );
        break;
      case "thinking":
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages([MOCK_PREVIEW_MESSAGES[0]]);
        setIsThinking(true);
        break;
      case "not-found":
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages([
          { id: "q-nf", role: "user", content: "Who won the 2026 World Cup?" },
          {
            id: "a-nf",
            role: "assistant",
            content:
              "I couldn't find that in your documents. Try rephrasing your question, or upload a document that covers this topic.",
            status: "done",
          },
        ]);
        break;
      case "cold-start":
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages(MOCK_PREVIEW_MESSAGES);
        setIsWakingServer(true);
        break;
      case "error":
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages(MOCK_PREVIEW_MESSAGES);
        setChatError(
          "The AI service is temporarily busy. Please try again in a moment."
        );
        break;
      case "normal":
      default:
        setDocuments(MOCK_PREVIEW_DOCS);
        setMessages(MOCK_PREVIEW_MESSAGES);
        break;
    }
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    // Only the page body/root is pure white (#ffffff)
    <div className="relative min-h-screen min-h-[100dvh] w-full select-none overflow-hidden bg-[#ffffff]">
      {/* Background Dot Layer (pure black dots covering entire screen, z-index: 0) */}
      <DotBackground />

      {/* Main Layout Container (fully transparent wrapper, z-index: 10) */}
      <div className="relative z-10 flex h-screen h-[100dvh] flex-col p-3 sm:p-5 lg:p-6 bg-transparent">
        {/* Header / Top Bar containing NavBar (floating pill at top center on desktop, compact on mobile) */}
        <header className="relative z-20 mb-3 flex shrink-0 items-center justify-between lg:justify-center">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="font-logo font-normal text-xl tracking-normal text-[#1f1f23]">
              DocuMind
            </span>
          </div>

          <NavBar
            onNewChat={clearMessages}
            onToggleDocuments={handleToggleDocuments}
            hasMessages={messages.length > 0}
            documentCount={documents.length}
          />
        </header>

        {/* Content Columns: fully transparent wrapper, no big glass container */}
        <div className="flex flex-1 min-h-0 gap-5 bg-transparent">
          <Sidebar
            documents={documents}
            onUploadFile={handleUploadFile}
            onDeleteDocument={handleDeleteDocument}
            isUploading={isUploading}
            uploadStep={uploadStep}
            uploadError={uploadError}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          <main className="flex-1 min-h-0 bg-transparent flex flex-col">
            <ChatWindow
              messages={messages}
              hasDocuments={documents.length > 0}
              isStreaming={isStreaming}
              isThinking={isThinking}
              isWakingServer={isWakingServer}
              error={chatError}
              onSendMessage={(q) => sendMessage(q)}
              onStopStreaming={stopStreaming}
              onRetry={retryLastQuestion}
              onSelectSuggestion={(prompt) => sendMessage(prompt)}
            />
          </main>
        </div>

        {/* Card H: Phase 2 State Preview Bar (dev only) */}
        {isDev && (
          <footer className="glass-card mt-3 hidden sm:flex items-center justify-between rounded-full px-5 py-2 text-xs text-[#5b5b66]">
            <div className="flex items-center gap-2 font-heading font-semibold text-[#1f1f23]">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span>Phase 2 State Preview (Dev Only):</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => loadPresetState("normal")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Normal Chat
              </button>
              <button
                onClick={() => loadPresetState("empty")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Empty State
              </button>
              <button
                onClick={() => loadPresetState("docs-no-messages")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Chips Only
              </button>
              <button
                onClick={() => loadPresetState("uploading")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Uploading
              </button>
              <button
                onClick={() => loadPresetState("upload-failed")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Upload Error
              </button>
              <button
                onClick={() => loadPresetState("thinking")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                AI Loading
              </button>
              <button
                onClick={() => loadPresetState("not-found")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Not Found
              </button>
              <button
                onClick={() => loadPresetState("cold-start")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Cold Start
              </button>
              <button
                onClick={() => loadPresetState("error")}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#1f1f23] hover:bg-white/50 transition-colors"
              >
                Server Error
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
