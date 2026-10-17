export type ResolveWebAuthnAllowedOriginsInput = {
  /** Colon-separated SHA-256 fingerprints from the Android signing certs. */
  androidSha256Fingerprints?: readonly string[] | undefined;
  rpID: string;
  webappOrigin: string;
  websiteUrl?: string | undefined;
};

const SHA256_HEX_LENGTH = 64;

/**
 * WebAuthn `expectedOrigin` list: webapp, native associated-domain host, and
 * Android APK key hashes. rpID stays the webapp cookie parent domain.
 */
export function resolveWebAuthnAllowedOrigins(input: ResolveWebAuthnAllowedOriginsInput): string[] {
  const origins = new Set<string>();
  const webappOrigin = stripTrailingSlash(input.webappOrigin);
  if (webappOrigin) {
    origins.add(webappOrigin);
  }

  const websiteOrigin = parseHttpsOrHttpOrigin(input.websiteUrl);
  if (websiteOrigin && shouldIncludeWebsiteOrigin(websiteOrigin, webappOrigin, input.rpID)) {
    origins.add(websiteOrigin);
  }

  for (const fingerprint of input.androidSha256Fingerprints ?? []) {
    const origin = toAndroidApkKeyHashOrigin(fingerprint);
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins];
}

/**
 * Parse comma-separated Android SHA-256 fingerprints into colon-hex form.
 * Invalid fragments are dropped.
 */
export function parseAndroidSha256CertFingerprints(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  const fingerprints: string[] = [];
  for (const part of value.split(",")) {
    const normalized = normalizeSha256Fingerprint(part);
    if (normalized) {
      fingerprints.push(normalized);
    }
  }
  return fingerprints;
}

/** Android WebAuthn origin `android:apk-key-hash:<base64url(sha256)>`. */
export function toAndroidApkKeyHashOrigin(fingerprint: string): string | null {
  const normalized = normalizeSha256Fingerprint(fingerprint);
  if (!normalized) {
    return null;
  }

  const bytes = Buffer.from(normalized.replaceAll(":", ""), "hex");
  return `android:apk-key-hash:${bytes.toString("base64url")}`;
}

export function normalizeSha256Fingerprint(value: string): string | null {
  const hex = value.trim().replaceAll(":", "").toUpperCase();
  if (hex.length !== SHA256_HEX_LENGTH || !/^[0-9A-F]+$/.test(hex)) {
    return null;
  }

  const pairs = hex.match(/.{2}/g);
  return pairs ? pairs.join(":") : null;
}

function shouldIncludeWebsiteOrigin(
  websiteOrigin: string,
  webappOrigin: string,
  rpID: string,
): boolean {
  if (websiteOrigin === webappOrigin) {
    return false;
  }

  let hostname: string;
  try {
    hostname = new URL(websiteOrigin).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (!hostname || hostname === "localhost" || isIpHostname(hostname)) {
    return false;
  }

  return hostname === rpID.toLowerCase() || hostname.endsWith(`.${rpID.toLowerCase()}`);
}

function parseHttpsOrHttpOrigin(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    if (!parsed.hostname) {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isIpHostname(hostname: string): boolean {
  if (hostname.includes(":")) {
    return true;
  }

  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}
