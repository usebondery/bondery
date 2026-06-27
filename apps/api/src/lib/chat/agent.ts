import { streamText, stepCountIs, type ModelMessage } from "ai";
import type { ServerResponse } from "http";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import { getChatModel } from "./provider.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import { createContactTools } from "./tools/contacts.js";
import { createInteractionTools } from "./tools/interactions.js";
import { createGroupTools } from "./tools/groups.js";
import { createTagTools } from "./tools/tags.js";
import { createSharingTools } from "./tools/sharing.js";

/**
 * Runs the AI chat agent with the given messages and Supabase client.
 * Returns a streaming text response using the Vercel AI SDK.
 *
 * @param messages - The conversation history converted to model messages.
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID, used to build avatar URLs.
 * @param userEmail - The authenticated user's email address, used as sender for sharing.
 * @returns A streamText result that can be piped to any HTTP response.
 */
export function runChatAgent(
  messages: ModelMessage[],
  supabase: SupabaseClient<Database>,
  userId: string,
  userEmail: string,
): {
  pipeUIMessageStreamToResponse: (response: ServerResponse) => void;
  text: PromiseLike<string>;
} {
  const contactTools = createContactTools(supabase, userId);
  const interactionTools = createInteractionTools(supabase, userId);
  const groupTools = createGroupTools(supabase, userId);
  const tagTools = createTagTools(supabase, userId);
  const sharingTools = createSharingTools(supabase, userId, userEmail);

  const today = new Date().toISOString().split("T")[0];

  return streamText({
    model: getChatModel(),
    system: `${SYSTEM_PROMPT}\n\nToday's date: ${today}`,
    messages,
    tools: {
      ...contactTools,
      ...interactionTools,
      ...groupTools,
      ...tagTools,
      ...sharingTools,
    },
    stopWhen: stepCountIs(5),
  });
}
