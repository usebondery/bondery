"use client";

import { Badge, Skeleton } from "@mantine/core";
import { IconTimelineEventText } from "@tabler/icons-react";
import Link from "next/link";
import { getActivityTypeConfig } from "@/lib/activityTypes";
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
        width={80}
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }

  const { emoji, color } = getActivityTypeConfig(interaction.type);

  return (
    <Link href="/app/interactions" style={{ textDecoration: "none" }}>
      <Badge
        variant="light"
        size="sm"
        color={color}
        leftSection={<span>{emoji}</span>}
        rightSection={
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <IconTimelineEventText size={14} />
          </span>
        }
        styles={{
          label: { textTransform: "none", fontWeight: 400 },
          root: { cursor: "pointer", display: "inline-flex", verticalAlign: "middle" },
        }}
      >
        {interaction.title ?? ""}
      </Badge>
    </Link>
  );
}
