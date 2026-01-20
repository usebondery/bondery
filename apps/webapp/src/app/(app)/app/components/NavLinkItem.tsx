"use client";

import { NavLink } from "@mantine/core";
import Link from "next/link";
import { ComponentType } from "react";
import { useHover } from "@mantine/hooks";

export interface NavLinkItemProps {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  active: boolean;
}

export function NavLinkItem({ href, label, icon: Icon, active }: NavLinkItemProps) {
  const { hovered, ref } = useHover();

  return (
    <NavLink
      component={Link}
      href={href}
      label={label}
      ref={ref}
      leftSection={<Icon size={20} stroke={1.5} />}
      active={active}
      variant="filled"
      key={`link-${href}`}
      bg={hovered && !active ? "var(--mantine-primary-color-light-hover)" : ""}
    />
  );
}
