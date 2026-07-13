"use client";

import { Badge, Skeleton } from "@mantine/core";
import { IconTimelineEventText } from "@tabler/icons-react";
import Link from "next/link";
import { getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { useChatInteractionQuery } from "@/lib/query/hooks/useChat";

interface InlineInteractionDisplayProps {
  id: string;
}

/**
 * Inline badge for an interaction reference in the AI chat.
 * Fetches type + title by ID, then renders with the type's emoji and color.
 */
export function InlineInteractionDisplay({ id }: InlineInteractionDisplayProps) {
  const { data: interaction, isLoading } = useChatInteractionQuery(id);

  if (isLoading || !interaction) {
    return (
      <Skeleton
        height={22}
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
        width={80}
      />
    );
  }

  const { emoji, color } = getActivityTypeConfig(interaction.type);

  return (
    <Link href="/app/interactions" style={{ textDecoration: "none" }}>
      <Badge
        color={color}
        leftSection={<span>{emoji}</span>}
        rightSection={
          <span style={{ alignItems: "center", display: "inline-flex" }}>
            <IconTimelineEventText size={14} />
          </span>
        }
        size="sm"
        styles={{
          label: { fontWeight: 400, textTransform: "none" },
          root: { cursor: "pointer", display: "inline-flex", verticalAlign: "middle" },
        }}
        variant="light"
      >
        {interaction.title ?? ""}
      </Badge>
    </Link>
  );
}
