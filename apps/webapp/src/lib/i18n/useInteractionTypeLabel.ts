"use client";

import type { LooseTranslateFn } from "@bondery/translations";
import { useCallback } from "react";
import { useInteractionTypesTranslations } from "@/lib/i18n/generated/hooks";

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
  const t = useInteractionTypesTranslations() as LooseTranslateFn;

  return useCallback(
    (type: string) => {
      const key = getInteractionTypeTranslationKey(type);
      const translated = t(key);
      return translated === key ? type : translated;
    },
    [t],
  );
}
