"use client";

import { Button, Skeleton } from "@mantine/core";
import { IconShare } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useChatContactQuery } from "@/lib/query/hooks/useChat";
import { openShareContactModal } from "../../../people/components/modals/ShareContactModal";

interface ChatShareCardProps {
  /** UUID of the contact to share. */
  id: string;
  /** The action name (e.g. "share-contact"). Used for future-proofing. */
  name: string;
}

/**
 * Inline action card rendered inside AI chat messages when the LLM emits
 * `[[bp:action:share-contact|UUID]]`. Fetches the contact and opens the
 * standard ShareContactModal when clicked.
 */
export function ChatShareCard({ name, id }: ChatShareCardProps) {
  const tShare = useWebTranslations("ShareContactModal");
  const { data: contact, isLoading } = useChatContactQuery(id);

  if (name !== "share-contact") {
    return null;
  }

  if (isLoading || !contact) {
    return (
      <Skeleton
        height={30}
        radius="sm"
        style={{ display: "inline-block", verticalAlign: "middle" }}
        width={100}
      />
    );
  }

  return (
    <Button
      leftSection={<IconShare size={14} />}
      onClick={() => openShareContactModal({ contact })}
      size="xs"
      style={{ display: "inline-flex", verticalAlign: "middle" }}
      variant="light"
    >
      {tShare("ModalTitle")}
    </Button>
  );
}
