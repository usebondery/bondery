"use client";

import type { CodeBlockSnippet } from "@bondery/mantine-next";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

const BRAND_ICON_SIZE = 14;
/** apple.svg intrinsic ratio (height / width) — non-square unlike windows/linux */
const APPLE_ICON_HEIGHT = Math.round(BRAND_ICON_SIZE * (1000 / 842.32007));

function BrandOsIcon({
  name,
  alt,
}: {
  name: "windows" | "apple" | "linux";
  alt: string;
}): ReactNode {
  const height = name === "apple" ? APPLE_ICON_HEIGHT : BRAND_ICON_SIZE;
  return (
    <Image
      alt={alt}
      height={height}
      src={`/icons/brands/${name}.svg`}
      style={{ display: "block", flexShrink: 0, height: "auto", width: BRAND_ICON_SIZE }}
      width={BRAND_ICON_SIZE}
    />
  );
}

export type ApiKeyTestSnippetId = "windows" | "macos" | "linux";

export function resolveDefaultTestSnippetId(os: string | undefined): ApiKeyTestSnippetId {
  switch (os) {
    case "windows":
      return "windows";
    case "macos":
    case "ios":
      return "macos";
    case "linux":
    case "android":
      return "linux";
    default:
      return "windows";
  }
}

export function useApiKeyTestSnippets(apiBaseUrl: string, fullKey: string): CodeBlockSnippet[] {
  const t = useSettingsPageTranslations("ApiKeys");

  return useMemo(() => {
    const url = `${apiBaseUrl}/api/contacts`;

    return [
      {
        code: `Invoke-RestMethod -Uri "${url}" -Headers @{ Authorization = "Bearer ${fullKey}" }`,
        icon: <BrandOsIcon alt={t("TestSnippetWindows")} name="windows" />,
        id: "windows",
        label: t("TestSnippetWindows"),
        language: "powershell",
      },
      {
        code: `curl -H "Authorization: Bearer ${fullKey}" "${url}"`,
        icon: <BrandOsIcon alt={t("TestSnippetMac")} name="apple" />,
        id: "macos",
        label: t("TestSnippetMac"),
        language: "bash",
      },
      {
        code: `curl -H "Authorization: Bearer ${fullKey}" "${url}"`,
        icon: <BrandOsIcon alt={t("TestSnippetLinux")} name="linux" />,
        id: "linux",
        label: t("TestSnippetLinux"),
        language: "bash",
      },
    ];
  }, [apiBaseUrl, fullKey, t]);
}
