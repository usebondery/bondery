"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "#nextjs/NextLink.js";
import type { ReactNode } from "react";

export type ButtonLinkProps = Omit<
  ButtonProps,
  "component" | "href" | "children"
> & {
  href: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  scroll?: boolean;
  className?: string;
};

/**
 * Renders a Mantine Button that uses Next.js Link for client-side navigation.
 *
 * @param props Button props with required href and children.
 * @returns A link-compatible Mantine Button component.
 */
export function ButtonLink({
  href,
  children,
  target,
  rel,
  scroll,
  className,
  ...buttonProps
}: ButtonLinkProps) {
  return (
    <Button
      component={Link as any}
      href={href}
      target={target}
      rel={rel}
      scroll={scroll}
      className={className}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
