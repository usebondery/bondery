import type { CodeBlockSnippet } from "@bondery/mantine-next";
import Image from "next/image";
import type { ReactNode } from "react";

type TranslateFn = (key: string) => string;

const BRAND_ICON_SIZE = 14;
/** apple.svg intrinsic ratio (height / width) — non-square unlike windows/linux */
const APPLE_ICON_HEIGHT = Math.round(BRAND_ICON_SIZE * (1000 / 842.32007));

function BrandOsIcon({ name, alt }: { name: "windows" | "apple" | "linux"; alt: string }): ReactNode {
  const height = name === "apple" ? APPLE_ICON_HEIGHT : BRAND_ICON_SIZE;
  return (
    <Image
      src={`/icons/brands/${name}.svg`}
      alt={alt}
      width={BRAND_ICON_SIZE}
      height={height}
      style={{ width: BRAND_ICON_SIZE, height: "auto", display: "block", flexShrink: 0 }}
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

export function buildApiKeyTestSnippets(
  apiBaseUrl: string,
  fullKey: string,
  t: TranslateFn,
): CodeBlockSnippet[] {
  const url = `${apiBaseUrl}/api/contacts`;

  return [
    {
      id: "windows",
      label: t("TestSnippetWindows"),
      language: "powershell",
      icon: <BrandOsIcon name="windows" alt={t("TestSnippetWindows")} />,
      code: `Invoke-RestMethod -Uri "${url}" -Headers @{ Authorization = "Bearer ${fullKey}" }`,
    },
    {
      id: "macos",
      label: t("TestSnippetMac"),
      language: "bash",
      icon: <BrandOsIcon name="apple" alt={t("TestSnippetMac")} />,
      code: `curl -H "Authorization: Bearer ${fullKey}" "${url}"`,
    },
    {
      id: "linux",
      label: t("TestSnippetLinux"),
      language: "bash",
      icon: <BrandOsIcon name="linux" alt={t("TestSnippetLinux")} />,
      code: `curl -H "Authorization: Bearer ${fullKey}" "${url}"`,
    },
  ];
}
