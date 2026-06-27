import { EMOJI_CATEGORIES } from "./emojiData";
import type { EmojiData } from "./emojiData";

/**
 * Filters emoji categories by keyword substring match.
 * Empty query returns all categories; categories with no matches are omitted.
 */
export function filterEmojiCategories(query: string): [string, EmojiData[]][] {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return Object.entries(EMOJI_CATEGORIES);
  }

  const searchLower = trimmedQuery.toLowerCase();
  const filtered: [string, EmojiData[]][] = [];

  Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
    const matchedEmojis = emojis.filter((item) =>
      item.keywords.some((keyword) => keyword.includes(searchLower)),
    );

    if (matchedEmojis.length > 0) {
      filtered.push([category, matchedEmojis]);
    }
  });

  return filtered;
}
