"use client";

import { Skeleton, Button } from "@mantine/core";
import { IconShare } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { openShareContactModal } from "../people/components/ShareContactModal";
import { useChatContactQuery } from "@/lib/query/hooks/useChat";

interface ChatShareCardProps {
  /** The action name (e.g. "share-contact"). Used for future-proofing. */
  name: string;
  /** UUID of the contact to share. */
  id: string;
}

/**
 * Inline action card rendered inside AI chat messages when the LLM emits
 * `[[bp:action:share-contact|UUID]]`. Fetches the contact and opens the
 * standard ShareContactModal when clicked.
 */
export function ChatShareCard({ name, id }: ChatShareCardProps) {
  const tShare = useTranslations("ShareContactModal");
  const { data: contact, isLoading } = useChatContactQuery(id);

  if (name !== "share-contact") return null;

  if (isLoading || !contact) {
    return (
      <Skeleton
        height={30}
        width={100}
        radius="sm"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }

  return (
    <Button
      size="xs"
      variant="light"
      leftSection={<IconShare size={14} />}
      onClick={() => openShareContactModal({ contact })}
      style={{ display: "inline-flex", verticalAlign: "middle" }}
    >
      {tShare("ModalTitle")}
    </Button>
  );
}
