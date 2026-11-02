"use client";

import { Anchor, type AnchorProps, VisuallyHidden } from "@mantine/core";
import { IconExternalLink, IconWorld } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { faviconUrlForHost, linkHostname } from "./faviconUrl.js";

/** Default screen-reader hint for a link that opens in a new tab. */
export const DEFAULT_NEW_TAB_LABEL = "opens in new tab";

const FAVICON_SIZE = 16;

export type ExternalLinkProps = Omit<AnchorProps, "children" | "href" | "rel" | "target"> & {
  children: ReactNode;
  /** Override the DuckDuckGo favicon for the host. */
  faviconSrc?: string;
  href: string;
  /** Screen-reader hint after the label. Defaults to {@link DEFAULT_NEW_TAB_LABEL}. */
  newTabLabel?: string;
  /** @default true */
  showExternalIcon?: boolean;
  /** @default true */
  showFavicon?: boolean;
};

const failedFaviconHosts = new Set<string>();

function LinkFavicon({ host, src }: { host: string; src: string }) {
  const [failed, setFailed] = useState(() => failedFaviconHosts.has(host));

  if (failed) {
    return <IconWorld aria-hidden size={FAVICON_SIZE} style={{ flexShrink: 0 }} />;
  }

  return (
    // biome-ignore lint/performance/noImgElement: 16px third-party favicon; not routed through the image optimizer.
    <img
      alt=""
      aria-hidden
      decoding="async"
      height={FAVICON_SIZE}
      loading="lazy"
      onError={() => {
        failedFaviconHosts.add(host);
        setFailed(true);
      }}
      src={src}
      style={{ borderRadius: 2, flexShrink: 0 }}
      width={FAVICON_SIZE}
    />
  );
}

/**
 * Renders an `http(s)` link with the host favicon, an external-link marker, and a
 * screen-reader new-tab hint. A non-web href (`mailto:`, `tel:`, a path) falls back
 * to a plain anchor without the new-tab behavior.
 *
 * @param props Anchor props with a required href and children.
 * @returns A Mantine Anchor that opens the target in a new tab.
 */
export function ExternalLink({
  children,
  faviconSrc,
  href,
  newTabLabel = DEFAULT_NEW_TAB_LABEL,
  showExternalIcon = true,
  showFavicon = true,
  underline = "hover",
  ...anchorProps
}: ExternalLinkProps) {
  const host = linkHostname(href);

  if (!host) {
    return (
      <Anchor href={href} underline={underline} {...anchorProps}>
        {children}
      </Anchor>
    );
  }

  return (
    <Anchor
      {...anchorProps}
      display="inline-flex"
      href={href}
      rel="noopener noreferrer"
      style={{ alignItems: "center", flexWrap: "nowrap", gap: 6, ...anchorProps.style }}
      target="_blank"
      underline={underline}
    >
      {showFavicon ? <LinkFavicon host={host} src={faviconSrc ?? faviconUrlForHost(host)} /> : null}
      <span>{children}</span>
      {showExternalIcon ? (
        <>
          <IconExternalLink aria-hidden size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
          <VisuallyHidden>{` ${newTabLabel}`}</VisuallyHidden>
        </>
      ) : null}
    </Anchor>
  );
}
