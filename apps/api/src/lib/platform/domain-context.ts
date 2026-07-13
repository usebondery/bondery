import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type {
  DomainAuthUser,
  DomainContext,
  DomainSupabaseClient,
} from "../../domains/_shared/context.js";
import { getAuth } from "./auth/strategies.js";

export function domainContextFromClient(
  client: DomainSupabaseClient,
  user: DomainAuthUser,
  log?: FastifyBaseLogger,
): DomainContext {
  return { client, log, user };
}

export function domainContextFromRequest(request: FastifyRequest): DomainContext {
  const { client, user } = getAuth(request);
  return {
    client,
    log: request.log as FastifyBaseLogger,
    user,
  };
}
