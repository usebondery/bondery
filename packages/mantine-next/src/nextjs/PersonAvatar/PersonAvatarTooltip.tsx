"use client";

import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import type { ContactPreview } from "@bondery/types";
import { PersonCard } from "../PersonCard";

type PersonAvatarTooltipIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
};

interface PersonAvatarTooltipProps {
  person: PersonAvatarTooltipIdentity;
  children: ReactNode;
}

/**
 * Custom tooltip wrapper for person avatars.
 * Uses a custom card label with transparent tooltip chrome for better readability.
 */
export function PersonAvatarTooltip({ person, children }: PersonAvatarTooltipProps) {
  return (
    <Tooltip
      withArrow
      openDelay={120}
      closeDelay={50}
      offset={8}
      position="top"
      label={<PersonCard person={person} size="md" />}
      styles={{
        tooltip: {
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
