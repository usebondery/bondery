"use client";

import { Badge, Skeleton } from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import Link from "next/link";
import { inlineTokenLabel, type TokenLookup } from "@/lib/chat/inlineTokenLabel";
import { useChatGroupQuery } from "@/lib/query/hooks/useChat";

interface InlineGroupDisplayProps {
  id: string;
}

/**
 * Inline badge for a group reference in the AI chat.
 * Fetches emoji, name, and color by ID.
 *
 * The label comes from `inlineTokenLabel`, the same source the spoken text
 * reads, so the badge and the voice never disagree.
 */
export function InlineGroupDisplay({ id }: InlineGroupDisplayProps) {
  const { data: group, isLoading } = useChatGroupQuery(id);

  if (isLoading || !group) {
    return (
      <Skeleton
        height={22}
        radius="xl"
        style={{ display: "inline-block", verticalAlign: "middle" }}
        width={80}
      />
    );
  }

  const lookup: TokenLookup = {
    getGroup: (groupId) => (groupId === id ? group : null),
  };
  const label = inlineTokenLabel({ id, type: "group" }, lookup);

  return (
    <Link href={`/app/group/${id}`} style={{ textDecoration: "none" }}>
      <Badge
        color={group.color ?? "gray"}
        leftSection={<span>{group.emoji ?? "👥"}</span>}
        rightSection={
          <span style={{ alignItems: "center", display: "inline-flex" }}>
            <IconUsersGroup size={14} />
          </span>
        }
        size="sm"
        styles={{
          label: { fontWeight: 500, textTransform: "none" },
          root: { cursor: "pointer", display: "inline-flex", verticalAlign: "middle" },
        }}
        variant="light"
      >
        {label}
      </Badge>
    </Link>
  );
}
