"use client";

import { Anchor, type AnchorProps } from "@mantine/core";
import type { ReactNode } from "react";
import { mantineLinkComponent } from "#nextjs/NextLink.js";

export type AnchorLinkProps = Omit<AnchorProps, "component" | "href" | "children"> & {
  href: string;
  children: ReactNode;
  target?: string;
  scroll?: boolean;
  onClick?: () => void;
};

/**
 * Renders a Mantine Anchor that uses Next.js Link for client-side navigation.
 *
 * @param props Anchor props with required href and children.
 * @returns A link-compatible Mantine Anchor component.
 */
export function AnchorLink({ href, children, scroll, ...anchorProps }: AnchorLinkProps) {
  return (
    <Anchor component={mantineLinkComponent} href={href} scroll={scroll} {...anchorProps}>
      {children}
    </Anchor>
  );
}
