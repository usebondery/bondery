/**
 * Fastify ↔ Fetch Request/Response bridge for Better Auth (and MCP).
 *
 * Uses `better-call/node`'s `getRequest`/`setResponse` — the same Fetch
 * Request/Response bridge Better Auth's own adapters use — instead of a
 * hand-rolled `JSON.stringify(request.body)` bridge. That hand-rolled bridge
 * corrupted every non-JSON request: Fastify had already consumed the raw
 * body stream by the time this handler ran (via `@fastify/formbody` for
 * `application/x-www-form-urlencoded`, the content type of every OAuth
 * token/introspection/revocation request per RFC 6749 §4.1.3), and
 * re-serializing the parsed body as JSON while keeping the original
 * `content-type` header produced a body/media-type mismatch — the API's
 * `/oauth2/token` endpoint returned 415 for every real code exchange.
 *
 * `getRequest` handles this correctly: it only reads the raw stream when the
 * stream hasn't been consumed yet, and otherwise falls back to
 * `request.body` and re-serializes it in the *original* wire format inferred
 * from `content-type` (form-urlencoded vs JSON) — see
 * better-call/src/adapters/node/request.ts. We attach Fastify's
 * already-parsed `request.body` onto `request.raw` so `getRequest` can find
 * it there.
 *
 * The canonical origin is deliberately NOT derived from `Host` /
 * `X-Forwarded-*`. Those are proxy-supplied and can disagree with the
 * configured issuer. Better Auth's issuer (`BONDERY_PUBLIC_API_URL`) is the
 * only origin discovery/authorize/token/MCP handlers should ever see.
 */
import { getRequest, setResponse } from "better-call/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveRuntimeTrustedOrigins, withCorsHeaders } from "../platform/trusted-origins.js";
import { resolveBetterAuthIssuerUrl } from "./index.js";

const FETCH_BRIDGE_ALLOWED_ORIGINS = resolveRuntimeTrustedOrigins();

export const CANONICAL_ORIGIN = resolveBetterAuthIssuerUrl();

function getContentType(headers: FastifyRequest["headers"]): string | undefined {
  const value = headers["content-type"];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isFormUrlEncoded(contentType: string | undefined): boolean {
  return contentType?.toLowerCase().startsWith("application/x-www-form-urlencoded") ?? false;
}

function isFormBodyRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !Buffer.isBuffer(value) &&
    !(value instanceof URLSearchParams)
  );
}

/** Re-serialize Fastify's already-parsed body in the wire format Better Auth expects. */
function serializeFastifyBody(body: unknown, contentType: string | undefined): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === "string") {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (isFormUrlEncoded(contentType) && isFormBodyRecord(body)) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item));
        }
      } else {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }
  return JSON.stringify(body);
}

function applyResolvedClientIp(request: FastifyRequest): void {
  const ip = request.ip;
  if (!ip) {
    return;
  }

  // Fastify `trustProxy` already resolved the client. Better Auth rate limits
  // from `x-forwarded-for` and ignores multi-hop chains unless trustedProxies
  // is set — pass the single resolved address.
  request.headers["x-forwarded-for"] = ip;
  request.raw.headers["x-forwarded-for"] = ip;
}

function applyRequestId(request: FastifyRequest): void {
  const requestId = request.id;
  if (!requestId) {
    return;
  }
  request.headers["x-request-id"] = requestId;
  request.raw.headers["x-request-id"] = requestId;
}

export function toFetchRequest(request: FastifyRequest): Request {
  applyResolvedClientIp(request);
  applyRequestId(request);
  const { method } = request;

  // Build the Fetch Request directly from Fastify's parsed body. better-call's
  // getRequest() prefers reading the raw IncomingMessage stream whenever it still
  // looks readable; @fastify/formbody consumes that stream first, so the stream
  // path often yields an empty body and Better Auth returns 400
  // (grant_type is required) even though request.body is populated.
  if (method !== "GET" && method !== "HEAD" && request.body !== undefined) {
    const wireBody = serializeFastifyBody(request.body, getContentType(request.headers));
    if (wireBody !== undefined) {
      return new Request(CANONICAL_ORIGIN + request.url, {
        body: wireBody,
        duplex: "half",
        headers: request.headers as HeadersInit,
        method,
      } as RequestInit);
    }
  }

  return getRequest({ base: CANONICAL_ORIGIN, request: request.raw });
}

export async function sendFetchResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  response: Response,
): Promise<void> {
  // `setResponse` writes status/headers/body straight onto the raw Node
  // response (including repeated `set-cookie` headers and empty bodies).
  // `hijack()` stops Fastify from also trying to send its own response,
  // which would throw "reply already sent" — but hijacking also skips
  // @fastify/cors headers added earlier in the hook chain.
  reply.hijack();
  const outbound = withCorsHeaders(request, response, FETCH_BRIDGE_ALLOWED_ORIGINS);
  await setResponse(reply.raw, outbound);
}
