"use client";

import { ActionIcon, type ActionIconProps } from "@mantine/core";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";

export type ActionIconLinkProps = Omit<ActionIconProps, "component" | "href" | "children"> & {
  href?: string;
  ariaLabel: string;
  children: ReactNode;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
};

/**
 * Renders a Mantine ActionIcon that behaves as a Next.js Link.
 *
 * @param props ActionIcon props with required href, aria label, and children.
 * @returns A link-compatible Mantine ActionIcon component.
 */
export function ActionIconLink({
  href,
  ariaLabel,
  children,
  target,
  rel,
  ...actionIconProps
}: ActionIconLinkProps) {
  if (!href) {
    return (
      <ActionIcon aria-label={ariaLabel} {...actionIconProps}>
        {children}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      component={Link as ElementType}
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      {...actionIconProps}
    >
      {children}
    </ActionIcon>
  );
}
