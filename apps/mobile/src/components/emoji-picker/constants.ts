import { MOBILE_HIT_SLOP, MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";

/** Grid column count — matches web `SimpleGrid cols={7}`. */
export const EMOJI_PICKER_GRID_COLUMNS = 7;

export const EMOJI_PICKER_LAYOUT = {
  cellBorderWidth: 2,
  cellHitSlop: MOBILE_HIT_SLOP.compact,
  /** Matches web `EditGroupModal` emoji picker width. */
  compactTriggerWidth: 80,
  gridColumns: EMOJI_PICKER_GRID_COLUMNS,
  /** Slightly larger than trigger text for legibility in the grid. */
  gridEmojiFontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
  gridGap: 4,
  gridHorizontalPadding: MOBILE_LAYOUT.spacing.horizontal,
  /** Same as `MobileTextInput` default size. */
  triggerEmojiFontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
} as const;

export type EmojiGridRow = {
  id: string;
  items: Array<{ emoji: string; keywords: string[] }>;
};

export function chunkEmojiRows<T extends { emoji: string }>(
  items: T[],
  columns: number = EMOJI_PICKER_GRID_COLUMNS,
): EmojiGridRow[] {
  const rows: EmojiGridRow[] = [];

  for (let index = 0; index < items.length; index += columns) {
    rows.push({
      id: `row-${items[index]?.emoji ?? index}`,
      items: items.slice(index, index + columns),
    });
  }

  return rows;
}

export function getEmojiPickerCellSize(
  containerWidth: number,
  columns: number = EMOJI_PICKER_LAYOUT.gridColumns,
): number {
  const { gridGap, gridHorizontalPadding } = EMOJI_PICKER_LAYOUT;
  const availableWidth = containerWidth - gridHorizontalPadding * 2 - gridGap * (columns - 1);

  return Math.floor(availableWidth / columns);
}
