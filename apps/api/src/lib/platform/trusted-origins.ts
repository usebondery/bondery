const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const CHROME_EXTENSION_ID = /^[a-p]{32}$/;

export function chromeExtensionOrigin(extensionId: string | undefined): string | undefined {
  const id = extensionId?.trim();
  if (!id || !CHROME_EXTENSION_ID.test(id)) {
    return undefined;
  }
  return `chrome-extension://${id}`;
}

export function parseExtraAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveTrustedOrigins(options: {
  webappUrl?: string;
  websiteUrl?: string;
  extraAllowedOrigins?: string;
  chromeExtensionId?: string;
  /** When true, allow any localhost / 127.0.0.1 port (Cursor port-forward, Expo, etc.). */
  allowLocalDevOrigins?: boolean;
}): string[] {
  const origins = [
    options.webappUrl?.replace(/\/+$/, ""),
    options.websiteUrl?.replace(/\/+$/, ""),
    "bondery://",
    chromeExtensionOrigin(options.chromeExtensionId),
    ...parseExtraAllowedOrigins(options.extraAllowedOrigins),
  ].filter((value): value is string => Boolean(value));

  if (options.allowLocalDevOrigins) {
    // Better Auth wildcard patterns — dev only. Covers non-default webapp ports
    // (e.g. Cursor-forwarded localhost:49171) without listing every port in env.
    origins.push(
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://localhost:*",
      "https://127.0.0.1:*",
      // Expo Go. The expo() plugin also adds this when NODE_ENV is development.
      "exp://",
      // Expo Dev Client `expo-origin` / leftover createURL callbacks.
      "exp+bondery://",
    );
  }

  return [...new Set(origins)];
}

export function isAllowedRequestOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (
    allowedOrigins.some(
      (allowed) => allowed.includes("*") && originMatchesWildcard(origin, allowed),
    )
  ) {
    return true;
  }

  return (
    LOCAL_DEV_ORIGIN.test(origin) &&
    allowedOrigins.some(
      (allowed) => allowed.includes("localhost:*") || allowed.includes("127.0.0.1:*"),
    )
  );
}

function originMatchesWildcard(origin: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return origin === pattern;
  }

  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(origin);
}

/** Shared env-derived allowlist for CORS, Better Auth trustedOrigins, and WS origin checks. */
export function resolveRuntimeTrustedOrigins(): string[] {
  return resolveTrustedOrigins({
    allowLocalDevOrigins: process.env.NODE_ENV !== "production",
    chromeExtensionId: process.env.BONDERY_INFRA_CHROME_EXTENSION_ID,
    extraAllowedOrigins: process.env.BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS,
    webappUrl: process.env.BONDERY_PUBLIC_WEBAPP_URL,
    websiteUrl: process.env.BONDERY_PUBLIC_WEBSITE_URL,
  });
}

/**
 * Better Auth responses are written via `reply.hijack()` + `setResponse`, which
 * bypasses @fastify/cors's normal reply pipeline. Merge CORS headers onto the
 * Fetch Response before it hits the raw socket.
 */
export function withCorsHeaders(
  request: { headers: { origin?: string | string[] } },
  response: Response,
  allowedOrigins: string[],
): Response {
  const originHeader = request.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (!origin || !isAllowedRequestOrigin(origin, allowedOrigins)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");

  const existingVary = headers.get("Vary");
  if (existingVary) {
    if (
      !existingVary
        .split(",")
        .map((value) => value.trim())
        .includes("Origin")
    ) {
      headers.set("Vary", `${existingVary}, Origin`);
    }
  } else {
    headers.set("Vary", "Origin");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
