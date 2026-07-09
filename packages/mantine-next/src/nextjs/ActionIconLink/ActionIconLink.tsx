"use client";

import { ActionIcon, type ActionIconProps, Center } from "@mantine/core";
import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { mantineLinkComponent } from "#nextjs/NextLink.js";

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
      <ActionIcon aria-label={ariaLabel} {...actionIconProps}>
        {renderedIcon}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      aria-label={ariaLabel}
      component={mantineLinkComponent}
      href={href}
      rel={rel}
      target={target}
      {...actionIconProps}
    >
      {renderedIcon}
    </ActionIcon>
  );
}
