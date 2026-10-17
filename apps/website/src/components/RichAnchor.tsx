"use client";

import { AnchorLink } from "@bondery/mantine-next";
import { Anchor, type AnchorProps, VisuallyHidden } from "@mantine/core";
import { IconExternalLink, IconWorld } from "@tabler/icons-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { getFaviconUrl } from "@/lib/favicon-url";
import { resolveLinkKind, toInternalPath } from "@/lib/resolve-link-kind";

export type RichAnchorProps = Omit<AnchorProps, "children" | "href"> & {
  href: string;
  children: ReactNode;
  /** Override auto-detection from {@link resolveLinkKind}. */
  external?: boolean;
  /** Default: true for external http(s) links. */
  showFavicon?: boolean;
  /** Default: true for external links. */
  showExternalIcon?: boolean;
  /** Override DuckDuckGo favicon URL. */
  faviconSrc?: string;
};

const failedFaviconHosts = new Set<string>();

function LinkFavicon({ host, src }: { host: string; src: string }) {
  const [failed, setFailed] = useState(() => failedFaviconHosts.has(host));

  if (failed) {
    return <IconWorld aria-hidden size={16} style={{ flexShrink: 0 }} />;
  }

  return (
    <Image
      alt=""
      aria-hidden
      height={16}
      onError={() => {
        failedFaviconHosts.add(host);
        setFailed(true);
      }}
      src={src}
      style={{ borderRadius: 2, flexShrink: 0 }}
      unoptimized
      width={16}
    />
  );
}

export function RichAnchor({
  href,
  children,
  external: externalOverride,
  showFavicon: showFaviconProp,
  showExternalIcon: showExternalIconProp,
  faviconSrc,
  underline = "hover",
  ...anchorProps
}: RichAnchorProps) {
  const kind = resolveLinkKind(href);
  const isExternal = externalOverride ?? kind === "external";
  const showFavicon = showFaviconProp ?? isExternal;
  const showExternalIcon = showExternalIconProp ?? isExternal;

  let host: string | null = null;
  try {
    host = new URL(href, "https://usebondery.com").hostname;
  } catch {
    host = null;
  }

  const faviconUrl = faviconSrc ?? (host ? getFaviconUrl(host) : null);

  if (kind === "special" && !href.trim()) {
    return <span>{children}</span>;
  }

  if (kind === "special") {
    return (
      <Anchor href={href} underline={underline} {...anchorProps}>
        {children}
      </Anchor>
    );
  }

  if (!isExternal) {
    return (
      <AnchorLink href={toInternalPath(href)} underline={underline} {...anchorProps}>
        {children}
      </AnchorLink>
    );
  }

  return (
    <Anchor
      {...anchorProps}
      display="inline-flex"
      href={href}
      rel="noopener noreferrer"
      style={{ alignItems: "center", flexWrap: "nowrap", gap: 6 }}
      target="_blank"
      underline={underline}
    >
      {showFavicon && faviconUrl && host ? <LinkFavicon host={host} src={faviconUrl} /> : null}
      <span>{children}</span>
      {showExternalIcon ? (
        <>
          <IconExternalLink aria-hidden size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
          <VisuallyHidden> (opens in new tab)</VisuallyHidden>
        </>
      ) : null}
    </Anchor>
  );
}
