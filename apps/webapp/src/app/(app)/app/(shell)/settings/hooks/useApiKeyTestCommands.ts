"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { CodeBlockPlatform } from "@bondery/mantine-next";

/**
 * Test request per desktop OS for a freshly minted API key.
 * Only the code differs per platform. Labels, icons, and the default tab come from `CodeBlock`.
 */
export function useApiKeyTestCommands(
  apiBaseUrl: string,
  fullKey: string,
): Partial<Record<CodeBlockPlatform, string>> {
  const url = `${apiBaseUrl.replace(/\/+$/, "")}${API_ROUTES.CONTACTS}`;
  const posix = `curl -H "Authorization: Bearer ${fullKey}" "${url}"`;

  return {
    linux: posix,
    macos: posix,
    windows: `Invoke-RestMethod -Uri "${url}" -Headers @{ Authorization = "Bearer ${fullKey}" }`,
  };
}
