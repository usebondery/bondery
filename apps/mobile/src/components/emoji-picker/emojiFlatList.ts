import { chunkEmojiRows, type EmojiGridRow } from "./constants";
import type { EmojiPickerSection } from "./useEmojiPickerFilter";

export type EmojiFlatRow =
  | {
      type: "header";
      key: string;
      categoryKey: string;
    }
  | {
      type: "row";
      key: string;
      items: EmojiGridRow["items"];
    };

export function buildEmojiFlatRows(sections: EmojiPickerSection[]): EmojiFlatRow[] {
  const rows: EmojiFlatRow[] = [];

  for (const section of sections) {
    rows.push({
      type: "header",
      key: `header-${section.title}`,
      categoryKey: section.title,
    });

    for (const gridRow of chunkEmojiRows(section.data)) {
      rows.push({
        type: "row",
        key: gridRow.id,
        items: gridRow.items,
      });
    }
  }

  return rows;
}

export function findEmojiFlatIndex(flatRows: EmojiFlatRow[], emoji: string): number | null {
  for (let index = 0; index < flatRows.length; index += 1) {
    const row = flatRows[index];
    if (row?.type === "row" && row.items.some((item) => item.emoji === emoji)) {
      return index;
    }
  }

  return null;
}
