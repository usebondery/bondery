import type { ContactsFlatRow } from "./contactsFlatList";
import { CONTACTS_LIST_ROW_HEIGHT, CONTACTS_SECTION_HEADER_HEIGHT } from "./contactsFlatList";

export type FlatRowLayoutEntry = {
  index: number;
  offsetY: number;
  height: number;
  row: ContactsFlatRow;
};

export function isSelectableFlatRow(
  row: ContactsFlatRow,
  myselfContactId: string | undefined,
): boolean {
  if (row.type !== "contact") {
    return false;
  }

  return row.contact.id !== myselfContactId;
}

export function buildFlatRowOffsetIndex(flatRows: ContactsFlatRow[]): FlatRowLayoutEntry[] {
  let offsetY = 0;

  return flatRows.map((row, index) => {
    const height =
      row.type === "section-header" ? CONTACTS_SECTION_HEADER_HEIGHT : CONTACTS_LIST_ROW_HEIGHT;
    const entry: FlatRowLayoutEntry = { height, index, offsetY, row };
    offsetY += height;
    return entry;
  });
}

export function resolveFlatIndexAtContentY(
  rowContentY: number,
  layoutIndex: FlatRowLayoutEntry[],
): number | null {
  for (const entry of layoutIndex) {
    if (rowContentY >= entry.offsetY && rowContentY < entry.offsetY + entry.height) {
      return entry.index;
    }
  }

  return null;
}

export function resolveContactAnchorIndexAtContentY(
  rowContentY: number,
  layoutIndex: FlatRowLayoutEntry[],
  myselfContactId: string | undefined,
): number | null {
  const flatIndex = resolveFlatIndexAtContentY(rowContentY, layoutIndex);

  if (flatIndex === null) {
    return null;
  }

  const entry = layoutIndex[flatIndex];

  if (!entry || !isSelectableFlatRow(entry.row, myselfContactId)) {
    return null;
  }

  return flatIndex;
}

export function collectSelectableContactIdsInRange(
  layoutIndex: FlatRowLayoutEntry[],
  startIndex: number,
  endIndex: number,
  myselfContactId: string | undefined,
): string[] {
  const min = Math.min(startIndex, endIndex);
  const max = Math.max(startIndex, endIndex);
  const contactIds: string[] = [];

  for (let index = min; index <= max; index += 1) {
    const entry = layoutIndex[index];

    if (!entry || !isSelectableFlatRow(entry.row, myselfContactId)) {
      continue;
    }

    contactIds.push(entry.row.contact.id);
  }

  return contactIds;
}
