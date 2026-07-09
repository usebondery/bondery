import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainContextFromRequest } from "./domain-context.js";

type DomainRouteRequest = FastifyRequest & {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, unknown>;
};

export function withDomainRoute(
  handler: (
    ctx: DomainContext,
    request: DomainRouteRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
): RouteHandlerMethod {
  return (async (request, reply) => {
    const ctx = domainContextFromRequest(request);
    return await handler(ctx, request as DomainRouteRequest, reply);
  }) as RouteHandlerMethod;
}
