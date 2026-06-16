"use client";

import { useEffect, useState } from "react";
import { Badge, Skeleton } from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import Link from "next/link";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

interface CachedGroup {
  emoji: string;
  name: string;
  color: string;
}

const groupCache = new Map<string, CachedGroup>();

interface InlineGroupDisplayProps {
  id: string;
}

/**
 * Inline badge for a group reference in the AI chat.
 * Fetches emoji, name, and color by ID.
 */
export function InlineGroupDisplay({ id }: InlineGroupDisplayProps) {
  const [data, setData] = useState<CachedGroup | null>(() => groupCache.get(id) ?? null);

  useEffect(() => {
    if (groupCache.has(id)) return;

    let cancelled = false;

    fetch(`${API_ROUTES.GROUPS}/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.group) return;
        const cached: CachedGroup = {
          emoji: json.group.emoji ?? "👥",
          name: json.group.label ?? "",
          color: json.group.color ?? "gray",
        };
        groupCache.set(id, cached);
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

  return (
    <Link href={`/app/group/${id}`} style={{ textDecoration: "none" }}>
      <Badge
        variant="light"
        size="sm"
        color={data.color}
        leftSection={<span>{data.emoji}</span>}
        rightSection={
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <IconUsersGroup size={14} />
          </span>
        }
        styles={{
          label: { textTransform: "none", fontWeight: 500 },
          root: { cursor: "pointer", display: "inline-flex", verticalAlign: "middle" },
        }}
      >
        {data.name}
      </Badge>
    </Link>
  );
}
