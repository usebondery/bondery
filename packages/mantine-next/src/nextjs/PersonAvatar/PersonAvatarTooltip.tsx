"use client";

import type { ContactPreview } from "@bondery/schemas";
import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import { PersonCard } from "#nextjs/PersonCard/index.js";

type PersonAvatarTooltipIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
};

interface PersonAvatarTooltipProps {
  children: ReactNode;
  /**
   * Element that clips the card. The card does not flip or shift.
   * The element needs `overflow: hidden`.
   */
  clipRoot?: HTMLElement | null;
  opened?: boolean;
  person: PersonAvatarTooltipIdentity;
}

/**
 * Custom tooltip wrapper for person avatars.
 * Uses a custom card label with transparent tooltip chrome for better readability.
 * `clipRoot` draws the card inside that element so its overflow clips the card.
 */
export function PersonAvatarTooltip({
  person,
  children,
  opened,
  clipRoot,
}: PersonAvatarTooltipProps) {
  const clipped = clipRoot != null;
  return (
    <Tooltip
      closeDelay={50}
      label={<PersonCard person={person} size="md" />}
      maw="none"
      {...(clipped
        ? { floatingStrategy: "absolute" as const, middlewares: { flip: false, shift: false } }
        : {})}
      offset={8}
      openDelay={120}
      {...(opened === undefined ? {} : { opened })}
      {...(clipped ? { portalProps: { target: clipRoot } } : {})}
      position="top"
      styles={{
        tooltip: {
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
      }}
      w="auto"
      withinPortal
    >
      {children}
    </Tooltip>
  );
}
