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
  person: PersonAvatarTooltipIdentity;
}

/**
 * Custom tooltip wrapper for person avatars.
 * Uses a custom card label with transparent tooltip chrome for better readability.
 */
export function PersonAvatarTooltip({ person, children }: PersonAvatarTooltipProps) {
  return (
    <Tooltip
      closeDelay={50}
      label={<PersonCard person={person} size="md" />}
      offset={8}
      openDelay={120}
      position="top"
      styles={{
        tooltip: {
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
      }}
      withArrow
    >
      {children}
    </Tooltip>
  );
}
