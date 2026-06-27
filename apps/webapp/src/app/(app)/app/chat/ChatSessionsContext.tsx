"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ChatSession } from "@bondery/schemas";

interface ChatSessionsContextValue {
  sessions: ChatSession[];
  addSession: (session: ChatSession) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, patch: Partial<ChatSession>) => void;
  /** Incremented when the user clicks "new chat" — ChatView watches this to reset. */
  chatResetKey: number;
  triggerChatReset: () => void;
}

const ChatSessionsContext = createContext<ChatSessionsContextValue | null>(
  null,
);

export function ChatSessionsProvider({
  initialSessions,
  children,
}: {
  initialSessions: ChatSession[];
  children: React.ReactNode;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [chatResetKey, setChatResetKey] = useState(0);

  const addSession = useCallback((session: ChatSession) => {
    setSessions((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.id === session.id)) return prev;
      return [session, ...prev];
    });
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const updateSession = useCallback(
    (sessionId: string, patch: Partial<ChatSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const triggerChatReset = useCallback(() => {
    setChatResetKey((k) => k + 1);
  }, []);

  return (
    <ChatSessionsContext.Provider
      value={{
        sessions,
        addSession,
        removeSession,
        updateSession,
        chatResetKey,
        triggerChatReset,
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions() {
  const ctx = useContext(ChatSessionsContext);
  if (!ctx)
    throw new Error("useChatSessions must be used within ChatSessionsProvider");
  return ctx;
}
