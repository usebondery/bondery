export const AUTH_SCHEME = "bondery";

/**
 * Stable custom-scheme URL for Better Auth native callbacks.
 *
 * Do not use `Linking.createURL`. In Expo Dev Client it emits `exp+bondery://`
 * or `http://host/--/path`. The Expo plugin only appends `?cookie=` for
 * non-http(s) URLs whose origin is trusted (`bondery://`).
 */
export function buildNativeAuthDeepLink(scheme: string, path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return `${scheme}://${normalized}`;
}

export function nativeAuthDeepLink(path: string): string {
  return buildNativeAuthDeepLink(AUTH_SCHEME, path);
}
