"use client";

import type { DescribedSelectOption } from "@bondery/mantine-next";
import { IconEye, IconShieldCheck } from "@tabler/icons-react";
import { useMemo } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function useApiKeyPermissionOptions(): DescribedSelectOption[] {
  const t = useWebTranslations("SettingsPage", "ApiKeys");

  return useMemo(
    () => [
      {
        description: t("PermissionFullDescription"),
        icon: <IconShieldCheck size={16} stroke={1.5} />,
        label: t("PermissionFullLabel"),
        value: "full",
      },
      {
        description: t("PermissionReadDescription"),
        icon: <IconEye size={16} stroke={1.5} />,
        label: t("PermissionReadLabel"),
        value: "read",
      },
    ],
    [t],
  );
}
