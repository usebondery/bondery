"use client";

import type { DescribedSelectOption } from "@bondery/mantine-next";
import { IconEye, IconShieldCheck } from "@tabler/icons-react";

type TranslateFn = (key: string) => string;

export function buildApiKeyPermissionOptions(t: TranslateFn): DescribedSelectOption[] {
  return [
    {
      value: "full",
      label: t("PermissionFullLabel"),
      description: t("PermissionFullDescription"),
      icon: <IconShieldCheck size={16} stroke={1.5} />,
    },
    {
      value: "read",
      label: t("PermissionReadLabel"),
      description: t("PermissionReadDescription"),
      icon: <IconEye size={16} stroke={1.5} />,
    },
  ];
}
