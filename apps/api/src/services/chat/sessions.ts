import type { Json } from "@bondery/schemas/supabase.types";
import type { UIMessage } from "ai";
import type { DomainContext } from "../../domains/_shared/context.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

const CHAT_SESSION_SELECT = "id, userId:user_id, title, createdAt:created_at, updatedAt:updated_at";

export async function createChatSession(ctx: DomainContext) {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("chat_sessions")
    .insert({ user_id: user.id })
    .select(CHAT_SESSION_SELECT)
    .single();

  if (error || !data) {
    throw internal("chat_session_failed_to_create_session");
  }

  return data;
}

export async function updateChatSessionTitle(ctx: DomainContext, sessionId: string, title: string) {
  const { client } = ctx;

  const { data, error } = await client
    .from("chat_sessions")
    .update({ title })
    .eq("id", sessionId)
    .select(CHAT_SESSION_SELECT)
    .single();

  if (error || !data) {
    throw internal("chat_session_failed_to_update_session");
  }

  return data;
}

export async function deleteChatSession(ctx: DomainContext, sessionId: string): Promise<void> {
  const { client } = ctx;

  const { error } = await client.from("chat_sessions").delete().eq("id", sessionId);
  if (error) {
    throw internal("chat_session_failed_to_delete_session");
  }
}

export async function persistChatMessages(
  ctx: DomainContext,
  sessionId: string,
  userMessage: UIMessage,
  assistantText: string,
): Promise<void> {
  const { client } = ctx;

  const userText =
    userMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  const { error: userErr } = await client.from("chat_messages").insert({
    content: { text: userText } as unknown as Json,
    role: "user" as const,
    session_id: sessionId,
  });
  if (userErr) {
    ctx.log?.error({ err: userErr }, "Failed to save user message");
  }

  const { error: assistantErr } = await client.from("chat_messages").insert({
    content: { text: assistantText } as unknown as Json,
    role: "assistant" as const,
    session_id: sessionId,
  });
  if (assistantErr) {
    ctx.log?.error({ err: assistantErr }, "Failed to save assistant message");
  }

  await client
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function setChatSessionTitleIfEmpty(
  ctx: DomainContext,
  sessionId: string,
  title: string,
): Promise<void> {
  const { client } = ctx;

  const { data: session } = await client
    .from("chat_sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  if (session?.title || !title) {
    return;
  }

  const { error } = await client.from("chat_sessions").update({ title }).eq("id", sessionId);
  if (error) {
    ctx.log?.error({ err: error }, "Failed to set chat session title");
  }
}
