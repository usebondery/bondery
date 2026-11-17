"use client";

import { ActionIconLink, hrefAssert } from "@bondery/mantine-next";
import { Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAsterisk,
  IconBrandOpenai,
  IconFeather,
  IconPaw,
  IconPlugConnected,
} from "@tabler/icons-react";
import type { ReactElement } from "react";

type ClientLink = {
  label: string;
  /** Mantine colour name for the light-variant button, as in the webapp's social buttons. */
  color: string;
  icon: ReactElement;
  href: string;
  external?: boolean;
};

/*
 * Claude goes to its connector settings. Everything else goes to the MCP docs: MCP
 * itself, and the "Other assistants" section for the clients that are not Claude.
 *
 * Tabler has a brand icon only for OpenAI. The others use the closest Tabler glyph:
 * an asterisk for Claude's spark, a feather for Hermes (the messenger), a paw for OpenClaw.
 */
const CLIENT_LINKS: readonly ClientLink[] = [
  {
    color: "orange",
    external: true,
    href: "https://claude.ai/customize/connectors",
    icon: <IconAsterisk />,
    label: "Claude",
  },
  {
    color: "teal",
    href: "/docs/apps/mcp#other-clients",
    icon: <IconBrandOpenai />,
    label: "ChatGPT",
  },
  { color: "violet", href: "/docs/apps/mcp", icon: <IconPlugConnected />, label: "MCP" },
  {
    color: "yellow",
    href: "/docs/apps/mcp#other-clients",
    icon: <IconFeather />,
    label: "Hermes",
  },
  { color: "red", href: "/docs/apps/mcp#other-clients", icon: <IconPaw />, label: "OpenClaw" },
];

/**
 * The AI clients that work with Bondery, as icon-only links: Mantine light-variant
 * `ActionIcon`s with Tabler icons, like the social buttons in the webapp contacts table.
 * Each is named by an aria-label and a tooltip (hover and keyboard focus). A slim column
 * beside the chat on desktop, a wrapping row beneath it on phones.
 */
export function AiClientLinks() {
  // The column sits beside the chat from Tailwind `lg` (64rem), so the tooltip goes left there and above on phones.
  const isColumn = useMediaQuery("(min-width: 64rem)");

  return (
    <nav aria-label="Works with" className="w-full lg:w-auto lg:shrink-0">
      <ul
        className="m-0 flex list-none flex-row flex-wrap justify-center gap-3 p-0 lg:flex-col"
        style={{ listStyle: "none" }}
      >
        {CLIENT_LINKS.map(({ label, color, icon, href, external }) => (
          <li key={label}>
            <Tooltip
              events={{ focus: true, hover: true, touch: false }}
              label={label}
              position={isColumn ? "left" : "top"}
              withArrow
            >
              <span className="inline-flex">
                <ActionIconLink
                  ariaLabel={label}
                  color={color}
                  href={hrefAssert(href)}
                  icon={icon}
                  radius="md"
                  size={44}
                  variant="light"
                  {...(external ? { rel: "noopener noreferrer", target: "_blank" as const } : {})}
                />
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </nav>
  );
}
