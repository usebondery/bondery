"use client";

import { useQuery } from "@tanstack/react-query";
import { createWebappAuthClient } from "@/lib/auth/client";
import { settingsKeys } from "@/lib/query/keys";

async function fetchPasskeys(): Promise<PasskeyRecord[]> {
  const { data, error } = await createWebappAuthClient().passkey.listUserPasskeys();
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export type PasskeyRecord = {
  aaguid?: string | null;
  createdAt?: Date | string;
  id: string;
  lastUsedAt?: Date | string | null;
  name?: string | null;
};

export function passkeyLastUsedAtIso(passkey: PasskeyRecord): string | null {
  const value = passkey.lastUsedAt;
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value.length > 0 ? value : null;
}

export function usePasskeysQuery() {
  return useQuery({
    queryFn: fetchPasskeys,
    queryKey: settingsKeys.passkeys(),
    refetchOnWindowFocus: false,
    // `/auth/*` is IP-limited in Fastify before session auth. Do not retry
    // 429s back into that shared localhost bucket.
    retry: false,
  });
}
