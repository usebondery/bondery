"use client";

import { Skeleton } from "@mantine/core";
import { TagPill } from "@/app/(app)/app/components/tags/TagPill";
import { useChatTagQuery } from "@/lib/query/hooks/useChat";

interface InlineTagDisplayProps {
  id: string;
}

/**
 * Inline tag pill for a tag reference in the AI chat.
 * Fetches label and color by ID, then renders a TagPill.
 */
export function InlineTagDisplay({ id }: InlineTagDisplayProps) {
  const { data: tag, isLoading } = useChatTagQuery(id);

  if (isLoading || !tag) {
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
      <TagPill label={tag.label} color={tag.color ?? null} />
    </span>
  );
}
