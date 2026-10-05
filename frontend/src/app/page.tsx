"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Layers } from "lucide-react";
import type { DocumentInfo, ChatMessage } from "@/lib/types";
import { DotBackground } from "@/components/background/DotBackground";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GlassButton } from "@/components/ui/GlassButton";

// Fake initial documents
const INITIAL_DOCS: DocumentInfo[] = [
  {
    id: "doc-1",
    filename: "q3_financial_report_2025.pdf",
    page_count: 14,
    chunk_count: 42,
    status: "ready",
  },
  {
    id: "doc-2",
    filename: "product_architecture_spec.pdf",
    page_count: 8,
    chunk_count: 26,
    status: "ready",
  },
];

// Fake conversation showing inline citations
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "What were the main revenue drivers reported for Q3?",
  },
  {
    id: "msg-2",
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
  const [documents, setDocuments] = useState<DocumentInfo[]>(INITIAL_DOCS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // States to test from 02-DESIGN-SYSTEM.md
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("Reading pages…");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) clearInterval(streamingTimerRef.current);
    };
  }, []);

  const handleUploadFile = (file: File) => {
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("That file is larger than 10 MB.");
      return;
    }

    setIsUploading(true);
    setUploadStep("Reading pages…");

    setTimeout(() => {
      setUploadStep("Understanding text…");
      setTimeout(() => {
        setUploadStep("Ready");
        const newDoc: DocumentInfo = {
          id: `doc-${Date.now()}`,
          filename: file.name,
          page_count: Math.floor(Math.random() * 20) + 1,
          chunk_count: Math.floor(Math.random() * 50) + 10,
          status: "ready",
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setIsUploading(false);
      }, 1000);
    }, 1000);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSendMessage = (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setIsStreaming(true);

    const fullResponse =
      "Based on **" +
      (documents[0]?.filename || "uploaded documents") +
      "**, here are the key findings:\n\n* The system processes incoming requests through a verified pipeline with page-level indexing (p. 2).\n* All answers are grounded strictly in document excerpts to eliminate outside hallucinations (p. 4).\n* Vector embeddings are normalized to **768 dimensions** for cosine similarity matching (p. 6).";

    setTimeout(() => {
      setIsThinking(false);

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          status: "streaming",
        },
      ]);

      const words = fullResponse.split(" ");
      let currentWordIndex = 0;

      streamingTimerRef.current = setInterval(() => {
        currentWordIndex++;
        const currentContent = words.slice(0, currentWordIndex).join(" ");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: currentContent,
                  status:
                    currentWordIndex >= words.length ? "done" : "streaming",
                }
              : msg
          )
        );

        if (currentWordIndex >= words.length) {
          if (streamingTimerRef.current) clearInterval(streamingTimerRef.current);
          setIsStreaming(false);
        }
      }, 70);
    }, 800);
  };

  const handleStopStreaming = () => {
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
    }
    setIsStreaming(false);
    setIsThinking(false);
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 && msg.role === "assistant"
          ? { ...msg, status: "stopped" }
          : msg
      )
    );
  };

  const loadPresetState = (stateName: string) => {
    if (streamingTimerRef.current) clearInterval(streamingTimerRef.current);
    setIsStreaming(false);
    setIsThinking(false);
    setUploadError(null);
    setGlobalError(null);
    setIsWakingServer(false);
    setIsUploading(false);

    switch (stateName) {
      case "empty":
        setDocuments([]);
        setMessages([]);
        break;
      case "docs-no-messages":
        setDocuments(INITIAL_DOCS);
        setMessages([]);
        break;
      case "uploading":
        setDocuments(INITIAL_DOCS);
        setIsUploading(true);
        setUploadStep("Understanding text…");
        break;
      case "upload-failed":
        setDocuments(INITIAL_DOCS);
        setUploadError("This PDF looks like a scanned image. Please upload a text-based PDF.");
        break;
      case "thinking":
        setDocuments(INITIAL_DOCS);
        setMessages([INITIAL_MESSAGES[0]]);
        setIsThinking(true);
        break;
      case "streaming":
        setDocuments(INITIAL_DOCS);
        setMessages(INITIAL_MESSAGES);
        handleSendMessage("Explain the technical architecture in detail.");
        break;
      case "not-found":
        setDocuments(INITIAL_DOCS);
        setMessages([
          { id: "q", role: "user", content: "Who won the 2026 World Cup?" },
          {
            id: "a",
            role: "assistant",
            content:
              "I couldn't find that in your documents. Try rephrasing your question, or upload a document that covers this topic.",
            status: "done",
          },
        ]);
        break;
      case "cold-start":
        setDocuments(INITIAL_DOCS);
        setMessages(INITIAL_MESSAGES);
        setIsWakingServer(true);
        break;
      case "error":
        setDocuments(INITIAL_DOCS);
        setMessages(INITIAL_MESSAGES);
        setGlobalError("The AI service is temporarily busy. Please try again in a moment.");
        break;
      case "normal":
      default:
        setDocuments(INITIAL_DOCS);
        setMessages(INITIAL_MESSAGES);
        break;
    }
  };

  return (
    // Main page background is pure white (#ffffff)
    <div className="relative min-h-screen min-h-[100dvh] w-full select-none overflow-hidden bg-[#ffffff]">
      {/* Background Pure Black Dot Layer Covering Entire Screen */}
      <DotBackground />

      {/* Main Responsive Application Shell */}
      <div className="relative z-10 flex h-screen h-[100dvh] flex-col p-3 sm:p-5 lg:p-6">
        {/* Mobile Top Navigation Bar (translucent liquid glass) */}
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.85)] bg-white/[0.15] px-4 py-2.5 shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_rgba(40,40,60,0.12)] backdrop-blur-[24px] lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-logo font-normal text-xl tracking-normal text-[#1f1f23]">
              DocuMind
            </span>
          </div>

          <GlassButton
            size="sm"
            variant="secondary"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="text-xs"
          >
            <Menu className="mr-1.5 h-3.5 w-3.5" />
            Documents ({documents.length})
          </GlassButton>
        </div>

        {/* Desktop Side-by-Side Panels (rounded-24px, translucent glass) */}
        <div className="flex flex-1 gap-5 overflow-hidden">
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

          <main className="flex-1 overflow-hidden">
            <ChatWindow
              messages={messages}
              hasDocuments={documents.length > 0}
              isStreaming={isStreaming}
              isThinking={isThinking}
              isWakingServer={isWakingServer}
              error={globalError}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRetry={() => handleSendMessage("Retry previous request")}
              onSelectSuggestion={(prompt) => handleSendMessage(prompt)}
            />
          </main>
        </div>

        {/* Phase 2 Interactive State Switcher */}
        <footer className="mt-3 hidden sm:flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.85)] bg-white/[0.15] px-3.5 py-1.5 text-xs text-[#5b5b66] shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-[24px]">
          <div className="flex items-center gap-1.5 font-heading font-semibold text-[#1f1f23]">
            <Layers className="h-3.5 w-3.5 text-accent" />
            <span>Phase 2 State Preview:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => loadPresetState("normal")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Normal Chat
            </button>
            <button
              onClick={() => loadPresetState("empty")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Empty State
            </button>
            <button
              onClick={() => loadPresetState("docs-no-messages")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Chips Only
            </button>
            <button
              onClick={() => loadPresetState("uploading")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Uploading
            </button>
            <button
              onClick={() => loadPresetState("upload-failed")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Upload Error
            </button>
            <button
              onClick={() => loadPresetState("thinking")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Thinking Dot
            </button>
            <button
              onClick={() => loadPresetState("not-found")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Not Found
            </button>
            <button
              onClick={() => loadPresetState("cold-start")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Cold Start
            </button>
            <button
              onClick={() => loadPresetState("error")}
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#1f1f23] hover:bg-white/40 transition-colors"
            >
              Server Error
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
