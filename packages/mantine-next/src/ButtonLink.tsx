"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonLinkProps = Omit<ButtonProps, "component" | "href" | "children"> & {
  href: string;
  children: ReactNode;
  target?: string;
  rel?: string;
};

/**
 * Renders a Mantine Button that uses Next.js Link for client-side navigation.
 *
 * @param props Button props with required href and children.
 * @returns A link-compatible Mantine Button component.
 */
export function ButtonLink({ href, children, target, rel, ...buttonProps }: ButtonLinkProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Button component={Link as any} href={href} target={target} rel={rel} {...buttonProps}>
      {children}
    </Button>
  );
}
