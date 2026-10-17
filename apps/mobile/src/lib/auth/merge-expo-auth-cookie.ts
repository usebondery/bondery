import { getSetCookie } from "@better-auth/expo/client";

/** Merge a `Set-Cookie` header into the Expo cookie JSON store. */
export function mergeExpoAuthCookieStore(
  setCookieHeader: string,
  previousCookieJson: string | null,
): string {
  return getSetCookie(setCookieHeader, previousCookieJson ?? undefined);
}
