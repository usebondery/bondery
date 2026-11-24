"use client";

import NextImage from "next/image.js";
import type { CSSProperties, ReactElement } from "react";
import { ActionIconLink, type ActionIconLinkProps } from "#nextjs/ActionIconLink/ActionIconLink.js";
import { hrefAssert } from "#nextjs/NextLink.js";

/**
 * How a brand mark is drawn on its tile.
 * - `mask`: a single-colour glyph. The SVG is used as a mask and filled with `color`, so one
 *   file serves any tile colour (white on an orange tile, black on a white tile).
 * - `image`: a full-colour mark drawn as-is.
 */
type BrandGlyph = { kind: "mask"; src: string; color: string } | { kind: "image"; src: string };

type BrandTileLinkProps = Omit<
  ActionIconLinkProps,
  "ariaLabel" | "children" | "href" | "icon" | "iconScale"
> & {
  /** Product name. Used as the aria label, so pair the tile with a tooltip. */
  label: string;
  href: string;
  /** Tile fill, taken from the brand. */
  background: string;
  glyph: BrandGlyph;
  /**
   * Glyph size as a fraction of the tile. Every tile uses this one value, so the marks stay
   * the same size across the row. @default 0.58
   */
  glyphScale?: number;
  /** Open the link in a new tab. @default false */
  external?: boolean;
  /** Tile edge in px. @default 56 */
  size?: number;
};

/**
 * Elevation for a tile. An outer drop shadow blooms around a light fill (white ChatGPT, orange
 * Claude) and reads as a bigger tile next to the dark ones, so the tile uses one inset ring plus
 * a shallow shadow that is the same weight on every fill.
 */
const TILE_SHADOW = [
  "inset 0 0 0 1px light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.18))",
  "0 1px 2px light-dark(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.5))",
].join(", ");

/** NodeNext resolves `next/image.js` as a module namespace; cast for JSX usage. */
const Image = NextImage as unknown as (props: {
  alt: string;
  fill: boolean;
  sizes: string;
  src: string;
  unoptimized: boolean;
}) => ReactElement;

function renderGlyph(glyph: BrandGlyph, size: number): ReactElement {
  if (glyph.kind === "image") {
    return <Image alt="" fill sizes={`${size}px`} src={glyph.src} unoptimized />;
  }

  const maskStyle: CSSProperties = {
    backgroundColor: glyph.color,
    maskImage: `url(${glyph.src})`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    WebkitMaskImage: `url(${glyph.src})`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
  };

  return <span style={maskStyle} />;
}

/**
 * An app-icon style link for a third-party product: a rounded square in the brand's colour with
 * its real logo, and a soft shadow. It stays put on hover. Built on `ActionIconLink`, so it keeps
 * the typed `href`, the aria label and keyboard focus. Pair it with a `Tooltip` for the name.
 */
function BrandTileLink({
  background,
  external = false,
  glyph,
  glyphScale = 0.58,
  href,
  label,
  size = 56,
  ...actionIconProps
}: BrandTileLinkProps): ReactElement {
  return (
    <ActionIconLink
      ariaLabel={label}
      href={hrefAssert(href)}
      icon={renderGlyph(glyph, size)}
      iconScale={glyphScale}
      radius={size * 0.25}
      size={size}
      style={{ background, boxShadow: TILE_SHADOW }}
      variant="transparent"
      {...actionIconProps}
      {...(external ? { rel: "noopener noreferrer", target: "_blank" as const } : {})}
    />
  );
}

export type { BrandGlyph, BrandTileLinkProps };
export { BrandTileLink };
