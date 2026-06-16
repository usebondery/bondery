/** Average adult reading speed in words per minute. */
const WORDS_PER_MINUTE = 238;

/**
 * Estimates reading time for a given text string.
 * Strips common Markdown/MDX syntax before counting words so only prose
 * contributes to the estimate.
 *
 * @param text - The raw text content (may include Markdown/MDX syntax).
 * @returns An object with `minutes` (minimum 1) and `words` (word count after cleanup).
 */
export function getReadingTime(text: string): { minutes: number; words: number } {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { minutes: 1, words: 0 };
  }

  const cleaned = text
    // Remove fenced code blocks (``` ... ```)
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`[^`]*`/g, "")
    // Remove images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Convert links [text](url) → keep text only
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove HTML / JSX tags
    .replace(/<[^>]*>/g, "")
    // Remove single-line import / export statements
    .replace(/^(import|export)\b.*$/gm, "")
    // Remove multi-line MDX export blocks: export const foo = { ... };
    .replace(/export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]*?\};?/g, "")
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove emphasis / bold / strikethrough markers
    .replace(/[*_~]{1,3}/g, "")
    // Remove blockquote markers
    .replace(/^>\s?/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove unordered list markers
    .replace(/^[-*+]\s/gm, "")
    // Remove ordered list markers
    .replace(/^\d+\.\s/gm, "");

  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return { minutes, words: wordCount };
}
