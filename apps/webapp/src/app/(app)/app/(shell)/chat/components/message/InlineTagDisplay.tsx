"use client";

import { Skeleton } from "@mantine/core";
import { TagPill } from "@/components/tags/TagPill";
import { inlineTokenLabel, type TokenLookup } from "@/lib/chat/inlineTokenLabel";
import { useChatTagQuery } from "@/lib/query/hooks/useChat";

interface InlineTagDisplayProps {
  id: string;
}

/**
 * Inline tag pill for a tag reference in the AI chat.
 * Fetches label and color by ID, then renders a TagPill.
 *
 * The label comes from `inlineTokenLabel`, the same source the spoken text
 * reads, so the pill and the voice never disagree.
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

  const lookup: TokenLookup = {
    getTag: (tagId) => (tagId === id ? tag : null),
  };
  const label = inlineTokenLabel({ id, type: "tag" }, lookup);

  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <TagPill color={tag.color ?? null} label={label ?? ""} />
    </span>
  );
}
