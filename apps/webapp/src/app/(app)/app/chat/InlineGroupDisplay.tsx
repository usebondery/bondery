"use client";

import { Badge, Skeleton } from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import Link from "next/link";
import { useChatGroupQuery } from "@/lib/query/hooks/useChat";

interface InlineGroupDisplayProps {
  id: string;
}

/**
 * Inline badge for a group reference in the AI chat.
 * Fetches emoji, name, and color by ID.
 */
export function InlineGroupDisplay({ id }: InlineGroupDisplayProps) {
  const { data: group, isLoading } = useChatGroupQuery(id);

  if (isLoading || !group) {
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
        color={group.color ?? "gray"}
        leftSection={<span>{group.emoji ?? "👥"}</span>}
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
        {group.label}
      </Badge>
    </Link>
  );
}
