const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

/** Hostname Expo Metro advertises to the running native app, if any. */
export function metroHostFromHostUri(hostUri: string | undefined): string | null {
  if (!hostUri) {
    return null;
  }

  try {
    const withProtocol = hostUri.includes("://") ? hostUri : `http://${hostUri}`;
    const hostname = new URL(withProtocol).hostname;
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

/**
 * Android cannot reach the host machine at localhost. Prefer the Metro LAN
 * host when Expo provides one. Fall back to the emulator alias 10.0.2.2.
 */
export function resolveAndroidLoopbackHost(metroHost: string | null): string {
  if (metroHost && !LOOPBACK_HOSTS.has(metroHost)) {
    return metroHost;
  }

  return "10.0.2.2";
}

export function rewriteLoopbackHostname(urlValue: string, replacementHost: string): string {
  try {
    const parsed = new URL(urlValue);
    if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
      return urlValue;
    }

    parsed.hostname = replacementHost;
    return parsed.toString();
  } catch {
    return urlValue;
  }
}
