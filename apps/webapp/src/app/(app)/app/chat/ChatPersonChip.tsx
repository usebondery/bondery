"use client";

import { useEffect, useState } from "react";
import { PersonChip } from "@bondery/mantine-next";
import type { ContactPreview } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { buildAvatarQueryString } from "@/lib/avatarParams";

type EnrichedPerson = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
};

/** Module-level cache so repeated mentions of the same person cost zero extra fetches. */
const personCache = new Map<string, EnrichedPerson>();

interface ChatPersonChipProps {
  personId: string;
}

/**
 * PersonChip wrapper used inside AI chat messages.
 * Fetches all display data (name, avatar, headline, location) by person ID.
 */
export function ChatPersonChip({ personId }: ChatPersonChipProps) {
  const [person, setPerson] = useState<EnrichedPerson | null>(() => {
    return personCache.get(personId) ?? null;
  });

  useEffect(() => {
    if (personCache.has(personId)) return;

    let cancelled = false;

    fetch(`${API_ROUTES.CONTACTS}/${personId}?${buildAvatarQueryString("small")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.contact) return;
        const c = data.contact;
        const enriched: EnrichedPerson = {
          id: c.id,
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? null,
          avatar: c.avatar ?? null,
          middleName: c.middleName ?? null,
          headline: c.headline ?? null,
          location: c.location ?? null,
        };
        personCache.set(personId, enriched);
        setPerson(enriched);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [personId]);

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
