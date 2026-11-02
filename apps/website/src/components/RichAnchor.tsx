"use client";

import { AnchorLink, ExternalLink } from "@bondery/mantine-next";
import { Anchor, type AnchorProps } from "@mantine/core";
import type { ReactNode } from "react";
import { routeAssert } from "@/lib/navigation/route/assert";
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

export function RichAnchor({
  href,
  children,
  external: externalOverride,
  showFavicon,
  showExternalIcon,
  faviconSrc,
  underline = "hover",
  ...anchorProps
}: RichAnchorProps) {
  const kind = resolveLinkKind(href);
  const isExternal = externalOverride ?? kind === "external";

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
      <AnchorLink href={routeAssert(toInternalPath(href))} underline={underline} {...anchorProps}>
        {children}
      </AnchorLink>
    );
  }

  return (
    <ExternalLink
      faviconSrc={faviconSrc}
      href={href}
      showExternalIcon={showExternalIcon}
      showFavicon={showFavicon}
      underline={underline}
      {...anchorProps}
    >
      {children}
    </ExternalLink>
  );
}
