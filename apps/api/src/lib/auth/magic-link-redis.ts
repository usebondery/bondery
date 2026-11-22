import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { requireRedisCommands } from "../data/redis.js";
import {
  MAGIC_LINK_EXPIRES_IN_SECONDS,
  MAGIC_LINK_REDIS_PREFIX,
  MAGIC_LINK_SEND_MAX_PER_WINDOW,
  MAGIC_LINK_SEND_WINDOW_SECONDS,
} from "./magic-link-constants.js";

function sendCountKey(emailHash: string): string {
  return `${MAGIC_LINK_REDIS_PREFIX}send:${emailHash}`;
}

function previousIdentifierKey(emailHash: string): string {
  return `${MAGIC_LINK_REDIS_PREFIX}prev:${emailHash}`;
}

/** SHA-256 hex of a normalized email — used only as a Redis key fragment, never logged. */
export function hashMagicLinkEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Matches Better Auth magic-link `storeToken: "hashed"` (`defaultKeyHasher`):
 * SHA-256 of the plaintext token, base64url without padding.
 */
export function hashMagicLinkStoredIdentifier(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/**
 * Caps sign-in emails per hashed address: 8 sends / 15 minutes.
 * Throws a Better Auth APIError so the POST fails with 429.
 */
export async function consumeMagicLinkSendAllowance(emailHash: string): Promise<void> {
  const redis = requireRedisCommands();
  const key = sendCountKey(emailHash);
  await redis.set(key, "0", "EX", MAGIC_LINK_SEND_WINDOW_SECONDS, "NX");
  const count = await redis.incr(key);
  if (count > MAGIC_LINK_SEND_MAX_PER_WINDOW) {
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "TOO_MANY_REQUESTS",
      message: "Too many sign-in emails. Try again in a few minutes.",
    });
  }
}

export async function readPreviousMagicLinkIdentifier(emailHash: string): Promise<string | null> {
  const redis = requireRedisCommands();
  return redis.get(previousIdentifierKey(emailHash));
}

export async function rememberMagicLinkIdentifier(
  emailHash: string,
  storedIdentifier: string,
): Promise<void> {
  const redis = requireRedisCommands();
  await redis.set(
    previousIdentifierKey(emailHash),
    storedIdentifier,
    "EX",
    MAGIC_LINK_EXPIRES_IN_SECONDS,
  );
}
