"use client";

import { ActionIconLink, hrefAssert } from "@bondery/mantine-next";
import NextImage from "next/image";
import type { CSSProperties, ReactElement } from "react";

/**
 * How a brand mark is drawn on its tile.
 *
 * - `mask`: a single-colour glyph. The SVG is used as a mask and filled with `color`, so one
 *   file serves any tile colour (white on Claude orange, black on ChatGPT white).
 * - `image`: a full-colour mark drawn as-is.
 */
export type BrandGlyph =
  | { kind: "mask"; src: string; color: string }
  | { kind: "image"; src: string };

export type BrandTileLinkProps = {
  label: string;
  href: string;
  /** Tile fill, taken from the brand. */
  background: string;
  glyph: BrandGlyph;
  /** Glyph size as a fraction of the tile. @default 0.58 */
  glyphScale?: number;
  external?: boolean;
  /** Tile edge in px. @default 56 */
  size?: number;
};

const TILE_SHADOW = [
  "inset 0 0 0 1px light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.16))",
  "0 1px 2px rgba(0, 0, 0, 0.12)",
  "0 8px 16px -8px rgba(0, 0, 0, 0.28)",
].join(", ");

function renderGlyph(glyph: BrandGlyph): ReactElement {
  if (glyph.kind === "image") {
    return <NextImage alt="" fill sizes="56px" src={glyph.src} unoptimized />;
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
export function BrandTileLink({
  label,
  href,
  background,
  glyph,
  glyphScale = 0.58,
  external = false,
  size = 56,
}: BrandTileLinkProps) {
  return (
    <ActionIconLink
      ariaLabel={label}
      href={hrefAssert(href)}
      icon={renderGlyph(glyph)}
      iconScale={glyphScale}
      radius={size * 0.25}
      size={size}
      style={{ background, boxShadow: TILE_SHADOW }}
      variant="transparent"
      {...(external ? { rel: "noopener noreferrer", target: "_blank" as const } : {})}
    />
  );
}
