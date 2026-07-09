"use client";

import { PersonChip } from "@bondery/mantine-next";
import type { ContactPreview } from "@bondery/schemas";
import { useChatContactQuery } from "@/lib/query/hooks/useChat";

type EnrichedPerson = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
};

interface ChatPersonChipProps {
  personId: string;
}

/**
 * PersonChip wrapper used inside AI chat messages.
 * Fetches all display data (name, avatar, headline, location) by person ID.
 */
export function ChatPersonChip({ personId }: ChatPersonChipProps) {
  const { data: contact } = useChatContactQuery(personId);

  const person: EnrichedPerson | null = contact
    ? {
        avatar: contact.avatar ?? null,
        firstName: contact.firstName ?? "",
        headline: contact.headline ?? null,
        id: contact.id,
        lastName: contact.lastName ?? null,
        location: contact.location ?? null,
        middleName: contact.middleName ?? null,
      }
    : null;

  if (!person) {
    return (
      <PersonChip
        person={{ avatar: null, firstName: "…", id: personId, lastName: null }}
        size="sm"
      />
    );
  }

  return <PersonChip isClickable person={person} showHoverCard size="sm" />;
}
