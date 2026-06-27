"use client";

import { useEffect, useState } from "react";
import { Button, Skeleton } from "@mantine/core";
import { IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import type { Contact } from "@bondery/schemas";
import { openShareContactModal } from "../people/components/ShareContactModal";

/** Module-level cache so repeated mentions of the same contact cost zero extra fetches. */
const contactCache = new Map<string, Contact>();

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

  const [contact, setContact] = useState<Contact | null>(() => contactCache.get(id) ?? null);

  useEffect(() => {
    if (name !== "share-contact") return;
    if (contactCache.has(id)) return;

    let cancelled = false;

    fetch(`${API_ROUTES.CONTACTS}/${id}?${buildAvatarQueryString("small")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.contact) return;
        contactCache.set(id, data.contact as Contact);
        setContact(data.contact as Contact);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [name, id]);

  // Unknown action — render nothing so it doesn't silently break
  if (name !== "share-contact") return null;

  if (!contact) {
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
