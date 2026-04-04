"use client";

import { Group, Indicator, Text, Tooltip, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import { ComponentType, ReactNode } from "react";

export interface NavLinkItemProps {
  /** Render as a link. Required when `onClick` is not provided. */
  href?: string;
  /** Render as a button. Required when `href` is not provided. */
  onClick?: () => void;
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  active?: boolean;
  showIndicator?: boolean;
  collapsed?: boolean;
  /** Draw a subtle border around the item (e.g. search trigger). */
  bordered?: boolean;
  /** Content rendered after the label when the sidebar is expanded. */
  rightSection?: ReactNode;
  /** Render the label in a dimmed colour instead of the default weight. */
  dimLabel?: boolean;
}

export function NavLinkItem({
  href,
  onClick,
  label,
  icon: Icon,
  active = false,
  showIndicator,
  collapsed,
  bordered,
  rightSection,
  dimLabel,
}: NavLinkItemProps) {
  // Active and hover colours are handled via Tailwind class selectors — no JS
  // hover tracking needed. When active, the filled background wins and the hover
  // class is not applied so active items don't flash on mouse-over.
  const stateClassName = active
    ? "bg-[var(--mantine-primary-color-filled)] text-white"
    : "bg-transparent hover:bg-[var(--mantine-primary-color-light-hover)]!";

  const sharedStyle = {
    width: "100%",
    borderRadius: "var(--mantine-radius-sm)",
    transition: "background-color var(--transition-time) var(--transition-ease)",
    ...(bordered && { border: "1px solid var(--mantine-color-default-border)" }),
  } as const;

  const innerContent = (
    <>
      <Indicator inline disabled={!showIndicator} color="yellow" position="top-end" withBorder>
        <Icon size={20} stroke={1.5} />
      </Indicator>
      {!collapsed && (
        <>
          <Text
            size="sm"
            fw={dimLabel ? undefined : 500}
            c={dimLabel ? "dimmed" : undefined}
            style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}
          >
            {label}
          </Text>
          {rightSection && <div style={{ flexShrink: 0 }}>{rightSection}</div>}
        </>
      )}
    </>
  );

  // Button mode — UnstyledButton applies proper UA resets and h={40} prevents
  // rightSection content (e.g. Kbd) from inflating the row beyond the icon height.
  const item = onClick ? (
    <UnstyledButton
      onClick={onClick}
      h={40}
      px="xs"
      className={stateClassName}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: "var(--mantine-spacing-sm)",
        ...sharedStyle,
      }}
    >
      {innerContent}
    </UnstyledButton>
  ) : (
    <Group
      component={Link as any}
      {...({ href } as any)}
      wrap="nowrap"
      gap="sm"
      justify={collapsed ? "center" : "flex-start"}
      p="xs"
      aria-current={active ? "page" : undefined}
      className={stateClassName}
      style={{
        textDecoration: "none",
        ...sharedStyle,
      }}
    >
      {innerContent}
    </Group>
  );

  if (collapsed) {
    const tooltipLabel = rightSection ? (
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" inherit>
          {label}
        </Text>
        {rightSection}
      </Group>
    ) : (
      label
    );

    return (
      <Tooltip label={tooltipLabel} position="right" withArrow>
        {item}
      </Tooltip>
    );
  }

  return item;
}
