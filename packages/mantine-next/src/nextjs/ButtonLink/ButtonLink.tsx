"use client";

import { Button, type ButtonProps } from "@mantine/core";
import type { ReactNode } from "react";
import Link from "#nextjs/NextLink.js";

export type ButtonLinkProps = Omit<ButtonProps, "component" | "href" | "children"> & {
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
      className={className}
      renderRoot={(props) => (
        <Link href={href} rel={rel} scroll={scroll} target={target} {...props} />
      )}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
