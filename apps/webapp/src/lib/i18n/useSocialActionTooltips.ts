"use client";

import type { LooseTranslateFn } from "@bondery/translations";
import { useCallback } from "react";
import type { SocialActionKey } from "@/lib/contacts/socialActionTooltips";
import { useSocialsTranslations } from "@/lib/i18n/generated/hooks";

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
  const t = useSocialsTranslations();
  const tLoose = t as LooseTranslateFn;

  const getSocialActionTooltip = useCallback(
    (action: SocialActionKey, firstName: string) => {
      const name = normalizeFirstName(firstName);
      return tLoose(TOOLTIP_KEY[action], { name });
    },
    [tLoose],
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
