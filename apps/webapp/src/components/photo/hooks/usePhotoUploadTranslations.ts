"use client";

import type { LooseTranslateFn } from "@bondery/translations";
import {
  useContactPhotoUploadTranslations,
  useSettingsPageTranslations,
} from "@/lib/i18n/generated/hooks";

export type PhotoUploadVariant = "profile" | "contact";

export function usePhotoUploadTranslations(variant: PhotoUploadVariant): LooseTranslateFn {
  const tContact = useContactPhotoUploadTranslations();
  const tProfile = useSettingsPageTranslations("Profile");
  return (variant === "contact" ? tContact : tProfile) as LooseTranslateFn;
}
