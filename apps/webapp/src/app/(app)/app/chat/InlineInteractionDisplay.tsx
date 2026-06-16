"use client";

import { useEffect, useState } from "react";
import { Badge, Skeleton } from "@mantine/core";
import { IconTimelineEventText } from "@tabler/icons-react";
import Link from "next/link";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

interface CachedInteraction {
  type: string;
  title: string;
}

const interactionCache = new Map<string, CachedInteraction>();

interface InlineInteractionDisplayProps {
  id: string;
}

/**
 * Inline badge for an interaction reference in the AI chat.
 * Fetches type + title by ID, then renders with the type's emoji and color.
 */
export function InlineInteractionDisplay({ id }: InlineInteractionDisplayProps) {
  const [data, setData] = useState<CachedInteraction | null>(
    () => interactionCache.get(id) ?? null,
  );

  useEffect(() => {
    if (interactionCache.has(id)) return;

    let cancelled = false;

    fetch(`${API_ROUTES.INTERACTIONS}/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.interaction) return;
        const cached: CachedInteraction = {
          type: json.interaction.type,
          title: json.interaction.title ?? "",
        };
        interactionCache.set(id, cached);
        setData(cached);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!data) {
    return (
      <Skeleton
        height={22}
        width={80}
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }

  const { emoji, color } = getActivityTypeConfig(data.type);

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
        {data.title}
      </Badge>
    </Link>
  );
}
