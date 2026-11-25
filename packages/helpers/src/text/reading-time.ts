/** Average adult reading speed in words per minute. */
const PATTERN_5C732B_RE = /\s+/u;

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
    .replace(/```[\s\S]*?```/gu, "")
    // Remove inline code
    .replace(/`[^`]*`/gu, "")
    // Remove images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
    // Convert links [text](url) → keep text only
    .replace(/\[(?<group1>[^\]]*)\]\([^)]*\)/gu, "$1")
    // Remove HTML / JSX tags
    .replace(/<[^>]*>/gu, "")
    // Remove single-line import / export statements
    .replace(/^(?<group1>import|export)\b.*$/gmu, "")
    // Remove multi-line MDX export blocks: export const foo = { ... };
    .replace(/export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]*?\};?/gu, "")
    // Remove heading markers
    .replace(/^#{1,6}\s+/gmu, "")
    // Remove emphasis / bold / strikethrough markers
    .replace(/[*_~]{1,3}/gu, "")
    // Remove blockquote markers
    .replace(/^>\s?/gmu, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gmu, "")
    // Remove unordered list markers
    .replace(/^[-*+]\s/gmu, "")
    // Remove ordered list markers
    .replace(/^\d+\.\s/gmu, "");

  const words = cleaned.split(PATTERN_5C732B_RE).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return { minutes, words: wordCount };
}
