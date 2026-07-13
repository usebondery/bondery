import type { MantineColor } from "@mantine/core";

const AVATAR_COLOR_PALETTE: MantineColor[] = [
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
];

function normalizeNamePart(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function getHash(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

/**
 * Returns a deterministic Mantine avatar color based on person name.
 * The same input name always resolves to the same color.
 */
export function getAvatarColorFromName(
  firstName: string | null | undefined,
  lastName?: string | null,
): MantineColor {
  const normalizedFirstName = normalizeNamePart(firstName);
  const normalizedLastName = normalizeNamePart(lastName);
  const normalized = `${normalizedFirstName} ${normalizedLastName}`.trim();

  if (!normalized) {
    return "blue";
  }

  const colorIndex = getHash(normalized) % AVATAR_COLOR_PALETTE.length;
  return AVATAR_COLOR_PALETTE[colorIndex];
}
