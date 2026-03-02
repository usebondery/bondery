"use client";

import { ActionIcon, Center, type ActionIconProps } from "@mantine/core";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

export type ActionIconLinkProps = Omit<ActionIconProps, "component" | "href" | "children"> & {
  href?: string;
  ariaLabel: string;
  icon: ReactNode;
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
  icon,
  target,
  rel,
  ...actionIconProps
}: ActionIconLinkProps) {
  const iconStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
  };

  const normalizedIcon = isValidElement(icon)
    ? cloneElement(icon as ReactElement<{ style?: CSSProperties }>, {
        style: {
          ...(icon.props as { style?: CSSProperties }).style,
          ...iconStyle,
        },
      })
    : icon;

  const renderedIcon = (
    <Center style={{ width: "100%", height: "100%" }}>
      <span
        style={{
          width: "60%",
          height: "60%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {normalizedIcon}
      </span>
    </Center>
  );

  if (!href) {
    return (
      <ActionIcon aria-label={ariaLabel} {...actionIconProps}>
        {renderedIcon}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={Link as any}
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      {...actionIconProps}
    >
      {renderedIcon}
    </ActionIcon>
  );
}
