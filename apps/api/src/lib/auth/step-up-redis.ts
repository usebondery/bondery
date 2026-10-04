import { randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { BONDERY_STEP_UP_HEADER } from "@bondery/helpers/globals/paths";
import { requireRedisCommands } from "../data/redis.js";
import { forbidden } from "../platform/errors/http-errors.js";

export const STEP_UP_TTL_SECONDS = 10 * 60;
const STEP_UP_REDIS_PREFIX = "bondery:step-up:" as const;

function stepUpKey(userId: string): string {
  return `${STEP_UP_REDIS_PREFIX}${userId}`;
}

export async function mintStepUpToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const redis = requireRedisCommands();
  await redis.set(stepUpKey(userId), token, "EX", STEP_UP_TTL_SECONDS);
  return token;
}

function presentedStepUpToken(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** One-shot GETDEL. Missing, mismatch, expired, and replay all 403. */
export async function consumeStepUpToken(
  userId: string,
  header: string | string[] | undefined,
): Promise<void> {
  const presented = presentedStepUpToken(header);
  if (!presented) {
    throw forbidden("This action needs a recent confirmation", "session_not_fresh");
  }

  const redis = requireRedisCommands();
  const stored = await redis.getdel(stepUpKey(userId));
  if (!stored || stored !== presented) {
    throw forbidden("This action needs a recent confirmation", "session_not_fresh");
  }
}

export async function consumeStepUpHeader(
  userId: string,
  headers: IncomingHttpHeaders,
): Promise<void> {
  await consumeStepUpToken(userId, headers[BONDERY_STEP_UP_HEADER.toLowerCase()]);
}
