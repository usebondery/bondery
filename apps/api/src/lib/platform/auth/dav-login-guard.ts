/**
 * Failed-login limiter and rejected-key cache for the CardDAV shell.
 *
 * Redis holds three kinds of short-lived keys:
 *   bondery:dav:fail:ip:{ip}       failed logins from one address
 *   bondery:dav:fail:user:{hash}   failed logins naming one username
 *   bondery:dav:rejected:{hash}    a key that Better Auth reported as not found or disabled
 *
 * Usernames and keys never appear in a Redis key in clear text. A username is
 * attacker input of any length, and a key is a credential.
 *
 * Redis errors fail open. Keys carry 64 random characters, so a missing counter does not make
 * guessing feasible, and a Redis outage must not lock every device out of its address book.
 */

import { createHash } from "node:crypto";
import type { Redis } from "ioredis";

const KEY_NAMESPACE = "bondery:dav";
/** Hex characters of a SHA-256 digest kept in a Redis key. */
const HASH_LENGTH = 32;

const OPEN_STATE: DavLoginState = { isKeyRejected: false, retryAfterSeconds: null };

/** Failed logins allowed per address and per username inside one window. */
const DAV_FAILED_LOGIN_LIMIT = 20;
/** Length of the failed-login window, in seconds. */
const DAV_FAILED_LOGIN_WINDOW_SECONDS = 60;
/** How long a rejected key hash stays cached, in seconds. */
const DAV_REJECTED_KEY_TTL_SECONDS = 300;

type DavGuardRedis = Pick<Redis, "expire" | "incr" | "mget" | "set" | "ttl">;

type DavGuardLogger = { warn: (bindings: object, message: string) => void };

type DavLoginState = {
  /** The key was rejected as not found or disabled within the cache window. */
  isKeyRejected: boolean;
  /** Seconds to wait when a limit is reached, else `null`. */
  retryAfterSeconds: number | null;
};

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, HASH_LENGTH);
}

function failureKeys(input: { ip: string; username: string }): { ip: string; user: string } {
  return {
    ip: `${KEY_NAMESPACE}:fail:ip:${input.ip}`,
    user: `${KEY_NAMESPACE}:fail:user:${digest(input.username)}`,
  };
}

function rejectedKeyName(key: string): string {
  return `${KEY_NAMESPACE}:rejected:${digest(key)}`;
}

function isAtLimit(count: string | null): boolean {
  return count !== null && Number(count) >= DAV_FAILED_LOGIN_LIMIT;
}

type DavLoginGuard = {
  /** Reads both failure counters and the rejected-key flag in one round trip. */
  inspect: (input: { ip: string; key: string; username: string }) => Promise<DavLoginState>;
  /** Counts one failed login against the address and the username. */
  recordFailure: (input: { ip: string; username: string }) => Promise<void>;
  /** Remembers a key that Better Auth reported as not found or disabled. */
  rememberRejectedKey: (key: string) => Promise<void>;
};

/** Longest remaining TTL among the limited counters, at least one second. */
async function resolveRetryAfter(redis: DavGuardRedis, names: string[]): Promise<number> {
  const ttls = await Promise.all(names.map((name) => redis.ttl(name)));
  return Math.max(1, ...ttls);
}

/**
 * @param getRedis Returns the Redis client, or undefined when none is configured.
 * @param log Receives a warning when Redis fails. Never pass credentials to it.
 */
export function createDavLoginGuard(
  getRedis: () => DavGuardRedis | undefined,
  log: DavGuardLogger,
): DavLoginGuard {
  return {
    async inspect({ ip, key, username }) {
      const redis = getRedis();
      if (!redis) {
        return OPEN_STATE;
      }

      const names = failureKeys({ ip, username });
      try {
        const [ipCount, userCount, rejected] = await redis.mget(
          names.ip,
          names.user,
          rejectedKeyName(key),
        );
        const isLimited = isAtLimit(ipCount ?? null) || isAtLimit(userCount ?? null);
        const retryAfterSeconds = isLimited
          ? await resolveRetryAfter(redis, [
              ...(isAtLimit(ipCount ?? null) ? [names.ip] : []),
              ...(isAtLimit(userCount ?? null) ? [names.user] : []),
            ])
          : null;
        return { isKeyRejected: rejected !== null && rejected !== undefined, retryAfterSeconds };
      } catch (error) {
        log.warn({ err: error }, "dav auth: failed-login lookup failed, continuing");
        return OPEN_STATE;
      }
    },

    async recordFailure({ ip, username }) {
      const redis = getRedis();
      if (!redis) {
        return;
      }

      const names = failureKeys({ ip, username });
      try {
        for (const name of [names.ip, names.user]) {
          const count = await redis.incr(name);
          if (count === 1) {
            await redis.expire(name, DAV_FAILED_LOGIN_WINDOW_SECONDS);
          }
        }
      } catch (error) {
        log.warn({ err: error }, "dav auth: failed-login counter write failed");
      }
    },

    async rememberRejectedKey(key) {
      const redis = getRedis();
      if (!redis) {
        return;
      }

      try {
        await redis.set(rejectedKeyName(key), "1", "EX", DAV_REJECTED_KEY_TTL_SECONDS);
      } catch (error) {
        log.warn({ err: error }, "dav auth: rejected-key cache write failed");
      }
    },
  };
}

export {
  DAV_FAILED_LOGIN_LIMIT,
  DAV_FAILED_LOGIN_WINDOW_SECONDS,
  DAV_REJECTED_KEY_TTL_SECONDS,
  type DavGuardRedis,
};
