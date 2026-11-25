import { resolveCookieDomain } from "./resolve-cookie-domain.js";

const PATTERN_5C2F2B24_RE = /\/+$/u;
const Z0_Z0_Z0_Z0_Z0_Z0_RE =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/u;
const PATTERN_5E5C647B312C_RE = /^\d{1,3}(?<group1>\.\d{1,3}){3}$/u;

function isValidRpIdOverride(value: string): boolean {
  if (!value || isIpHostname(value) || value.includes("/") || value.includes(":")) {
    return false;
  }

  return Z0_Z0_Z0_Z0_Z0_Z0_RE.test(value);
}

function isIpHostname(hostname: string): boolean {
  if (hostname.includes(":")) {
    return true;
  }

  return PATTERN_5E5C647B312C_RE.test(hostname);
}

export type WebAuthnRpConfig = {
  origin: string;
  rpID: string;
};

export type ResolveWebAuthnRpFailureReason =
  | "ip_hostname"
  | "invalid_rp_id_override"
  | "invalid_webapp_url"
  | "missing_webapp_url";

export type ResolveWebAuthnRpResult =
  | { ok: true; origin: string; rpID: string }
  | { ok: false; reason: ResolveWebAuthnRpFailureReason };

export type ResolveWebAuthnRpInput = {
  /**
   * Optional self-host override when the cookie parent domain is not a valid
   * WebAuthn rpID. Never derived from the API URL.
   */
  rpIdOverride?: string | undefined;
  /** Public webapp origin. Port is preserved on localhost. */
  webappUrl: string | undefined;
};

/**
 * WebAuthn rpID and origin for the webapp page that runs the ceremony.
 *
 * Origin is always the webapp URL (no trailing slash). rpID is the cookie
 * parent domain in hosted/self-host, `localhost` locally, or an optional
 * override. IP hosts are refused — WebAuthn rpID cannot be an IP.
 */
export function resolveWebAuthnRp(input: ResolveWebAuthnRpInput): ResolveWebAuthnRpResult {
  if (!input.webappUrl?.trim()) {
    return { ok: false, reason: "missing_webapp_url" };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.webappUrl.trim());
  } catch {
    return { ok: false, reason: "invalid_webapp_url" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { ok: false, reason: "invalid_webapp_url" };
  }

  if (isIpHostname(hostname)) {
    return { ok: false, reason: "ip_hostname" };
  }

  const origin = `${parsed.protocol}//${parsed.host}`.replace(PATTERN_5C2F2B24_RE, "");
  const override = input.rpIdOverride?.trim().toLowerCase();

  if (override) {
    if (!isValidRpIdOverride(override)) {
      return { ok: false, reason: "invalid_rp_id_override" };
    }

    return { ok: true, origin, rpID: override };
  }

  if (hostname === "localhost") {
    return { ok: true, origin, rpID: "localhost" };
  }

  const rpID = resolveCookieDomain(origin) ?? hostname;
  return { ok: true, origin, rpID };
}
