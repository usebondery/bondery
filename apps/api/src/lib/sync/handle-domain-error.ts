import type { FastifyReply } from "fastify";
import { DomainError } from "../../domains/_shared/context";
import { SyncConflictError } from "./conflict";

export function handleDomainError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof SyncConflictError) {
    reply.status(409).send({
      error: error.message,
      contact: error.serverContact,
    });
    return true;
  }

  if (error instanceof DomainError) {
    reply.status(error.statusCode).send({ error: error.message });
    return true;
  }

  return false;
}
