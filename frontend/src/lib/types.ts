export interface DocumentInfo {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  status: "processing" | "ready" | "failed";
}

export interface Source {
  filename: string;
  page: number;
  similarity: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  status?: "streaming" | "done" | "error" | "stopped";
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestPayload {
  question: string;
  history?: ChatHistoryItem[];
  document_ids?: string[];
}

export interface SSEDoneData {
  latency_ms?: number;
  first_token_ms?: number;
  chunks_used?: number;
}

export interface SSETokenData {
  text: string;
}

export interface SSEErrorData {
  message: string;
}
