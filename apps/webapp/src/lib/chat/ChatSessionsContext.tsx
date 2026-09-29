"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ChatSessionsContextValue {
  /** Incremented when the user clicks "new chat" — ChatClient watches this to reset. */
  chatResetKey: number;
  /**
   * Session to highlight before the URL has caught up (first send creates a
   * session on /app/chat, then the URL updates after the stream settles).
   */
  highlightedSessionId: string | undefined;
  setHighlightedSessionId: (sessionId: string | undefined) => void;
  triggerChatReset: () => void;
}

const ChatSessionsContext = createContext<ChatSessionsContextValue | null>(null);

export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const [chatResetKey, setChatResetKey] = useState(0);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | undefined>();

  const triggerChatReset = useCallback(() => {
    setHighlightedSessionId(undefined);
    setChatResetKey((k) => k + 1);
  }, []);

  return (
    <ChatSessionsContext.Provider
      value={{
        chatResetKey,
        highlightedSessionId,
        setHighlightedSessionId,
        triggerChatReset,
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions() {
  const ctx = useContext(ChatSessionsContext);
  if (!ctx) {
    throw new Error("useChatSessions must be used within ChatSessionsProvider");
  }
  return ctx;
}
