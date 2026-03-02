"use client";

import { Indicator, NavLink } from "@mantine/core";
import Link from "next/link";
import { ComponentType } from "react";
import { useHover } from "@mantine/hooks";

export interface NavLinkItemProps {
  href?: string;
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  active: boolean;
  showIndicator?: boolean;
}

export function NavLinkItem({ href, label, icon: Icon, active, showIndicator }: NavLinkItemProps) {
  const { hovered, ref } = useHover();

  if (!href) {
    return null;
  }

  return (
    <NavLink
      component={Link}
      href={href}
      label={label}
      ref={ref}
      leftSection={
        <Indicator inline disabled={!showIndicator} color="yellow" position="top-end" withBorder>
          <Icon size={20} stroke={1.5} />
        </Indicator>
      }
      active={active}
      variant="filled"
      key={`link-${href}`}
      bg={hovered && !active ? "var(--mantine-primary-color-light-hover)" : ""}
    />
  );
}
