"use client";

import { useCallback } from "react";
import { useWebTranslations } from "./useWebTranslations";

const INTERACTION_TYPE_KEY_MAP: Record<string, string> = {
  "Competition/Hackathon": "CompetitionHackathon",
  "Networking event": "NetworkingEvent",
  "Party/Social": "PartySocial",
  "Text/Messaging": "TextMessaging",
};

export function getInteractionTypeTranslationKey(type: string): string {
  return INTERACTION_TYPE_KEY_MAP[type] ?? type;
}

export function useInteractionTypeLabel() {
  const t = useWebTranslations("InteractionTypes");

  return useCallback(
    (type: string) => {
      const key = getInteractionTypeTranslationKey(type);
      const translated = t(key as Parameters<typeof t>[0]);
      return translated === key ? type : translated;
    },
    [t],
  );
}
