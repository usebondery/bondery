/**
 * Short-lived cache of successful DAV key verifications.
 *
 * Better Auth 1.7.25 writes the key row twice on every `verifyApiKey` call (ADR 0036). A sync
 * client sends many requests in a burst, so the shell remembers a verified key for 60 seconds.
 *
 * Redis holds two kinds of keys:
 *   bondery:dav:verified:{sha256 of the key}   JSON `{ apiKeyId, referenceId }`
 *   bondery:dav:verified-by-id:{apiKeyId}      the hash above, so revocation can find the entry
 *
 * The key itself never appears in Redis. The cache does not decide who may sign in: the shell
 * still loads the `carddav_devices` row by `apiKeyId` on every request, and that row is the
 * revocation authority. Every path that deletes or rotates a key also calls `forgetKeys`, so a
 * stale entry lasts at most until the next request.
 *
 * Redis errors fail open: a failed read counts as a miss, and a failed write or delete is logged.
 */

import { createHash } from "node:crypto";
import type { Redis } from "ioredis";

const KEY_NAMESPACE = "bondery:dav";

/** How long a verified key stays cached, in seconds. */
const DAV_VERIFY_CACHE_TTL_SECONDS = 60;

type DavVerifyCacheRedis = Pick<Redis, "del" | "get" | "mget" | "set">;

type DavVerifyCacheLogger = { warn: (bindings: object, message: string) => void };

/** What Better Auth reported for a key that verified. */
type CachedVerification = { apiKeyId: string; referenceId: string };

type DavVerifyCache = {
  /** Returns the cached verification for a key, or null on a miss or a Redis error. */
  get: (key: string) => Promise<CachedVerification | null>;
  /** Caches a verification for 60 seconds. */
  remember: (key: string, verification: CachedVerification) => Promise<void>;
  /** Deletes the entries of these keys by their `apikey` ids. */
  forgetKeys: (apiKeyIds: string[]) => Promise<void>;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

function entryName(keyHash: string): string {
  return `${KEY_NAMESPACE}:verified:${keyHash}`;
}

function reverseName(apiKeyId: string): string {
  return `${KEY_NAMESPACE}:verified-by-id:${apiKeyId}`;
}

function parseVerification(value: string | null): CachedVerification | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as CachedVerification).apiKeyId === "string" &&
      typeof (parsed as CachedVerification).referenceId === "string"
    ) {
      const { apiKeyId, referenceId } = parsed as CachedVerification;
      return { apiKeyId, referenceId };
    }
  } catch {
    // A malformed entry is a miss. The next successful verify overwrites it.
  }
  return null;
}

/**
 * @param getRedis Returns the Redis client, or undefined when none is configured.
 * @param log Receives a warning when Redis fails. Never pass credentials to it.
 */
export function createDavVerifyCache(
  getRedis: () => DavVerifyCacheRedis | undefined,
  log: DavVerifyCacheLogger,
): DavVerifyCache {
  return {
    async forgetKeys(apiKeyIds) {
      const redis = getRedis();
      if (!redis || apiKeyIds.length === 0) {
        return;
      }

      try {
        const hashes = await redis.mget(...apiKeyIds.map(reverseName));
        const names = [
          ...apiKeyIds.map(reverseName),
          ...hashes.filter((hash): hash is string => typeof hash === "string").map(entryName),
        ];
        await redis.del(...names);
      } catch (error) {
        log.warn({ err: error }, "dav auth: verify cache delete failed");
      }
    },

    async get(key) {
      const redis = getRedis();
      if (!redis) {
        return null;
      }

      try {
        return parseVerification(await redis.get(entryName(hashKey(key))));
      } catch (error) {
        log.warn({ err: error }, "dav auth: verify cache read failed, verifying the key");
        return null;
      }
    },

    async remember(key, verification) {
      const redis = getRedis();
      if (!redis) {
        return;
      }

      const keyHash = hashKey(key);
      try {
        await redis.set(
          entryName(keyHash),
          JSON.stringify(verification),
          "EX",
          DAV_VERIFY_CACHE_TTL_SECONDS,
        );
        await redis.set(
          reverseName(verification.apiKeyId),
          keyHash,
          "EX",
          DAV_VERIFY_CACHE_TTL_SECONDS,
        );
      } catch (error) {
        log.warn({ err: error }, "dav auth: verify cache write failed");
      }
    },
  };
}

export { DAV_VERIFY_CACHE_TTL_SECONDS, type DavVerifyCache, type DavVerifyCacheRedis };
