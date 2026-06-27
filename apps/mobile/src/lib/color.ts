/**
 * Applies an alpha channel to a `#rrggbb` hex color.
 */
export function colorWithAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
