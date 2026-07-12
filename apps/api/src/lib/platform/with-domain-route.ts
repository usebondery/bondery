import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainContextFromRequest } from "./domain-context.js";

/** Validated by route schema at runtime; loosened for handler ergonomics. */
type DomainRouteRequest = FastifyRequest & {
  body: any;
  params: any;
  query: any;
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
