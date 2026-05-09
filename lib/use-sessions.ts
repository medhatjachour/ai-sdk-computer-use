import { useCallback, useState } from "react";
import type { UIMessage } from "ai";
import type { Session } from "./types";

const SESSIONS_KEY = "ai-agent-sessions";
const messagesKey = (id: string) => `ai-agent-messages-${id}`;

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Strips base64 image data before saving to localStorage
function redactMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts?.map((part) => {
      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.state === "result" &&
        part.toolInvocation.result?.type === "image"
      ) {
        return {
          ...part,
          toolInvocation: {
            ...part.toolInvocation,
            result: "[screenshot redacted]",
          },
        };
      }
      return part;
    }),
  }));
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function loadSessionMessages(sessionId: string): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(messagesKey(sessionId));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionMessages(
  sessionId: string,
  messages: UIMessage[]
): void {
  try {
    localStorage.setItem(
      messagesKey(sessionId),
      JSON.stringify(redactMessages(messages))
    );
  } catch {
    /* quota exceeded */
  }
}

function deleteSessionMessages(sessionId: string): void {
  try {
    localStorage.removeItem(messagesKey(sessionId));
  } catch {
    /* noop */
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const stored = loadSessions();
    if (stored.length > 0) return stored;
    // Create a default session on first load
    const defaultSession: Session = {
      id: nanoid(),
      title: "New session",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sandboxId: null,
    };
    saveSessions([defaultSession]);
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0].id
  );

  const createSession = useCallback((): Session => {
    const session: Session = {
      id: nanoid(),
      title: "New session",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sandboxId: null,
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveSessionId(session.id);
    return session;
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      deleteSessionMessages(id);
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSessions(next);
        return next;
      });
      // If we deleted the active session, switch to the first remaining
      if (id === activeSessionId) {
        setSessions((prev) => {
          if (prev.length > 0) setActiveSessionId(prev[0].id);
          return prev;
        });
      }
    },
    [activeSessionId]
  );

  const updateSession = useCallback(
    (id: string, patch: Partial<Pick<Session, "title" | "sandboxId" | "updatedAt">>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        saveSessions(next);
        return next;
      });
    },
    []
  );

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSession,
  };
}
