import type { DocumentInfo } from "./types.ts";
import { getStoredSessionId } from "../hooks/useSession.ts";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

function resolveSessionId(providedSessionId?: string | null): string {
  const sid = providedSessionId || getStoredSessionId();
  if (!sid) {
    throw new Error("A valid session ID is required.");
  }
  return sid;
}

async function handleResponseError(res: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const errorData = await res.json();
    message = errorData.message || errorData.detail || defaultMessage;
  } catch {
    // If response body is not JSON, use defaultMessage
  }

  // Friendly status fallbacks if generic
  if (!message || message === defaultMessage) {
    if (res.status === 429) {
      message = "Too many requests. Please wait a bit.";
    } else if (res.status === 409) {
      message = "You can keep up to 5 documents. Delete one to add another.";
    } else if (res.status === 413) {
      message = "That file is larger than 10 MB.";
    } else if (res.status === 400) {
      message = "Only PDF files are supported.";
    } else if (res.status >= 500) {
      message = "Something went wrong on our side. Please try again.";
    }
  }

  throw new Error(message);
}

/**
 * Lists all uploaded documents for the active session.
 */
export async function listDocuments(
  sessionId?: string | null
): Promise<DocumentInfo[]> {
  const sid = resolveSessionId(sessionId);
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "GET",
      headers: {
        "X-Session-Id": sid,
      },
    });

    if (!res.ok) {
      return await handleResponseError(
        res,
        "Could not load documents from server."
      );
    }

    return (await res.json()) as DocumentInfo[];
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(
          "Could not reach the server. Please check that the backend is running."
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred while loading documents.");
  }
}

/**
 * Uploads a PDF document for processing and vector storage.
 */
export async function uploadDocument(
  file: File,
  sessionId?: string | null
): Promise<DocumentInfo> {
  const sid = resolveSessionId(sessionId);
  const baseUrl = getApiBaseUrl();

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: {
        "X-Session-Id": sid,
      },
      body: formData,
    });

    if (!res.ok) {
      return await handleResponseError(
        res,
        "Failed to upload document. Please try again."
      );
    }

    return (await res.json()) as DocumentInfo;
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(
          "Could not reach the server. Please check that the backend is running."
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred while uploading the document.");
  }
}

/**
 * Deletes a document and cascades to its chunks.
 */
export async function deleteDocument(
  id: string,
  sessionId?: string | null
): Promise<void> {
  const sid = resolveSessionId(sessionId);
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/documents/${id}`, {
      method: "DELETE",
      headers: {
        "X-Session-Id": sid,
      },
    });

    if (!res.ok) {
      return await handleResponseError(
        res,
        "Failed to delete document. Please try again."
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(
          "Could not reach the server. Please check that the backend is running."
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred while deleting the document.");
  }
}

/**
 * Performs a health check against the backend.
 */
export async function healthCheck(): Promise<{ status: string }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Backend service is not healthy.");
    }

    return (await res.json()) as { status: string };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Could not reach backend health endpoint.");
  }
}
