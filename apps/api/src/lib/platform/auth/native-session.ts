/**
 * Cookie-only Better Auth session that must be fresh.
 * JWT/opaque bearer without a BA cookie is rejected. Cookie wins if both exist.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../../auth/index.js";
import { toFetchHeaders } from "../../auth/request-headers.js";
import { isSessionCreatedAtFresh } from "../../auth/session-freshness.js";
import { forbidden, unauthorized } from "../errors/http-errors.js";
import type { AppFastifyInstance } from "../fastify-types.js";

const SESSION_COOKIE_RE = /(?:^|;\s*)(?:__Secure-)?(?:better-auth\.)?session_token=/;

function hasBetterAuthSessionCookie(request: FastifyRequest): boolean {
  const raw = request.headers.cookie;
  return typeof raw === "string" && SESSION_COOKIE_RE.test(raw);
}

function cookieOnlyHeaders(request: FastifyRequest): Headers {
  const headers = toFetchHeaders(request);
  headers.delete("authorization");
  return headers;
}

async function verifyNativeFreshSession(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!hasBetterAuthSessionCookie(request)) {
    throw unauthorized("Unauthorized - Please log in", "auth_required");
  }

  const session = await auth.api.getSession({ headers: cookieOnlyHeaders(request) });
  const user = session?.user;
  if (!session?.session || !user?.id || !user.email) {
    throw unauthorized("Unauthorized - Please log in", "auth_required");
  }

  if (!isSessionCreatedAtFresh(session.session.createdAt)) {
    throw forbidden("This action needs a recent confirmation", "session_not_fresh");
  }

  request.authUser = { email: user.email, id: user.id };
  request.authApiKey = null;
}

/** Register cookie-fresh Better Auth session auth on a route module. */
export function registerNativeSessionAuthHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", verifyNativeFreshSession);
}
