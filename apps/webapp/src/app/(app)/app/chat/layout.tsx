import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/lib/config";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ChatSessionSidebar } from "./ChatSessionSidebar";
import { ChatSessionsProvider } from "./ChatSessionsContext";
import type { ChatSession } from "@bondery/types";
import { Box } from "@mantine/core";

/**
 * Chat layout — fetches sessions once on the server, then hands them to the
 * client-side ChatSessionsProvider so mutations (add/remove) are instant.
 */
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  let sessions: ChatSession[] = [];

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${API_ROUTES.CHAT_SESSIONS}`, {
      headers,
      cache: "no-store",
    });
    if (response.ok) {
      const result = await response.json();
      sessions = result?.data ?? [];
    }
  } catch {}

  return (
    <ChatSessionsProvider initialSessions={sessions}>
      <Box
        style={{
          display: "flex",
          height: "100dvh",
          marginTop: "calc(-1 * var(--mantine-spacing-md))",
          marginBottom: "calc(-1 * var(--mantine-spacing-md))",
          marginLeft: "calc(-1 * var(--mantine-spacing-md))",
          overflow: "hidden",
        }}
      >
        <ChatSessionSidebar />
        <Box style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</Box>
      </Box>
    </ChatSessionsProvider>
  );
}
