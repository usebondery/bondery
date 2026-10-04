import { createWebappAuthClient } from "@/lib/auth/client";
import { isSessionCreatedAtFresh } from "./is-session-fresh";

export async function isBetterAuthSessionFresh(): Promise<boolean> {
  const { data } = await createWebappAuthClient().getSession();
  return isSessionCreatedAtFresh(data?.session?.createdAt);
}

export async function getBetterAuthSessionIdentity(): Promise<{
  email: string | null;
  id: string | null;
} | null> {
  const { data } = await createWebappAuthClient().getSession();
  const id = data?.user?.id;
  if (!id) {
    return null;
  }

  return {
    email: data.user.email ?? null,
    id,
  };
}

/**
 * BA cookie user must match the BFF settings user before Continue or minting a nonce.
 * Prefer `identities[0].user_id`; fall back to email when there are no Account rows.
 */
export function baIdentityMatchesBff(input: {
  baEmail: string | null;
  baUserId: string | null;
  bffEmail: string | null | undefined;
  bffUserId: string | null | undefined;
}): boolean {
  if (!input.baUserId) {
    return false;
  }

  if (input.bffUserId) {
    return input.baUserId === input.bffUserId;
  }

  if (!input.baEmail || !input.bffEmail) {
    return false;
  }

  return input.baEmail.trim().toLowerCase() === input.bffEmail.trim().toLowerCase();
}
