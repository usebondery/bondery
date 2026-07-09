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
      categoryKey: section.title,
      key: `header-${section.title}`,
      type: "header",
    });

    for (const gridRow of chunkEmojiRows(section.data)) {
      rows.push({
        items: gridRow.items,
        key: gridRow.id,
        type: "row",
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
