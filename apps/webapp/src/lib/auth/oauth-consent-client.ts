export function isOAuthClientMetadataUrl(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function oauthClientHostname(clientId: string): string {
  try {
    return new URL(clientId).hostname;
  } catch {
    return clientId;
  }
}

export function isLoopbackOAuthHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function redirectUriIsLoopback(redirectUri: string): boolean {
  return isLoopbackOAuthHostname(oauthClientHostname(redirectUri));
}

export function isFirstPartyOAuthClient(
  clientId: string,
  options: { chromeExtensionClientId: string; webappClientId: string },
): boolean {
  if (options.webappClientId && clientId === options.webappClientId) {
    return true;
  }
  return Boolean(options.chromeExtensionClientId && clientId === options.chromeExtensionClientId);
}

export function resolveFirstPartyConsentClientName(
  clientId: string,
  options: {
    chromeExtensionClientId: string;
    chromeExtensionName: string;
    unknownName: string;
    webappClientId: string;
    webappName: string;
  },
): string {
  if (options.webappClientId && clientId === options.webappClientId) {
    return options.webappName;
  }
  if (options.chromeExtensionClientId && clientId === options.chromeExtensionClientId) {
    return options.chromeExtensionName;
  }
  return options.unknownName;
}

/** Opaque client id or CIMD URL: prefer the registered name, then the metadata hostname. */
export function resolveThirdPartyConsentClientDisplay(
  clientId: string,
  fetchedName: string | null,
  unknownName: string,
): { hostname?: string; name: string } {
  const hostname = isOAuthClientMetadataUrl(clientId) ? oauthClientHostname(clientId) : undefined;
  if (fetchedName) {
    return hostname ? { hostname, name: fetchedName } : { name: fetchedName };
  }
  if (hostname) {
    return { hostname, name: hostname };
  }
  return { name: unknownName };
}

export function readOAuthPublicClientName(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const nested = record.client;
  if (nested && typeof nested === "object") {
    const client = nested as { client_name?: unknown; name?: unknown };
    const nestedName = client.client_name ?? client.name;
    if (typeof nestedName === "string" && nestedName.trim()) {
      return nestedName.trim();
    }
  }

  const name = record.client_name ?? record.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
