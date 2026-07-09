"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ChatSessionsContextValue {
  /** Incremented when the user clicks "new chat" — ChatView watches this to reset. */
  chatResetKey: number;
  triggerChatReset: () => void;
}

const ChatSessionsContext = createContext<ChatSessionsContextValue | null>(null);

export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const [chatResetKey, setChatResetKey] = useState(0);

  const triggerChatReset = useCallback(() => {
    setChatResetKey((k) => k + 1);
  }, []);

  return (
    <ChatSessionsContext.Provider
      value={{
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
  if (!ctx) {
    throw new Error("useChatSessions must be used within ChatSessionsProvider");
  }
  return ctx;
}
