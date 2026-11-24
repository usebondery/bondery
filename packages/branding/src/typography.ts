const LOGOTYPE_TEXT_OFFSET_X = 327.264;
const LOGOTYPE_TEXT_HEIGHT = 89.6;

/** Matches the website body font (next/font Lexend) and Mantine theme. */
export const BRAND_FONT_FAMILY = "Lexend, sans-serif";

/** Default product wordmark rendered from the static SVG logotype. */
export const BRAND_WORDMARK = "Bondery";

/** Weight of the “Bondery” wordmark in SVG logotypes and OG assets. */
export const BRAND_LOGOTYPE_FONT_WEIGHT = 600;

/** Metrics from `BonderyLogotypeBlack` viewBox (866×256): square icon + outlined wordmark. */
export const BRAND_LOGOTYPE_VIEWBOX_WIDTH = 866;
export const BRAND_LOGOTYPE_VIEWBOX_HEIGHT = 256;
export const BRAND_LOGOTYPE_VIEWBOX_ICON_WIDTH = 256;

/** Wordmark cap height relative to icon height (e.g. height 36 → ~12.6px). */
export const BRAND_LOGOTYPE_TEXT_SIZE_RATIO: number =
  LOGOTYPE_TEXT_HEIGHT / BRAND_LOGOTYPE_VIEWBOX_HEIGHT;

/** Horizontal gap between icon and wordmark relative to icon height (e.g. height 36 → ~10px). */
export const BRAND_LOGOTYPE_TEXT_GAP_RATIO: number =
  (LOGOTYPE_TEXT_OFFSET_X - BRAND_LOGOTYPE_VIEWBOX_ICON_WIDTH) / BRAND_LOGOTYPE_VIEWBOX_HEIGHT;
