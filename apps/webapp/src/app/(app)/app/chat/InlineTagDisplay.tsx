"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@mantine/core";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { TagPill } from "@/app/(app)/app/components/tags/TagPill";

interface CachedTag {
  label: string;
  color: string | null;
}

const tagCache = new Map<string, CachedTag>();

interface InlineTagDisplayProps {
  id: string;
}

/**
 * Inline tag pill for a tag reference in the AI chat.
 * Fetches label and color by ID, then renders a TagPill.
 */
export function InlineTagDisplay({ id }: InlineTagDisplayProps) {
  const [data, setData] = useState<CachedTag | null>(() => tagCache.get(id) ?? null);

  useEffect(() => {
    if (tagCache.has(id)) return;

    let cancelled = false;

    fetch(`${API_ROUTES.TAGS}/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.tag) return;
        const cached: CachedTag = {
          label: json.tag.label,
          color: json.tag.color ?? null,
        };
        tagCache.set(id, cached);
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
        width={60}
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }

  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <TagPill label={data.label} color={data.color} />
    </span>
  );
}
