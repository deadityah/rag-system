import type {
  ChatRequestPayload,
  SSEDoneData,
  Source,
} from "./types.ts";
import { getApiBaseUrl } from "./api.ts";

export interface RawSSEEvent {
  event: string;
  data: string;
}

export type SSEEventListener = (event: RawSSEEvent) => void;

/**
 * Standard-compliant streaming SSE parser that handles:
 * - Chunk boundaries cutting through event names, data fields, or double-newlines
 * - Multi-line data fields
 * - Comments starting with ':'
 * - Multiple events in a single chunk
 * - CRLF, LF, and CR newlines across chunk boundaries
 */
export class SSEParser {
  private buffer = "";
  private currentEvent = "";
  private currentData: string[] = [];
  private onEvent: SSEEventListener;

  constructor(onEvent: SSEEventListener) {
    this.onEvent = onEvent;
  }

  /**
   * Feed a new text chunk from the stream reader into the parser.
   */
  feed(chunk: string): void {
    this.buffer += chunk;

    // If the chunk ends with an incomplete carriage return, wait for the next chunk
    // to determine if it is a CRLF or a standalone CR.
    if (this.buffer.endsWith("\r")) {
      return;
    }

    const lines = this.buffer.split(/\r\n|\r|\n/);
    // Keep incomplete trailing line in the buffer
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        // Double newline / empty line dispatches the accumulated event
        this.dispatchCurrent();
      } else if (line.startsWith(":")) {
        // SSE comments are ignored (e.g., keepalive ping)
        continue;
      } else if (line.startsWith("event:")) {
        this.currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        let val = line.slice(5);
        if (val.startsWith(" ")) {
          val = val.slice(1);
        }
        this.currentData.push(val);
      }
    }
  }

  /**
   * Flush any remaining buffered content when the stream finishes.
   */
  flush(): void {
    if (this.buffer.trim().length > 0) {
      const lines = this.buffer.split(/\r\n|\r|\n/);
      for (const line of lines) {
        if (line === "") {
          this.dispatchCurrent();
        } else if (line.startsWith(":")) {
          continue;
        } else if (line.startsWith("event:")) {
          this.currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          let val = line.slice(5);
          if (val.startsWith(" ")) {
            val = val.slice(1);
          }
          this.currentData.push(val);
        }
      }
    }
    this.dispatchCurrent();
    this.buffer = "";
  }

  private dispatchCurrent(): void {
    if (this.currentEvent || this.currentData.length > 0) {
      this.onEvent({
        event: this.currentEvent || "message",
        data: this.currentData.join("\n"),
      });
      this.currentEvent = "";
      this.currentData = [];
    }
  }
}

export interface StreamChatCallbacks {
  onFirstByte?: () => void;
  onSources?: (sources: Source[]) => void;
  onToken?: (text: string) => void;
  onDone?: (doneData: SSEDoneData) => void;
  onError?: (errorMessage: string) => void;
}

export interface StreamChatOptions {
  baseUrl?: string;
  sessionId: string;
  payload: ChatRequestPayload;
  signal?: AbortSignal;
  callbacks: StreamChatCallbacks;
}

/**
 * Initiates POST /api/chat with X-Session-Id and reads SSE stream.
 */
export async function streamChat({
  baseUrl = getApiBaseUrl(),
  sessionId,
  payload,
  signal,
  callbacks,
}: StreamChatOptions): Promise<void> {
  let firstByteReported = false;

  const markFirstByte = () => {
    if (!firstByteReported) {
      firstByteReported = true;
      callbacks.onFirstByte?.();
    }
  };

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let friendlyError = "Something went wrong on our side. Please try again.";
      try {
        const errorData = await res.json();
        friendlyError = errorData.message || errorData.detail || friendlyError;
      } catch {
        if (res.status === 429) {
          friendlyError = "Too many requests. Please wait a bit.";
        }
      }
      callbacks.onError?.(friendlyError);
      return;
    }

    if (!res.body) {
      callbacks.onError?.("No response stream received from the server.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    const parser = new SSEParser((event: RawSSEEvent) => {
      markFirstByte();

      switch (event.event) {
        case "sources": {
          try {
            const sources = JSON.parse(event.data) as Source[];
            callbacks.onSources?.(sources);
          } catch {
            callbacks.onSources?.([]);
          }
          break;
        }

        case "token": {
          try {
            const parsed = JSON.parse(event.data);
            if (typeof parsed?.text === "string") {
              callbacks.onToken?.(parsed.text);
            }
          } catch {
            // If raw text was passed
            callbacks.onToken?.(event.data);
          }
          break;
        }

        case "done": {
          try {
            const doneData = JSON.parse(event.data) as SSEDoneData;
            callbacks.onDone?.(doneData);
          } catch {
            callbacks.onDone?.({});
          }
          break;
        }

        case "error": {
          try {
            const errorObj = JSON.parse(event.data);
            callbacks.onError?.(
              errorObj.message ||
                "Something went wrong on our side. Please try again."
            );
          } catch {
            callbacks.onError?.(
              event.data || "Something went wrong on our side. Please try again."
            );
          }
          break;
        }

        default:
          break;
      }
    });

    while (true) {
      const { done, value } = await reader.read();
      if (value && value.length > 0) {
        markFirstByte();
        const textChunk = decoder.decode(value, { stream: !done });
        parser.feed(textChunk);
      }
      if (done) {
        break;
      }
    }

    parser.flush();
  } catch (err: unknown) {
    if (
      signal?.aborted ||
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      // Intentionally stopped by user via Stop button, do not emit error
      return;
    }

    let message =
      "Could not reach the server. Please check that the backend is running.";
    if (err instanceof Error && err.message) {
      if (
        !err.message.includes("Failed to fetch") &&
        !err.message.includes("NetworkError")
      ) {
        message = err.message;
      }
    }

    callbacks.onError?.(message);
  }
}
