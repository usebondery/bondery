import "server-only";

import { cookies, headers } from "next/headers";
import { WEBAPP_SESSION_COOKIE } from "@/lib/auth/constants";
import { decryptWebappSession, type WebappSessionPayload } from "@/lib/auth/oauthClient.server";

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const match = cookieHeader.split("; ").find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function resolveCookieHeader(cookieHeader?: string): Promise<string> {
  if (cookieHeader !== undefined) {
    return cookieHeader;
  }

  const headersList = await headers();
  return headersList.get("cookie") ?? "";
}

export type BetterAuthUser = WebappSessionPayload["user"];

export type BetterAuthSessionPayload = {
  session: {
    expiresAt: number;
    token: string;
    userId: string;
  };
  user: BetterAuthUser;
};

/**
 * Reads the webapp's own OAuth-BFF session — independent of Better Auth's
 * native cookie on the API's domain (see oauthClient.server.ts). No network
 * call: the access token and user claims are embedded in the encrypted cookie.
 */
export async function fetchBetterAuthSession(
  cookieHeader?: string,
): Promise<BetterAuthSessionPayload | null> {
  const cookieValue = extractCookieValue(
    await resolveCookieHeader(cookieHeader),
    WEBAPP_SESSION_COOKIE,
  );
  if (!cookieValue) {
    return null;
  }

  const session = await decryptWebappSession(cookieValue);
  if (!session) {
    return null;
  }

  return {
    session: {
      expiresAt: session.accessTokenExpiresAt,
      token: session.accessToken,
      userId: session.user.id,
    },
    user: session.user,
  };
}

/** Returns a JWT access token for API Bearer auth, or null when unauthenticated. */
export async function fetchBetterAuthAccessToken(
  cookieHeader?: string,
  existingSession?: BetterAuthSessionPayload | null,
): Promise<string | null> {
  const session = existingSession ?? (await fetchBetterAuthSession(cookieHeader));
  return session?.session.token ?? null;
}

/**
 * Clears the webapp's own session cookie. Does not touch Better Auth's native
 * cookie on the API's domain — full user-initiated sign-out additionally calls
 * `authClient.signOut()` directly from the browser (see endSession.ts).
 *
 * Best-effort: `cookies()` mutation is only guaranteed to take effect inside a
 * Server Action or Route Handler, not a Server Component render.
 */
export async function signOutBetterAuthSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(WEBAPP_SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  } catch {
    // Best-effort when called during a Server Component render.
  }
}
