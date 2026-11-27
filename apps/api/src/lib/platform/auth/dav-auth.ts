/**
 * HTTP Basic authentication for the CardDAV shell (`davRoutes`).
 *
 * The username is the user's UUID and the password is a `bondery_dav_` device key. The shell
 * accepts nothing else: no session, cookie, OAuth token, or REST API key. A DAV key in turn is
 * never accepted by REST, because `verifyAuth` verifies against `configId: "default"`.
 *
 * Every failure answers 401 with the Basic challenge and an empty body, so a client can
 * prompt for credentials. A request with no `Authorization` header is the normal first probe
 * of a DAV client and does not count as a failed login.
 *
 * Nothing here logs the `Authorization` header, the username, or the key.
 */

import { prisma } from "@bondery/db";
import { CARDDAV_KEY_PREFIX } from "@bondery/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../../auth/index.js";
import { getRedisCommands } from "../../data/redis.js";
import { constantTimeEqual } from "../security/constant-time-equal.js";
import { createDavLoginGuard, type DavGuardRedis } from "./dav-login-guard.js";
import {
  createDavVerifyCache,
  type DavVerifyCache,
  type DavVerifyCacheRedis,
} from "./dav-verify-cache.js";

const DAV_AUTH_CHALLENGE = 'Basic realm="Bondery", charset="UTF-8"';
const BASIC_SCHEME_PATTERN = /^basic\s+(\S+)\s*$/i;

/** Better Auth error codes that mean the key will never verify. */
const PERMANENT_REJECTION_CODES = new Set(["KEY_DISABLED", "KEY_NOT_FOUND"]);

declare module "fastify" {
  // biome-ignore lint/suspicious/noShadow: module augmentation must reuse fastify's own interface name to merge with it
  interface FastifyRequest {
    /** Set by the CardDAV shell once the device key verified. */
    davDevice: {
      id: string;
      userId: string;
      apiKeyId: string;
      pausedAt: Date | null;
      vcardVersion: string;
    } | null;
  }
}

/** The Redis commands the shell uses: the login guard and the verify cache. */
type DavAuthRedis = DavGuardRedis & DavVerifyCacheRedis;

type DavAuthLogger = { warn: (bindings: object, message: string) => void };

let redisProvider: () => DavAuthRedis | undefined = () => getRedisCommands();

type BasicCredentials = { password: string; username: string };

/** Decodes `Authorization: Basic …`. Returns null for a missing or malformed header. */
function parseBasicCredentials(header: string | undefined): BasicCredentials | null {
  const encoded = header ? BASIC_SCHEME_PATTERN.exec(header)?.[1] : undefined;
  if (!encoded) {
    return null;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return { password: decoded.slice(separator + 1), username: decoded.slice(0, separator) };
}

function challenge(reply: FastifyReply): FastifyReply {
  return reply.code(401).header("WWW-Authenticate", DAV_AUTH_CHALLENGE).send();
}

/**
 * Better Auth answers `INVALID_API_KEY` both for an unknown key and, from a catch-all, for an
 * unexpected failure such as a database error. Only the first carries a string message, so a
 * transient error is never cached as a rejection.
 */
function isPermanentRejection(error: { code?: unknown; message?: unknown } | null): boolean {
  if (!error || typeof error.code !== "string") {
    return false;
  }
  if (PERMANENT_REJECTION_CODES.has(error.code)) {
    return true;
  }
  return error.code === "INVALID_API_KEY" && typeof error.message === "string";
}

type VerifiedDevice = NonNullable<FastifyRequest["davDevice"]> & { email: string };

type Verification =
  | { device: VerifiedDevice; ok: true }
  | { isPermanentRejection: boolean; ok: false };

type VerifiedKey = { apiKeyId: string; referenceId: string };

type KeyVerification =
  | { key: VerifiedKey; ok: true }
  | { isPermanentRejection: boolean; ok: false };

/**
 * Verifies the key with Better Auth, or answers from the verify cache. A cache hit skips the
 * Better Auth call and its two key-row writes. Nothing here decides access on its own: the
 * caller still loads the device row, which is deleted when the key is revoked.
 */
async function verifyKey(key: string, cache: DavVerifyCache): Promise<KeyVerification> {
  const cached = await cache.get(key);
  if (cached) {
    return { key: cached, ok: true };
  }

  const verification = await auth.api.verifyApiKey({ body: { configId: "carddav", key } });
  if (!(verification.valid && verification.key)) {
    return { isPermanentRejection: isPermanentRejection(verification.error), ok: false };
  }

  const verified = {
    apiKeyId: verification.key.id,
    referenceId: verification.key.referenceId,
  };
  await cache.remember(key, verified);
  return { key: verified, ok: true };
}

async function verifyCredentials(
  credentials: BasicCredentials,
  cache: DavVerifyCache,
): Promise<Verification> {
  if (!credentials.password.startsWith(CARDDAV_KEY_PREFIX)) {
    return { isPermanentRejection: false, ok: false };
  }

  const keyVerification = await verifyKey(credentials.password, cache);
  if (!keyVerification.ok) {
    return keyVerification;
  }

  const { apiKeyId, referenceId } = keyVerification.key;
  if (!constantTimeEqual(credentials.username, referenceId)) {
    return { isPermanentRejection: false, ok: false };
  }

  const device = await prisma.carddavDevice.findUnique({
    select: {
      id: true,
      pausedAt: true,
      user: { select: { email: true } },
      userId: true,
      vcardVersion: true,
    },
    where: { apiKeyId },
  });
  // A key with no device row is an orphan. The next sign-in attempt costs one lookup again,
  // so it is not cached as a rejection.
  if (!device || device.userId !== referenceId) {
    return { isPermanentRejection: false, ok: false };
  }

  return {
    device: {
      apiKeyId,
      email: device.user.email,
      id: device.id,
      pausedAt: device.pausedAt,
      userId: device.userId,
      vcardVersion: device.vcardVersion,
    },
    ok: true,
  };
}

/** Exposes the verified device to the handlers and to the rate limiter. */
function applyVerifiedDevice(request: FastifyRequest, device: VerifiedDevice): void {
  request.davDevice = {
    apiKeyId: device.apiKeyId,
    id: device.id,
    pausedAt: device.pausedAt,
    userId: device.userId,
    vcardVersion: device.vcardVersion,
  };
  request.authUser = { email: device.email, id: device.userId };
  request.authApiKey = null;
}

/** @internal Test-only. Replaces the Redis client with a fake. Pass nothing to restore. */
export function setDavAuthRedisForTests(provider?: () => DavAuthRedis | undefined): void {
  redisProvider = provider ?? (() => getRedisCommands());
}

/**
 * Deletes the cached verifications of these keys. Call it after a key is deleted or rotated,
 * with the `apikey` ids. Never throws: the device row already stops a revoked key, so a Redis
 * failure only leaves a harmless entry that expires within 60 seconds.
 */
export async function forgetDavKeys(apiKeyIds: string[], log: DavAuthLogger): Promise<void> {
  await createDavVerifyCache(redisProvider, log).forgetKeys(apiKeyIds);
}

/** Builds the `verifyDavAuth` strategy. Runs in `onRequest`, before the body is parsed. */
export function createVerifyDavAuth() {
  return async function verifyDavAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> {
    const credentials = parseBasicCredentials(request.headers.authorization);
    if (!credentials) {
      return challenge(reply);
    }

    const guard = createDavLoginGuard(redisProvider, request.log);
    const subject = { ip: request.ip, username: credentials.username };

    const state = await guard.inspect({ ...subject, key: credentials.password });
    if (state.retryAfterSeconds !== null) {
      return reply.code(429).header("Retry-After", state.retryAfterSeconds).send();
    }
    if (state.isKeyRejected) {
      await guard.recordFailure(subject);
      return challenge(reply);
    }

    const cache = createDavVerifyCache(redisProvider, request.log);
    const result = await verifyCredentials(credentials, cache);
    if (!result.ok) {
      await guard.recordFailure(subject);
      if (result.isPermanentRejection) {
        await guard.rememberRejectedKey(credentials.password);
      }
      return challenge(reply);
    }

    applyVerifiedDevice(request, result.device);
    return undefined;
  };
}
