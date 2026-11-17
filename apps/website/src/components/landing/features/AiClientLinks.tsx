"use client";

import { Tooltip } from "@mantine/core";
import { BrandTileLink, type BrandTileLinkProps } from "./BrandTileLink";

type ClientLink = Omit<BrandTileLinkProps, "size">;

/*
 * Claude goes to its connector settings. Everything else goes to the MCP docs: MCP
 * itself, and the "Other assistants" section for the clients that are not Claude.
 *
 * Each tile uses the product's real logo on its brand colour (marks from Dashboard Icons and
 * Simple Icons, see `brand-icons.ts`). Glyphs are masks, so one SVG serves any tile colour.
 */
const CLIENT_LINKS: readonly ClientLink[] = [
  {
    background: "#D97757",
    external: true,
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/claude-ai.svg" },
    glyphScale: 0.62,
    href: "https://claude.ai/customize/connectors",
    label: "Claude",
  },
  {
    background: "#FFFFFF",
    glyph: { color: "#000000", kind: "mask", src: "/images/brands/openai.svg" },
    href: "/docs/apps/mcp#other-clients",
    label: "ChatGPT",
  },
  {
    background: "#16181D",
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/mcp.svg" },
    href: "/docs/apps/mcp",
    label: "MCP",
  },
  {
    background: "#16181D",
    glyph: { color: "#FFFFFF", kind: "mask", src: "/images/brands/hermes.svg" },
    href: "/docs/apps/mcp#other-clients",
    label: "Hermes",
  },
  {
    background: "#16181D",
    glyph: { kind: "image", src: "/images/brands/openclaw.svg" },
    glyphScale: 0.7,
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
    <nav aria-label="Works with" className="w-full">
      <ul
        className="m-0 flex list-none flex-row flex-wrap justify-center gap-3 p-0"
        style={{ listStyle: "none" }}
      >
        {CLIENT_LINKS.map((client) => (
          <li key={client.label}>
            <Tooltip
              events={{ focus: true, hover: true, touch: false }}
              label={client.label}
              position="top"
              withArrow
            >
              <span className="inline-flex">
                <BrandTileLink {...client} />
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </nav>
  );
}
