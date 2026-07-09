/**
 * API key generation, hashing, and validation.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { API_KEY_PREFIX, type ApiKeyPermission } from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importJWK, type JWK, SignJWT } from "jose";
import sha3 from "js-sha3";

const KEY_ID_BYTES = 9;
const SECRET_BYTES = 24;

export interface ParsedApiKeyToken {
  fullKey: string;
  keyId: string;
  secret: string;
}

export interface ValidatedApiKey {
  id: string;
  label: string;
  permission: ApiKeyPermission;
  userId: string;
}

interface JwtSigningMaterial {
  key: CryptoKey;
  kid: string;
}

let cachedSigningMaterial: { jwkJson: string; material: JwtSigningMaterial } | null = null;

export function isApiKeyBearerToken(token: string | undefined): boolean {
  return typeof token === "string" && token.startsWith(API_KEY_PREFIX);
}

/**
 * Local Supabase Auth issues JWTs with iss `http://127.0.0.1:<port>/auth/v1`.
 * Normalize localhost → 127.0.0.1 so minted API-key JWTs pass Auth verification.
 */
export function supabaseAuthIssuerUrl(supabaseUrl: string): string {
  const base = supabaseUrl
    .trim()
    .replace(/\/$/, "")
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1")
    .replace(/^https:\/\/localhost(?=[:/]|$)/i, "https://127.0.0.1");
  return `${base}/auth/v1`;
}

export function parseApiKeyToken(token: string): ParsedApiKeyToken | null {
  if (!token.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const remainder = token.slice(API_KEY_PREFIX.length);
  const underscoreIndex = remainder.indexOf("_");
  if (underscoreIndex <= 0) {
    return null;
  }

  const keyId = remainder.slice(0, underscoreIndex);
  const secret = remainder.slice(underscoreIndex + 1);
  if (!keyId || !secret) {
    return null;
  }

  return {
    fullKey: token,
    keyId,
    secret,
  };
}

export function hashApiKey(fullKey: string, pepper: string): string {
  return sha3.sha3_256(pepper + fullKey);
}

function randomUrlSafeString(byteLength: number): string {
  return randomBytes(byteLength)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, Math.ceil((byteLength * 4) / 3));
}

export function generateApiKeyMaterial(): {
  keyId: string;
  secret: string;
  fullKey: string;
} {
  let keyId: string;
  let secret: string;
  let fullKey: string;
  do {
    keyId = randomUrlSafeString(KEY_ID_BYTES);
    secret = randomUrlSafeString(SECRET_BYTES);
    fullKey = `${API_KEY_PREFIX}${keyId}_${secret}`;
  } while (keyId.includes("_"));
  return { fullKey, keyId, secret };
}

export function formatApiKeyPrefix(keyId: string, secret: string): string {
  const suffix = secret.length >= 4 ? secret.slice(-4) : secret;
  return `${API_KEY_PREFIX}${keyId}…${suffix}`;
}

export interface JwksVerificationResult {
  envKid: string | null;
  jwksFetchError: string | null;
  jwksKids: string[];
  message: string | null;
  ok: boolean;
}

/**
 * Ensure the API's signing JWK matches what Supabase Auth / PostgREST expose via JWKS.
 * A kid mismatch produces PGRST301 ("No suitable key or wrong key type") on REST calls.
 */
export async function verifyJwtSigningJwkAgainstJwks(
  jwkJson: string,
  issuerUrl: string,
): Promise<JwksVerificationResult> {
  let envKid: string | null = null;
  let envX: string | null = null;
  try {
    const jwk = JSON.parse(jwkJson) as JWK;
    envKid = typeof jwk.kid === "string" ? jwk.kid : null;
    envX = typeof jwk.x === "string" ? jwk.x : null;
  } catch {
    return {
      envKid: null,
      jwksFetchError: null,
      jwksKids: [],
      message: "PRIVATE_SUPABASE_JWT_SIGNING_JWK must be valid JSON",
      ok: false,
    };
  }

  if (!envKid) {
    return {
      envKid: null,
      jwksFetchError: null,
      jwksKids: [],
      message: "PRIVATE_SUPABASE_JWT_SIGNING_JWK must include kid",
      ok: false,
    };
  }

  let jwksKids: string[] = [];
  let jwksKeys: Array<{ kid?: string; x?: string }> = [];
  try {
    const response = await fetch(`${issuerUrl}/.well-known/jwks.json`);
    if (!response.ok) {
      return {
        envKid,
        jwksFetchError: `HTTP ${response.status}`,
        jwksKids: [],
        message: `Could not fetch JWKS from ${issuerUrl}/.well-known/jwks.json (HTTP ${response.status})`,
        ok: false,
      };
    }
    const jwks = (await response.json()) as {
      keys?: Array<{ kid?: string; x?: string }>;
    };
    jwksKeys = jwks.keys ?? [];
    jwksKids = jwksKeys.map((key) => key.kid).filter(Boolean) as string[];
  } catch (error) {
    const jwksFetchError = error instanceof Error ? error.message : String(error);
    return {
      envKid,
      jwksFetchError,
      jwksKids: [],
      message: `Could not fetch JWKS from ${issuerUrl}/.well-known/jwks.json: ${jwksFetchError}`,
      ok: false,
    };
  }

  const matchingKey = jwksKeys.find((key) => key.kid === envKid);
  if (!matchingKey) {
    return {
      envKid,
      jwksFetchError: null,
      jwksKids,
      message:
        `PRIVATE_SUPABASE_JWT_SIGNING_JWK kid "${envKid}" is not in Supabase JWKS ` +
        `(${jwksKids.length ? jwksKids.join(", ") : "no keys"}). ` +
        "Copy the first object from apps/supabase-db/supabase/signing_keys.json into the env var.",
      ok: false,
    };
  }

  if (envX && matchingKey.x && matchingKey.x !== envX) {
    return {
      envKid,
      jwksFetchError: null,
      jwksKids,
      message:
        `PRIVATE_SUPABASE_JWT_SIGNING_JWK kid "${envKid}" is in JWKS but the public x coordinate does not match. ` +
        "Re-copy the private JWK from signing_keys.json.",
      ok: false,
    };
  }

  return {
    envKid,
    jwksFetchError: null,
    jwksKids,
    message: null,
    ok: true,
  };
}

export async function loadJwtSigningMaterial(jwkJson: string): Promise<JwtSigningMaterial> {
  if (cachedSigningMaterial?.jwkJson === jwkJson) {
    return cachedSigningMaterial.material;
  }

  let jwk: JWK;
  try {
    jwk = JSON.parse(jwkJson) as JWK;
  } catch {
    throw new Error("PRIVATE_SUPABASE_JWT_SIGNING_JWK must be valid JSON");
  }

  if (jwk.alg !== "ES256") {
    throw new Error("PRIVATE_SUPABASE_JWT_SIGNING_JWK must use alg ES256");
  }
  if (!jwk.kid || typeof jwk.kid !== "string") {
    throw new Error("PRIVATE_SUPABASE_JWT_SIGNING_JWK must include kid");
  }
  if (!jwk.d) {
    throw new Error("PRIVATE_SUPABASE_JWT_SIGNING_JWK must be a private key (include d)");
  }

  // Supabase CLI includes key_ops: ["sign","verify"], which Node's Web Crypto
  // rejects when importing a private ECDSA key for signing only.
  const { key_ops: _keyOps, ext: _ext, use: _use, ...signingJwk } = jwk;
  const importedKey = await importJWK(signingJwk, "ES256");
  if (!(importedKey instanceof CryptoKey)) {
    throw new Error("PRIVATE_SUPABASE_JWT_SIGNING_JWK must be an ECDSA private key");
  }
  const material = { key: importedKey, kid: jwk.kid };
  cachedSigningMaterial = { jwkJson, material };
  return material;
}

export async function validateApiKey(
  adminClient: SupabaseClient<Database>,
  fullKey: string,
  pepper: string,
): Promise<ValidatedApiKey | null> {
  const parsed = parseApiKeyToken(fullKey);
  if (!parsed) {
    return null;
  }

  const providedHash = hashApiKey(parsed.fullKey, pepper);
  const { data, error } = await adminClient.rpc("authenticate_api_key", {
    p_key_id: parsed.keyId,
    p_provided_hash: providedHash,
  });

  if (error || !data?.length) {
    return null;
  }

  const [row] = data;
  if (!row) {
    return null;
  }

  const permission = row.permission === "read" ? "read" : "full";

  return {
    id: row.id,
    label: row.label,
    permission,
    userId: row.user_id,
  };
}

export function constantTimeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Mint a short-lived Supabase-compatible JWT for RLS-scoped API handlers.
 * Never exposed to clients — used only inside the API process per request.
 */
export async function mintSupabaseUserAccessToken(
  userId: string,
  signingJwkJson: string,
  issuerUrl: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { key, kid } = await loadJwtSigningMaterial(signingJwkJson);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    role: "authenticated",
    sub: userId,
  })
    .setProtectedHeader({ alg: "ES256", kid, typ: "JWT" })
    .setIssuer(issuerUrl)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(key);
}
