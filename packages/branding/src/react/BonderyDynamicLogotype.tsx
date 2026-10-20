import type { CSSProperties } from "react";
import { BonderyIcon } from "#react/BonderyIcon.js";
import { BonderyIconWhite } from "#react/BonderyIconWhite.js";
import { BonderyLogotypeBlack } from "#react/BonderyLogotypeBlack.js";
import { BonderyLogotypeWhite } from "#react/BonderyLogotypeWhite.js";
import {
  BRAND_FONT_FAMILY,
  BRAND_LOGOTYPE_FONT_WEIGHT,
  BRAND_LOGOTYPE_TEXT_GAP_RATIO,
  BRAND_LOGOTYPE_TEXT_SIZE_RATIO,
  BRAND_LOGOTYPE_VIEWBOX_HEIGHT,
  BRAND_LOGOTYPE_VIEWBOX_ICON_WIDTH,
  BRAND_LOGOTYPE_VIEWBOX_WIDTH,
  BRAND_WORDMARK,
} from "#typography.js";

export type BonderyDynamicLogotypeProps = {
  /** Optional class on the outer span. */
  className?: string;
  /** Icon height in pixels. Label font size scales with this. */
  height?: number;
  /** Label beside the icon (e.g. `"Bondery Docs"`). Omit for icon-only. */
  text?: string;
  /** Color scheme for icon and label. */
  theme: "light" | "dark";
};

const TEXT_COLORS = {
  dark: "#ffffff",
  light: "#000000",
} as const;

const clipContainerStyle: CSSProperties = {
  display: "inline-block",
  lineHeight: 0,
  overflow: "hidden",
};

/**
 * Bondery mark with an optional styled label (icon, or icon + one text string).
 * The default wordmark (`Bondery`) uses the static SVG logotype so it matches brand assets.
 * Custom labels (e.g. `Bondery Docs`) use icon + Lexend text.
 */
export function BonderyDynamicLogotype({
  text,
  theme,
  height = 20,
  className,
}: BonderyDynamicLogotypeProps) {
  const label = text?.trim();
  const isDefaultWordmark = label === BRAND_WORDMARK;
  const isIconOnly = !label;

  if (isIconOnly || isDefaultWordmark) {
    const Logotype = theme === "dark" ? BonderyLogotypeWhite : BonderyLogotypeBlack;
    const svgWidth = height * (BRAND_LOGOTYPE_VIEWBOX_WIDTH / BRAND_LOGOTYPE_VIEWBOX_HEIGHT);
    const visibleWidth = isIconOnly
      ? height * (BRAND_LOGOTYPE_VIEWBOX_ICON_WIDTH / BRAND_LOGOTYPE_VIEWBOX_HEIGHT)
      : svgWidth;

    return (
      <span className={className} style={{ ...clipContainerStyle, width: visibleWidth }}>
        <Logotype
          aria-hidden
          height={height}
          style={{ display: "block", maxWidth: "none" }}
          width={svgWidth}
        />
      </span>
    );
  }

  const iconSize = height;
  const fontSize = height * BRAND_LOGOTYPE_TEXT_SIZE_RATIO;
  const textGap = height * BRAND_LOGOTYPE_TEXT_GAP_RATIO;
  const color = TEXT_COLORS[theme];
  const Icon = theme === "dark" ? BonderyIconWhite : BonderyIcon;

  return (
    <span
      className={["inline-flex items-center", className].filter(Boolean).join(" ")}
      style={{ color }}
    >
      <Icon aria-hidden height={iconSize} width={iconSize} />
      <span
        className="leading-none"
        style={{
          fontFamily: BRAND_FONT_FAMILY,
          fontSize,
          fontWeight: BRAND_LOGOTYPE_FONT_WEIGHT,
          marginLeft: textGap,
        }}
      >
        {label}
      </span>
    </span>
  );
}
