"use client";

import { ActionIcon, type ActionIconProps, Center } from "@mantine/core";
import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "#nextjs/NextLink.js";

export type ActionIconLinkProps = Omit<ActionIconProps, "component" | "href" | "children"> & {
  href?: string;
  ariaLabel: string;
  icon: ReactNode;
  onClick?: () => void;
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
  onClick,
  target,
  rel,
  ...actionIconProps
}: ActionIconLinkProps) {
  const iconStyle: CSSProperties = {
    display: "block",
    height: "100%",
    width: "100%",
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
    <Center style={{ height: "100%", width: "100%" }}>
      <span
        style={{
          alignItems: "center",
          display: "inline-flex",
          height: "60%",
          justifyContent: "center",
          width: "60%",
        }}
      >
        {normalizedIcon}
      </span>
    </Center>
  );

  if (!href) {
    return (
      <ActionIcon aria-label={ariaLabel} onClick={onClick} {...actionIconProps}>
        {renderedIcon}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      aria-label={ariaLabel}
      onClick={onClick}
      renderRoot={(props) => <Link href={href} rel={rel} target={target} {...props} />}
      {...actionIconProps}
    >
      {renderedIcon}
    </ActionIcon>
  );
}
