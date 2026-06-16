/**
 * Chat Session Domain Types
 * Types for AI assistant chat session history
 */

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  /** Full UIMessage JSON from @ai-sdk/react, stored as JSONB in the database. */
  content: Record<string, unknown>;
  created_at: string;
}
