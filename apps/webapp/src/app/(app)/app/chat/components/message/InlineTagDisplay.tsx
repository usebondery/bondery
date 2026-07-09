"use client";

import { Skeleton } from "@mantine/core";
import { TagPill } from "@/components/tags/TagPill";
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
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
        width={60}
      />
    );
  }

  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <TagPill color={tag.color ?? null} label={tag.label} />
    </span>
  );
}
