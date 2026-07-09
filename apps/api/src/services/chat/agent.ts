import type { ServerResponse } from "node:http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import { getChatModel } from "./provider.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import { createContactTools } from "./tools/contacts.js";
import { createGroupTools } from "./tools/groups.js";
import { createInteractionTools } from "./tools/interactions.js";
import { createSharingTools } from "./tools/sharing.js";
import { createTagTools } from "./tools/tags.js";

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
    messages,
    model: getChatModel(),
    stopWhen: stepCountIs(5),
    system: `${SYSTEM_PROMPT}\n\nToday's date: ${today}`,
    tools: {
      ...contactTools,
      ...interactionTools,
      ...groupTools,
      ...tagTools,
      ...sharingTools,
    },
  });
}
