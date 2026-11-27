"use client";

import { ANTHROPIC_BRAND_COLOR, CHATGPT_TILE_COLOR, DARK_TILE_COLOR } from "@bondery/branding";
import { CLAUDE_DIRECTORY_URL } from "@bondery/helpers";
import { BrandTileLink, type BrandTileLinkProps } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Tooltip } from "@mantine/core";

/**
 * One size for every tile and one glyph scale for every mark. Both live here, so a client can
 * never end up a different size than its neighbours in the row.
 */
const TILE_SIZE = 56;
const TILE_GLYPH_SCALE = 0.58;

type ClientLink = Omit<BrandTileLinkProps, "glyphScale" | "size">;

/*
 * Claude goes to its connector directory page. Everything else goes to the MCP docs: MCP
 * itself, and the "Other assistants" section for the clients that are not Claude.
 *
 * Each tile uses the product's real logo on its brand colour (marks from Dashboard Icons and
 * Simple Icons, see `brand-icons.ts`). Glyphs are masks, so one SVG serves any tile colour.
 * The fill colours come from `@bondery/branding`, not from literals here.
 */
const CLIENT_LINKS: readonly ClientLink[] = [
  {
    background: ANTHROPIC_BRAND_COLOR,
    external: true,
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/claude-ai.svg" },
    href: CLAUDE_DIRECTORY_URL,
    label: "Claude",
  },
  {
    background: CHATGPT_TILE_COLOR,
    glyph: { color: "#000000", kind: "mask", src: "/images/brands/openai.svg" },
    href: "/docs/apps/mcp#other-clients",
    label: "ChatGPT",
  },
  {
    background: DARK_TILE_COLOR,
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/mcp.svg" },
    href: "/docs/apps/mcp",
    label: "MCP",
  },
  {
    background: DARK_TILE_COLOR,
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/hermes.svg" },
    href: "/docs/apps/mcp#other-clients",
    label: "Hermes",
  },
  {
    background: DARK_TILE_COLOR,
    glyph: { kind: "image", src: "/images/brands/openclaw.svg" },
    href: "/docs/apps/mcp#other-clients",
    label: "OpenClaw",
  },
];

/**
 * The AI clients that work with Bondery, as app-icon tiles in the product's own colours, in one
 * horizontal row under the chat. Each is named by an aria-label and a tooltip (hover and
 * keyboard focus).
 */
export function AiClientLinks() {
  return (
    <nav aria-label={landing.AiClients.WorksWith} className="w-full">
      <ul
        className="m-0 flex list-none flex-row flex-wrap justify-center gap-3 p-0"
        style={{ listStyle: "none" }}
      >
        {CLIENT_LINKS.map((client) => (
          <li className="flex" key={client.label}>
            <Tooltip
              events={{ focus: true, hover: true, touch: false }}
              label={client.label}
              position="top"
              withArrow
            >
              <span className="inline-flex">
                <BrandTileLink glyphScale={TILE_GLYPH_SCALE} size={TILE_SIZE} {...client} />
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </nav>
  );
}
