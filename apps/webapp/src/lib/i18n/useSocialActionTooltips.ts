"use client";

import { useCallback } from "react";
import type { SocialActionKey } from "@/lib/contacts/socialActionTooltips";
import { useWebTranslations } from "./useWebTranslations";

const TOOLTIP_KEY: Record<SocialActionKey, string> = {
  email: "TooltipEmail",
  facebook: "TooltipFacebook",
  instagram: "TooltipInstagram",
  linkedin: "TooltipLinkedIn",
  phone: "TooltipCall",
  signal: "TooltipSignal",
  whatsapp: "TooltipWhatsApp",
};

function normalizeFirstName(firstName: string | null | undefined): string {
  const trimmed = String(firstName || "").trim();
  return trimmed.length > 0 ? trimmed : "contact";
}

export function useSocialActionTooltips() {
  const t = useWebTranslations("Socials");

  const getSocialActionTooltip = useCallback(
    (action: SocialActionKey, firstName: string) => {
      const name = normalizeFirstName(firstName);
      return t(TOOLTIP_KEY[action] as Parameters<typeof t>[0], { name });
    },
    [t],
  );

  const getSocialActionLabel = useCallback(
    (action: SocialActionKey) => {
      switch (action) {
        case "phone":
          return t("AriaPhone");
        case "email":
          return t("AriaEmail");
        case "linkedin":
          return t("FieldLinkedin");
        case "instagram":
          return t("FieldInstagram");
        case "whatsapp":
          return t("FieldWhatsapp");
        case "facebook":
          return t("FieldFacebook");
        case "signal":
          return t("FieldSignal");
        default:
          return action;
      }
    },
    [t],
  );

  return { getSocialActionLabel, getSocialActionTooltip };
}
