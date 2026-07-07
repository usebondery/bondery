"use client";

import { useCallback } from "react";
import { useWebTranslations as useTranslations } from "./useWebTranslations";

const INTERACTION_TYPE_KEY_MAP: Record<string, string> = {
  "Networking event": "NetworkingEvent",
  "Party/Social": "PartySocial",
  "Text/Messaging": "TextMessaging",
  "Competition/Hackathon": "CompetitionHackathon",
};

export function getInteractionTypeTranslationKey(type: string): string {
  return INTERACTION_TYPE_KEY_MAP[type] ?? type;
}

export function useInteractionTypeLabel() {
  const t = useTranslations("InteractionTypes");

  return useCallback(
    (type: string) => {
      const key = getInteractionTypeTranslationKey(type);
      const translated = t(key as Parameters<typeof t>[0]);
      return translated === key ? type : translated;
    },
    [t],
  );
}
