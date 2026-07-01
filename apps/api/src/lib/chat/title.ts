/**
 * AI-powered chat session title generation.
 * Generates a concise title from the first user message in a session.
 */

import { generateText } from "ai";
import { getChatModel } from "./provider";

/**
 * Generate a short title for a chat session based on the user's first message.
 *
 * @param userMessage - The text of the user's first message
 * @returns A short title string, or null if generation fails
 */
export async function generateSessionTitle(userMessage: string): Promise<string | null> {
  const { text } = await generateText({
    model: getChatModel(),
    system:
      "Generate a very short title (3-6 words) for a chat conversation based on the user's first message. " +
      "The title should capture the main topic. Do not use quotes or punctuation at the end. " +
      "Reply with only the title, nothing else.",
    prompt: userMessage,
    maxOutputTokens: 30,
  });

  const title = text.trim();
  return title || null;
}
