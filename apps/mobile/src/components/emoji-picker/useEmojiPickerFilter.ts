import { filterEmojiCategories } from "@bondery/helpers/emoji";
import { useMemo } from "react";
import { DEBOUNCE_MS } from "../../lib/config";
import { useDebouncedValue } from "../../lib/hooks/useDebouncedValue";

export type EmojiPickerSection = {
  title: string;
  data: Array<{ emoji: string; keywords: string[] }>;
};

export function useEmojiPickerFilter(query: string): {
  sections: EmojiPickerSection[];
  debouncedQuery: string;
} {
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS.localFilter);

  const sections = useMemo(
    () =>
      filterEmojiCategories(debouncedQuery).map(([title, data]) => ({
        data,
        title,
      })),
    [debouncedQuery],
  );

  return { debouncedQuery, sections };
}
