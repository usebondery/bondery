"use client";

import { Group, Indicator, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import Link from "next/link";
import type { ComponentType, ReactNode, Ref } from "react";

type NavLinkItemBaseProps = {
  active?: boolean;
  /** Draw a subtle border around the item (e.g. search trigger). */
  bordered?: boolean;
  collapsed?: boolean;
  /** Render the label in a dimmed colour instead of the default weight. */
  dimLabel?: boolean;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  /** Content rendered after the label when the sidebar is expanded. */
  rightSection?: ReactNode;
  showIndicator?: boolean;
};

export type NavLinkItemProps = NavLinkItemBaseProps &
  ({ href: string; onClick?: undefined } | { href?: undefined; onClick: () => void });

/**
 * Padding keeps the icon horizontally centred inside the collapsed sidebar
 * (matching --sidebar-icon-pl in globals.css) so it never shifts on expand/collapse.
 * Both paddingLeft and paddingRight use the same value so the icon is
 * visually symmetric at all sidebar states.
 */
const ITEM_PADDING = {
  paddingBottom: "var(--mantine-spacing-xs)",
  paddingLeft: "var(--sidebar-icon-pl)",
  paddingRight: "var(--sidebar-icon-pl)",
  paddingTop: "var(--mantine-spacing-xs)",
} as const;

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
  // Active state is indicated solely by background color (primary fill).
  // button-scale-effect-active is intentionally NOT applied here — it permanently
  // applies filter:brightness(0.9) which tints white text gray and adds scale(0.98).
  // That class is reserved for mouse-press feedback, not current-page indication.
  const stateClassName = "button-scale-effect";
  const { hovered, ref } = useHover<HTMLElement>();

  const sharedStyle = {
    borderRadius: "var(--mantine-radius-sm)",
    width: "100%",
    // outline sits outside the box model so it doesn't shrink the padding area.
    ...(bordered && {
      outline: "1px solid var(--mantine-color-default-border)",
    }),
  } as const;

  const innerContent = (
    <>
      <Indicator
        color="yellow"
        disabled={!showIndicator}
        inline
        position="top-end"
        style={{ color: active ? "white" : undefined }}
        withBorder
      >
        <Icon size={20} stroke={1.5} />
      </Indicator>
      {!collapsed && (
        <>
          <Text
            c={active ? "white" : dimLabel ? "dimmed" : undefined}
            fw={dimLabel ? undefined : 500}
            size="sm"
            style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}
          >
            {label}
          </Text>
          {rightSection && <div style={{ flexShrink: 0 }}>{rightSection}</div>}
        </>
      )}
    </>
  );

  // Button mode — UnstyledButton applies proper UA resets.
  // h={40} prevents rightSection content (e.g. Kbd) from inflating the row.
  const item = onClick ? (
    <UnstyledButton
      className={stateClassName}
      h={40}
      onClick={onClick}
      ref={ref}
      style={{
        alignItems: "center",
        backgroundColor: active
          ? "var(--mantine-primary-color-filled)"
          : hovered
            ? "var(--mantine-primary-color-light-hover)"
            : "transparent",
        color: active ? "white" : "inherit",
        display: "flex",
        gap: "var(--mantine-spacing-sm)",
        justifyContent: "flex-start",
        ...ITEM_PADDING,
        ...sharedStyle,
      }}
    >
      {innerContent}
    </UnstyledButton>
  ) : (
    <Group
      aria-current={active ? "page" : undefined}
      className={stateClassName}
      gap="sm"
      justify="flex-start"
      ref={ref as Ref<HTMLDivElement>}
      renderRoot={(props) => <Link href={href} {...props} />}
      style={{
        backgroundColor: active
          ? "var(--mantine-primary-color-filled)"
          : hovered
            ? "var(--mantine-primary-color-light-hover)"
            : "transparent",
        color: active ? "white" : "inherit",
        textDecoration: "none",
        ...ITEM_PADDING,
        ...sharedStyle,
      }}
      wrap="nowrap"
    >
      {innerContent}
    </Group>
  );

  if (collapsed) {
    const tooltipLabel = rightSection ? (
      <Group gap="xs" wrap="nowrap">
        <Text inherit size="xs">
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
