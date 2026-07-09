"use client";

import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export type PhotoUploadVariant = "profile" | "contact";

interface PhotoUploadCopy {
  keyPrefix?: string;
  namespace: string;
}

const COPY_BY_VARIANT = {
  contact: { namespace: "ContactPhotoUpload" },
  profile: { keyPrefix: "Profile", namespace: "SettingsPage" },
} as const satisfies Record<PhotoUploadVariant, PhotoUploadCopy>;

export function usePhotoUploadTranslations(variant: PhotoUploadVariant) {
  const copy = COPY_BY_VARIANT[variant];
  return useWebTranslations(copy.namespace, "keyPrefix" in copy ? copy.keyPrefix : undefined);
}
