"use client";

import { Anchor, type AnchorProps } from "@mantine/core";
import NextLink from "next/link";
import type { ReactNode } from "react";

export type AnchorLinkProps = Omit<AnchorProps, "component" | "href" | "children"> & {
  href: string;
  children: ReactNode;
  target?: string;
  onClick?: () => void;
};

/**
 * Renders a Mantine Anchor that uses Next.js Link for client-side navigation.
 *
 * @param props Anchor props with required href and children.
 * @returns A link-compatible Mantine Anchor component.
 */
export function AnchorLink({ href, children, ...anchorProps }: AnchorLinkProps) {
  return (
    <Anchor component={NextLink} href={href} {...anchorProps}>
      {children}
    </Anchor>
  );
}
