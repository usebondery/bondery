"use client";

import {
  Group,
  type GroupProps,
  Kbd as MantineKbd,
  type KbdProps as MantineKbdProps,
} from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { resolveShortcutKeyLabel, type ShortcutKeyToken } from "#Kbd/resolveShortcutKeyLabel.js";

export type { ShortcutKeyToken };

export interface KbdProps extends Omit<MantineKbdProps, "children"> {
  /** Gap between key chips when rendering multiple keys. Defaults to `4`. */
  gap?: GroupProps["gap"];
  /** Shortcut tokens, e.g. `["mod", "k"]` renders ⌘K on macOS and Ctrl+K elsewhere. */
  keys: readonly ShortcutKeyToken[];
}

/**
 * Platform-aware keyboard shortcut display built on Mantine's `Kbd`.
 * Uses `useOs` to swap modifier labels (Ctrl vs ⌘) while keeping letter keys stable.
 */
export function Kbd({ keys, gap = 4, ...kbdProps }: KbdProps) {
  const os = useOs();

  if (keys.length === 0) {
    return null;
  }

  if (keys.length === 1) {
    return (
      <MantineKbd {...kbdProps} suppressHydrationWarning>
        {resolveShortcutKeyLabel(keys[0], os)}
      </MantineKbd>
    );
  }

  return (
    <Group align="center" component="span" display="inline-flex" gap={gap} wrap="nowrap">
      {keys.map((key) => (
        <MantineKbd key={key} {...kbdProps} suppressHydrationWarning>
          {resolveShortcutKeyLabel(key, os)}
        </MantineKbd>
      ))}
    </Group>
  );
}
