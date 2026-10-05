"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Source } from "@/lib/types";
import { streamChat } from "@/lib/sse";
import { getStoredSessionId } from "@/hooks/useSession";

export interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isThinking: boolean;
  isWakingServer: boolean;
  error: string | null;
  sendMessage: (question: string, documentIds?: string[]) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
  retryLastQuestion: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsThinking: (isThinking: boolean) => void;
  setIsWakingServer: (isWaking: boolean) => void;
  setError: (error: string | null) => void;
}

export function useChat(sessionId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const coldStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQuestionRef = useRef<string>("");

  const clearColdStartTimer = () => {
    if (coldStartTimerRef.current) {
      clearTimeout(coldStartTimerRef.current);
      coldStartTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearColdStartTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearColdStartTimer();
    setIsStreaming(false);
    setIsThinking(false);
    setIsWakingServer(false);

    // Keep partial text, mark assistant message status as stopped
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 && msg.role === "assistant" && msg.status === "streaming"
          ? { ...msg, status: "stopped" }
          : msg
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (question: string, documentIds?: string[]) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;

      const sid = sessionId || getStoredSessionId();
      if (!sid) {
        setError("Session not ready. Please refresh the page.");
        return;
      }

      setError(null);
      lastQuestionRef.current = trimmed;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        status: "streaming",
      };

      // Extract last 6 messages as chat history for backend context
      const history = messages
        .filter(
          (m) =>
            m.content &&
            (m.status === "done" || m.status === "stopped" || m.role === "user")
        )
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Append user message and streaming assistant placeholder
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setIsThinking(true);
      setIsWakingServer(false);

      // Start 4s cold-start notification timer
      clearColdStartTimer();
      coldStartTimerRef.current = setTimeout(() => {
        setIsWakingServer(true);
      }, 4000);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await streamChat({
          sessionId: sid,
          payload: {
            question: trimmed,
            history,
            document_ids: documentIds,
          },
          signal: controller.signal,
          callbacks: {
            onFirstByte: () => {
              clearColdStartTimer();
              setIsWakingServer(false);
            },
            onSources: (sources: Source[]) => {
              clearColdStartTimer();
              setIsWakingServer(false);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, sources } : m
                )
              );
            },
            onToken: (tokenPiece: string) => {
              // Hide AiLoading as soon as the first token arrives
              setIsThinking(false);
              clearColdStartTimer();
              setIsWakingServer(false);

              // Smoothly append incoming token
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + tokenPiece }
                    : m
                )
              );
            },
            onDone: () => {
              clearColdStartTimer();
              setIsWakingServer(false);
              setIsThinking(false);
              setIsStreaming(false);

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, status: "done" } : m
                )
              );
            },
            onError: (friendlyErrorMessage: string) => {
              clearColdStartTimer();
              setIsWakingServer(false);
              setIsThinking(false);
              setIsStreaming(false);
              setError(friendlyErrorMessage);

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, status: "error" } : m
                )
              );
            },
          },
        });
      } catch {
        // Handled in callbacks
      } finally {
        clearColdStartTimer();
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, messages]
  );

  const clearMessages = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setError(null);
    setIsThinking(false);
    setIsWakingServer(false);
  }, [stopStreaming]);

  const retryLastQuestion = useCallback(() => {
    if (lastQuestionRef.current) {
      // Remove failed assistant message from list before retrying
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.status === "error") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(lastQuestionRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    isThinking,
    isWakingServer,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    retryLastQuestion,
    setMessages,
    setIsThinking,
    setIsWakingServer,
    setError,
  };
}
