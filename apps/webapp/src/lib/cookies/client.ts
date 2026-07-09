const DEFAULT_MAX_AGE = 31_536_000; // 1 year

export type SetClientCookieOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
};

/**
 * Writes a client-visible cookie via the Cookie Store API.
 * Requires browsers that support window.cookieStore (see root browserslist).
 */
export async function setClientCookie(
  name: string,
  value: string,
  { maxAge = DEFAULT_MAX_AGE, path = "/", sameSite = "lax" }: SetClientCookieOptions = {},
): Promise<void> {
  await cookieStore.set({ maxAge, name, path, sameSite, value });
}
