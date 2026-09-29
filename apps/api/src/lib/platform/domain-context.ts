import { prisma } from "@bondery/db";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { DomainAuthUser, DomainContext } from "../../domains/_shared/context.js";
import { getAuth } from "./auth/strategies.js";

export function domainContextFromRequest(request: FastifyRequest): DomainContext {
  const { user } = getAuth(request);
  return {
    db: prisma,
    log: request.log as FastifyBaseLogger,
    requestId: request.id,
    user,
  };
}

export function domainContextFromUser(
  user: DomainAuthUser,
  log?: FastifyBaseLogger,
  requestId?: string,
): DomainContext {
  return { db: prisma, log, requestId, user };
}
