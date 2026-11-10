/**
 * Optional `Idempotency-Key` for authenticated POST and PATCH.
 * Auth runs in onRequest, so this preHandler sees `request.authUser`.
 * Each SQL call is its own statement. The handler does not hold a transaction.
 */

import { createHash } from "node:crypto";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@bondery/db";
import { IDEMPOTENCY_KEY_HEADER } from "@bondery/helpers/globals/paths";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DomainError } from "../../domains/_shared/context.js";
import { badRequest, conflict, internal } from "./errors/http-errors.js";
import { mapErrorToResponse } from "./errors/map-to-response.js";
import {
  buildIdempotencyFingerprint,
  EMPTY_BODY_SHA256,
  IDEMPOTENCY_LEASE_REFRESH_MS,
  IDEMPOTENCY_LEASE_SECONDS,
  IDEMPOTENCY_REPLAYED_HEADER,
  idempotencyCompletionForStatus,
  idempotencyRetryAfterSeconds,
  isIdempotencyMethod,
  isUnderBetterAuthPath,
  isValidIdempotencyKey,
  responseForStorage,
  splitRequestUrl,
} from "./idempotency-policy.js";

type ClaimRow = {
  outcome: string;
  response_body: unknown;
  response_omitted: boolean;
  status_code: number | null;
};

type ClaimState = {
  clearLease: () => void;
  key: string;
  userId: string;
};

const bodyHashes = new WeakMap<FastifyRequest, string>();
const claims = new WeakMap<FastifyRequest, ClaimState>();

export function registerIdempotency(fastify: FastifyInstance): void {
  fastify.addHook("preParsing", async (request, _reply, payload) => {
    if (!shouldHashBody(request) || !isReadable(payload)) {
      return payload;
    }

    return teeAndHash(payload, (hex) => {
      bodyHashes.set(request, hex);
    });
  });

  fastify.addHook("preHandler", async (request, reply) => {
    const decision = classifyRequest(request);
    if (decision.kind === "skip") {
      return;
    }
    if (decision.kind === "invalid") {
      throw badRequest(
        "Idempotency-Key must be 1 to 255 printable ASCII characters.",
        "idempotency_key_invalid",
      );
    }
    if (decision.kind === "unsupported") {
      throw badRequest(
        "Idempotency-Key is not supported on this route.",
        "idempotency_key_unsupported",
      );
    }

    const userId = decision.userId;
    const { pathname, rawQuery } = splitRequestUrl(request.url);
    const requestHash = buildIdempotencyFingerprint({
      bodySha256: bodyHashes.get(request) ?? EMPTY_BODY_SHA256,
      method: request.method,
      pathname,
      rawQuery,
    });

    let row: ClaimRow;
    try {
      row = await claimIdempotencyKey(userId, decision.key, requestHash);
    } catch (error) {
      request.log.error({ err: error }, "idempotency claim failed");
      throw internal("internal_server_error");
    }

    if (row.outcome === "claimed") {
      claims.set(request, {
        clearLease: armLeaseRefresh(request, reply, userId, decision.key),
        key: decision.key,
        userId,
      });
      return;
    }

    if (row.outcome === "replay") {
      if (row.response_omitted) {
        return sendOmittedReplay(request, reply);
      }
      reply.header(IDEMPOTENCY_REPLAYED_HEADER, "true");
      const statusCode = row.status_code ?? 200;
      if (row.response_body === null || row.response_body === undefined) {
        return reply.status(statusCode).send();
      }
      return reply.status(statusCode).send(row.response_body);
    }

    if (row.outcome === "mismatch") {
      throw new DomainError(
        "The idempotency key was reused with a different request.",
        422,
        "idempotency_key_mismatch",
      );
    }

    if (row.outcome === "in_progress") {
      reply.header("Retry-After", String(idempotencyRetryAfterSeconds()));
      throw conflict(
        "A request with this idempotency key is already in progress.",
        "idempotency_key_in_progress",
      );
    }

    request.log.error({ outcome: row.outcome }, "idempotency claim returned an unknown outcome");
    throw internal("internal_server_error");
  });

  fastify.addHook("onSend", async (request, reply, payload) => {
    const state = claims.get(request);
    if (!state) {
      return payload;
    }
    claims.delete(request);
    state.clearLease();

    try {
      await settleClaim(state, reply.statusCode, payload);
    } catch (error) {
      request.log.error({ err: error }, "idempotency settle failed");
    }

    return payload;
  });
}

type ClassifiedRequest =
  | { kind: "apply"; key: string; userId: string }
  | { kind: "invalid" }
  | { kind: "skip" }
  | { kind: "unsupported" };

function classifyRequest(request: FastifyRequest): ClassifiedRequest {
  const header = request.headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];
  if (header === undefined) {
    return { kind: "skip" };
  }
  if (!isIdempotencyMethod(request.method)) {
    return { kind: "skip" };
  }
  if (!request.authUser) {
    return { kind: "skip" };
  }
  const { pathname } = splitRequestUrl(request.url);
  if (isUnderBetterAuthPath(pathname)) {
    return { kind: "skip" };
  }
  if (typeof header !== "string" || !isValidIdempotencyKey(header)) {
    return { kind: "invalid" };
  }
  if (request.routeOptions.config?.idempotency === false) {
    return { kind: "unsupported" };
  }
  return { key: header, kind: "apply", userId: request.authUser.id };
}

function shouldHashBody(request: FastifyRequest): boolean {
  const header = request.headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];
  return header !== undefined && isIdempotencyMethod(request.method);
}

function sendOmittedReplay(request: FastifyRequest, reply: FastifyReply) {
  const error = conflict(
    "The original response for this idempotency key was not stored.",
    "idempotency_response_omitted",
  );
  const mapped = mapErrorToResponse(error, request);
  return reply
    .header(IDEMPOTENCY_REPLAYED_HEADER, "true")
    .status(mapped.statusCode)
    .send(mapped.body);
}

function armLeaseRefresh(
  request: FastifyRequest,
  reply: FastifyReply,
  userId: string,
  key: string,
): () => void {
  const timer = setInterval(() => {
    void refreshIdempotencyLease(userId, key).catch((error: unknown) => {
      request.log.error({ err: error }, "idempotency lease refresh failed");
    });
  }, IDEMPOTENCY_LEASE_REFRESH_MS);
  timer.unref();

  let cleared = false;
  const clear = () => {
    if (cleared) {
      return;
    }
    cleared = true;
    clearInterval(timer);
  };

  reply.raw.once("finish", clear);
  request.raw.once("close", clear);
  return clear;
}

async function settleClaim(state: ClaimState, statusCode: number, payload: unknown): Promise<void> {
  if (idempotencyCompletionForStatus(statusCode) === "release") {
    await releaseIdempotencyKey(state.userId, state.key);
    return;
  }

  const stored = responseForStorage(payload);
  await completeIdempotencyKey(
    state.userId,
    state.key,
    statusCode,
    stored.omitted ? null : stored.body,
    stored.omitted,
  );
}

function teeAndHash(source: Readable, onHash: (hex: string) => void): PassThrough {
  const hash = createHash("sha256");
  const tee = new PassThrough();
  let settled = false;

  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    onHash(hash.digest("hex"));
    tee.end();
  };

  source.on("data", (chunk: Buffer | string) => {
    hash.update(chunk);
    if (!tee.write(chunk)) {
      source.pause();
    }
  });
  tee.on("drain", () => {
    source.resume();
  });
  source.on("end", finish);
  source.on("error", (error: Error) => {
    if (settled) {
      return;
    }
    settled = true;
    tee.destroy(error);
  });

  return tee;
}

function isReadable(payload: unknown): payload is Readable {
  return payload instanceof Readable;
}

async function claimIdempotencyKey(
  userId: string,
  key: string,
  requestHash: string,
): Promise<ClaimRow> {
  const rows = await prisma.$queryRaw<ClaimRow[]>`
    SELECT outcome, status_code, response_body, response_omitted
    FROM claim_idempotency_key(
      ${userId}::uuid,
      ${key},
      ${requestHash},
      ${IDEMPOTENCY_LEASE_SECONDS}::int
    )
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("claim_idempotency_key returned no row");
  }
  return row;
}

async function completeIdempotencyKey(
  userId: string,
  key: string,
  statusCode: number,
  responseBody: unknown,
  responseOmitted: boolean,
): Promise<void> {
  const json =
    responseBody === null || responseBody === undefined ? null : JSON.stringify(responseBody);
  await prisma.$queryRaw`
    SELECT complete_idempotency_key(
      ${userId}::uuid,
      ${key},
      ${statusCode}::int,
      ${json}::jsonb,
      ${responseOmitted}::boolean
    ) AS ok
  `;
}

async function releaseIdempotencyKey(userId: string, key: string): Promise<void> {
  await prisma.$queryRaw`
    SELECT release_idempotency_key(${userId}::uuid, ${key}) AS ok
  `;
}

async function refreshIdempotencyLease(userId: string, key: string): Promise<void> {
  await prisma.$queryRaw`
    SELECT refresh_idempotency_lease(
      ${userId}::uuid,
      ${key},
      ${IDEMPOTENCY_LEASE_SECONDS}::int
    ) AS ok
  `;
}
