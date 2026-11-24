/** Radix of hex digits. */
const HEX_RADIX = 16;
/** Hex digits in a `rrggbb` color. */
const HEX_COLOR_DIGIT_COUNT = 6;
/** Hex digits that encode one color channel. */
const HEX_DIGITS_PER_CHANNEL = 2;

function readHexChannel(digits: string, channelIndex: number): number {
  const start = channelIndex * HEX_DIGITS_PER_CHANNEL;
  return Number.parseInt(digits.slice(start, start + HEX_DIGITS_PER_CHANNEL), HEX_RADIX);
}

/** Reads the red, green and blue channels (0-255) from `rrggbb` hex digits without the `#`. */
function parseHexChannels(digits: string): { blue: number; green: number; red: number } {
  return {
    blue: readHexChannel(digits, 2),
    green: readHexChannel(digits, 1),
    red: readHexChannel(digits, 0),
  };
}

/**
 * Applies an alpha channel to a `#rrggbb` hex color.
 */
function colorWithAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== HEX_COLOR_DIGIT_COUNT) {
    return hexColor;
  }

  const { red, green, blue } = parseHexChannels(normalized);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export { colorWithAlpha, HEX_RADIX, parseHexChannels };
