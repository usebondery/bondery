import { authClient } from "./client";
import {
  type EndLocalSessionReason,
  notifyLocalSessionEnded,
  parseSessionTokenFromCookieHeader,
} from "./session";

let isSigningOutLocally = false;

function beginLocalSignOut(): boolean {
  if (isSigningOutLocally || !authClient) {
    return false;
  }

  isSigningOutLocally = true;
  return true;
}

/**
 * Local credential only. Does not call `getSession()`.
 */
export async function readLocalAccessToken(): Promise<string | null> {
  if (!authClient) {
    return null;
  }

  const cookieHeader = await authClient.getCookie();
  return parseSessionTokenFromCookieHeader(cookieHeader);
}

/**
 * Tear down the local Better Auth session. Stack.Protected handles redirect.
 */
export async function endLocalSession({
  reason,
}: {
  reason: EndLocalSessionReason;
}): Promise<void> {
  if (!beginLocalSignOut()) {
    return;
  }

  try {
    notifyLocalSessionEnded(reason);
    const result = await authClient?.signOut();
    if (reason === "user_initiated" && result?.error) {
      throw result.error;
    }
  } finally {
    isSigningOutLocally = false;
  }
}
