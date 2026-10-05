"use client";

import { useEffect, useState } from "react";

export const SESSION_STORAGE_KEY = "documind_session_id";

/**
 * Synchronously retrieves or initializes the session ID in localStorage (client-side only).
 */
export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

/**
 * React hook returning the anonymous session ID.
 * Returns null during SSR to avoid hydration mismatch, then updates on mount.
 */
export function useSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = getStoredSessionId();
    setSessionId(id);
  }, []);

  return sessionId;
}
