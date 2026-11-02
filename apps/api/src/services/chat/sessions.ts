import type { Prisma } from "@bondery/db";
import {
  type ChatMessage,
  type ChatSession,
  type ChatToolActivity,
  chatMessageContentSchema,
} from "@bondery/schemas";
import type { UIMessage } from "ai";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";

function toChatSessionDto(row: {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChatSession {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  };
}

export async function createChatSession(ctx: DomainContext) {
  const { user } = ctx;
  const db = domainDb(ctx);

  try {
    const row = await db.chatSession.create({
      data: { userId: user.id },
    });
    return toChatSessionDto(row);
  } catch (error) {
    throw internal(
      "chat_session_failed_to_create_session",
      error instanceof Error ? error.message : undefined,
    );
  }
}

export async function updateChatSessionTitle(ctx: DomainContext, sessionId: string, title: string) {
  const { user } = ctx;
  const db = domainDb(ctx);

  try {
    const row = await db.chatSession.update({
      data: { title },
      where: { id: sessionId, userId: user.id },
    });
    return toChatSessionDto(row);
  } catch (error) {
    throw internal(
      "chat_session_failed_to_update_session",
      error instanceof Error ? error.message : undefined,
    );
  }
}

export async function deleteChatSession(ctx: DomainContext, sessionId: string): Promise<void> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const result = await db.chatSession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });

  if (result.count === 0) {
    throw notFound("Chat session not found", "not_found");
  }
}

export function userMessageText(userMessage: UIMessage): string {
  return (
    userMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? ""
  );
}

async function touchOwnedChatSession(ctx: DomainContext, sessionId: string): Promise<boolean> {
  const { user } = ctx;
  const db = domainDb(ctx);
  const { count } = await db.chatSession.updateMany({
    data: { updatedAt: new Date() },
    where: { id: sessionId, userId: user.id },
  });

  if (count === 0) {
    ctx.log?.error({ sessionId }, "Failed to update chat session timestamp — session not found");
    return false;
  }

  return true;
}

/** Persist the user turn when the request is accepted, before the model stream. */
export async function persistUserChatMessage(
  ctx: DomainContext,
  sessionId: string,
  userMessage: UIMessage,
): Promise<void> {
  const db = domainDb(ctx);

  if (!(await touchOwnedChatSession(ctx, sessionId))) {
    return;
  }

  const userContent = { text: userMessageText(userMessage) } satisfies Prisma.InputJsonValue;

  try {
    await db.chatMessage.create({
      data: {
        content: userContent,
        role: "user",
        sessionId,
      },
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to save user chat message");
  }
}

export interface AssistantMessageContent {
  activities?: ChatToolActivity[];
  status: "complete" | "incomplete";
  text: string;
  writeMayHaveLanded?: boolean;
}

/**
 * Persist an assistant turn exactly once.
 *
 * A stopped or failed reply stores what arrived so far with `status:
 * "incomplete"`. A retry replaces that row instead of adding a second one.
 * Returns the row id of an existing incomplete row when `reuse` is set.
 */
export async function persistAssistantChatMessage(
  ctx: DomainContext,
  sessionId: string,
  content: AssistantMessageContent,
  options: { reuseIncomplete?: boolean } = {},
): Promise<void> {
  const db = domainDb(ctx);

  if (!(await touchOwnedChatSession(ctx, sessionId))) {
    return;
  }

  const assistantContent: Prisma.InputJsonObject = {
    ...(content.activities && content.activities.length > 0
      ? {
          activities: content.activities.map((activity) => ({
            ...(activity.displayName ? { displayName: activity.displayName } : {}),
            kind: activity.kind,
            tool: activity.tool,
          })),
        }
      : {}),
    ...(content.writeMayHaveLanded ? { writeMayHaveLanded: true } : {}),
    status: content.status,
    text: content.text,
  };

  try {
    if (options.reuseIncomplete) {
      const incomplete = await findIncompleteAssistantMessage(ctx, sessionId);

      if (incomplete) {
        await db.chatMessage.update({
          data: { content: assistantContent },
          where: { id: incomplete.id },
        });
        return;
      }
    }

    await db.chatMessage.create({
      data: {
        content: assistantContent,
        role: "assistant",
        sessionId,
      },
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to save assistant chat message");
  }
}

/** The last assistant row when it is still marked incomplete. */
export async function findIncompleteAssistantMessage(
  ctx: DomainContext,
  sessionId: string,
): Promise<{ content: unknown; id: string } | undefined> {
  const db = domainDb(ctx);

  const row = await db.chatMessage.findFirst({
    orderBy: { createdAt: "desc" },
    select: { content: true, id: true },
    where: { role: "assistant", sessionId },
  });

  if (!row) {
    return undefined;
  }

  const parsed = chatMessageContentSchema.safeParse(row.content);

  return parsed.success && parsed.data.status === "incomplete" ? row : undefined;
}

export async function setChatSessionTitleIfEmpty(
  ctx: DomainContext,
  sessionId: string,
  title: string,
): Promise<void> {
  const { user } = ctx;
  const db = domainDb(ctx);

  if (!title) {
    return;
  }

  const session = await db.chatSession.findFirst({
    select: { title: true },
    where: { id: sessionId, userId: user.id },
  });

  if (session?.title) {
    return;
  }

  try {
    await db.chatSession.updateMany({
      data: { title },
      where: { id: sessionId, title: null, userId: user.id },
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to set chat session title");
  }
}

export function toChatMessageDto(row: {
  id: string;
  sessionId: string;
  role: string;
  content: unknown;
  createdAt: Date;
}): ChatMessage {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    role: row.role,
    sessionId: row.sessionId,
  };
}
