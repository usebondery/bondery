import type { CSSProperties, ReactElement } from "react";
import {
  BRAND_ICON_BACKGROUND,
  BRAND_ICON_SRC,
  type BrandIconName,
} from "../brandIcons.generated.js";

export type { BrandIconName };

export interface BrandIconProps {
  /** Paint the glyph this colour. Defaults to white, which reads on every brand colour. */
  glyphColor?: string;
  /** Product whose mark to draw. */
  name: BrandIconName;
  /** Corner radius of the tile. Defaults to 28% of `size`, which reads as a squircle. */
  radius?: number;
  /** Tile edge length in CSS px. The glyph is inset to 60% of this. */
  size?: number;
  style?: CSSProperties;
}

/**
 * A brand logo on its own brand-coloured tile.
 *
 * The glyph is painted as a CSS mask, so it takes `glyphColor` and stays a vector at any size.
 * Use it anywhere a real product needs to be recognisable: integration tiles, import sources,
 * connected accounts.
 */
export function BrandIcon({
  name,
  size = 32,
  radius,
  glyphColor = "#fff",
  style,
}: BrandIconProps): ReactElement {
  const glyphSize = Math.round(size * 0.6);

  return (
    <span
      aria-hidden="true"
      style={{
        alignItems: "center",
        background: BRAND_ICON_BACKGROUND[name],
        borderRadius: radius ?? Math.round(size * 0.28),
        display: "inline-flex",
        flexShrink: 0,
        height: size,
        justifyContent: "center",
        width: size,
        ...style,
      }}
    >
      <span
        style={{
          backgroundColor: glyphColor,
          display: "block",
          height: glyphSize,
          maskImage: `url("${BRAND_ICON_SRC[name]}")`,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: `url("${BRAND_ICON_SRC[name]}")`,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          width: glyphSize,
        }}
      />
    </span>
  );
}
