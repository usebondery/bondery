"use client";

import type { DescribedSelectOption } from "@bondery/mantine-next";
import { IconEye, IconShieldCheck } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

export function useApiKeyPermissionOptions(): DescribedSelectOption[] {
  const t = useSettingsPageTranslations("ApiKeys");

  return [
    {
      description: t("PermissionReadDescription"),
      label: t("PermissionReadLabel"),
      leftSection: <IconEye size={16} stroke={1.5} />,
      value: "read",
    },
    {
      description: t("PermissionFullDescription"),
      label: t("PermissionFullLabel"),
      leftSection: <IconShieldCheck size={16} stroke={1.5} />,
      value: "full",
    },
  ];
}
