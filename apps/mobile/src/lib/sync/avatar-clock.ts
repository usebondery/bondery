/** Returns an epoch-ms cache-bust token, or null when the clock is missing or not a date. */
export function toCacheBustToken(value: string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

/** Recover the server avatar clock from a `?t=` cache-bust token (epoch ms). */
export function parseAvatarUpdatedAtFromUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) {
    return null;
  }
  const match = /[?&]t=(\d+)\b/.exec(avatarUrl);
  if (!match) {
    return null;
  }
  const ms = Number(match[1]);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}
