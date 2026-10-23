import type { SelectLeftSection } from "./types";

export function isSelectLeftSectionConfig(value: unknown): value is SelectLeftSection {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  return type === "icon" || type === "emoji" || type === "emojiBadge";
}
