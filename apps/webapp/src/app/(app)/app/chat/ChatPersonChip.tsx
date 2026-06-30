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
        id: contact.id,
        firstName: contact.firstName ?? "",
        lastName: contact.lastName ?? null,
        avatar: contact.avatar ?? null,
        middleName: contact.middleName ?? null,
        headline: contact.headline ?? null,
        location: contact.location ?? null,
      }
    : null;

  if (!person) {
    return (
      <PersonChip
        person={{ id: personId, firstName: "…", lastName: null, avatar: null }}
        size="sm"
      />
    );
  }

  return <PersonChip person={person} size="sm" isClickable showHoverCard />;
}
