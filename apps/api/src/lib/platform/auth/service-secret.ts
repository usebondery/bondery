/**
 * Service-secret bearer strategy for server-to-server internal routes.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { BEARER_PREFIX } from "../../auth/bearer-token-format.js";
import { unauthorized } from "../errors/http-errors.js";
import { constantTimeEqual } from "../security/constant-time-equal.js";
import { isApiKeyBearerToken } from "./api-keys.js";

/**
 * Builds the `verifyServiceSecret` strategy.
 *
 * Accepts only `Authorization: Bearer <BONDERY_PRIVATE_SERVICE_SECRET>`. The
 * token is compared in constant time. An unset secret rejects every request.
 *
 * @param getExpectedSecret - Returns the configured service secret, or undefined when unset.
 */
export function createVerifyServiceSecret(
  getExpectedSecret: () => string | undefined,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;
    if (typeof authHeader !== "string" || !authHeader.startsWith(BEARER_PREFIX)) {
      request.log.warn(
        { reason: "missing or malformed Authorization header", url: request.url },
        "verifyServiceSecret: rejected",
      );
      throw unauthorized("Unauthorized", "service_auth_required");
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    if (isApiKeyBearerToken(token)) {
      request.log.warn(
        { reason: "API key sent to service-secret route", url: request.url },
        "verifyServiceSecret: rejected",
      );
      throw unauthorized("Unauthorized", "service_auth_invalid");
    }

    const expected = getExpectedSecret();
    if (!expected || !constantTimeEqual(token, expected)) {
      request.log.warn(
        { reason: "service secret mismatch", url: request.url },
        "verifyServiceSecret: rejected",
      );
      throw unauthorized("Unauthorized", "service_auth_invalid");
    }
  };
}
