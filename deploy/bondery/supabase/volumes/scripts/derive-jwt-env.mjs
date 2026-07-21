#!/usr/bin/env node
/**
 * Derive Supabase asymmetric JWT env from operator secrets.
 * Run once at setup (or when rotating keys), paste output into Dokploy / .env:
 *
 *   node derive-jwt-env.mjs --print
 *
 * Map output keys to BONDERY_SUPABASE_* env vars (see deploy/bondery/.env.example).
 */

import { createPrivateKey, sign } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function signEs256Jwt(privateJwk, payload) {
  const kid = privateJwk.kid;
  if (!kid || !privateJwk.d) {
    throw new Error("Signing JWK must include kid and private component d");
  }
  const header = { alg: "ES256", kid, typ: "JWT" };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${b64Header}.${b64Payload}`;
  const key = createPrivateKey({ format: "jwk", key: privateJwk });
  const signature = sign("SHA256", Buffer.from(data), {
    dsaEncoding: "ieee-p1363",
    key,
  }).toString("base64url");
  return `${data}.${signature}`;
}

export function deriveSupabaseJwtEnv(signingJwkJson, jwtSecret) {
  let privateJwk;
  try {
    privateJwk = JSON.parse(signingJwkJson);
  } catch {
    throw new Error("BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK must be valid JSON");
  }
  if (privateJwk.alg !== "ES256" || !privateJwk.kid || !privateJwk.d) {
    throw new Error(
      "BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK must be an ES256 private JWK with kid and d",
    );
  }
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("BONDERY_PRIVATE_SUPABASE_JWT_SECRET must be at least 32 characters");
  }

  const octKey = {
    alg: "HS256",
    k: Buffer.from(jwtSecret, "utf8").toString("base64url"),
    kty: "oct",
  };

  const signingEcJwk = {
    alg: "ES256",
    crv: privateJwk.crv,
    d: privateJwk.d,
    ext: true,
    key_ops: ["sign", "verify"],
    kid: privateJwk.kid,
    kty: "EC",
    use: "sig",
    x: privateJwk.x,
    y: privateJwk.y,
  };

  const publicEcJwk = {
    alg: "ES256",
    crv: privateJwk.crv,
    ext: true,
    key_ops: ["verify"],
    kid: privateJwk.kid,
    kty: "EC",
    use: "sig",
    x: privateJwk.x,
    y: privateJwk.y,
  };

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 5 * 365 * 24 * 3600;
  const anonKeyAsymmetric = signEs256Jwt(privateJwk, {
    exp,
    iat,
    iss: "supabase",
    role: "anon",
  });
  const serviceRoleKeyAsymmetric = signEs256Jwt(privateJwk, {
    exp,
    iat,
    iss: "supabase",
    role: "service_role",
  });

  const gotrueJwtKeys = JSON.stringify([signingEcJwk, octKey]);
  const jwtJwks = JSON.stringify({ keys: [publicEcJwk, octKey] });

  return {
    ANON_KEY_ASYMMETRIC: anonKeyAsymmetric,
    API_JWT_JWKS: jwtJwks,
    GOTRUE_JWT_KEYS: gotrueJwtKeys,
    JWT_JWKS: jwtJwks,
    PGRST_JWT_SECRET: jwtJwks,
    SERVICE_ROLE_KEY_ASYMMETRIC: serviceRoleKeyAsymmetric,
  };
}

function envFileLine(key, value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${key}="${escaped}"`;
}

function formatEnvFile(derived) {
  return [
    "# Paste into deploy/bondery/.env or Dokploy Environment (set once; re-run after key rotation)",
    envFileLine("BONDERY_SUPABASE_JWT_KEYS", derived.GOTRUE_JWT_KEYS),
    envFileLine("BONDERY_SUPABASE_JWT_JWKS", derived.JWT_JWKS),
    envFileLine("BONDERY_SUPABASE_ANON_KEY_ASYMMETRIC", derived.ANON_KEY_ASYMMETRIC),
    envFileLine(
      "BONDERY_SUPABASE_SERVICE_ROLE_KEY_ASYMMETRIC",
      derived.SERVICE_ROLE_KEY_ASYMMETRIC,
    ),
    "",
  ].join("\n");
}

function main() {
  const signingJwk = process.env.BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK;
  const jwtSecret = process.env.BONDERY_PRIVATE_SUPABASE_JWT_SECRET;

  if (!signingJwk || !jwtSecret) {
    console.error(
      "Required: BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK, BONDERY_PRIVATE_SUPABASE_JWT_SECRET",
    );
    process.exit(1);
  }

  const derived = deriveSupabaseJwtEnv(signingJwk, jwtSecret);
  const output = formatEnvFile(derived);
  const target = process.argv[2];

  if (target === "--print") {
    process.stdout.write(output);
    return;
  }

  if (!target) {
    console.error("Usage: node derive-jwt-env.mjs <output-path> | --print");
    process.exit(1);
  }

  writeFileSync(target, output, { mode: 0o600 });
  const kid = JSON.parse(signingJwk).kid;
  console.log(`Wrote ${target} (kid=${kid})`);
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
