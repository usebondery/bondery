import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainContextFromRequest } from "./domain-context.js";

export type DomainRouteSchemas = {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
};

export type DomainRouteInput<T extends DomainRouteSchemas> = {
  [K in keyof T as T[K] extends z.ZodTypeAny ? K : never]: T[K] extends z.ZodTypeAny
    ? z.infer<T[K]>
    : never;
};

type DomainRouteBag<T extends DomainRouteSchemas> = DomainRouteInput<T> & {
  request: FastifyRequest;
};

type DomainRouteHandlerNoSchemas = (
  ctx: DomainContext,
  route: { request: FastifyRequest },
  reply: FastifyReply,
) => Promise<unknown>;

type DomainRouteHandler<T extends DomainRouteSchemas> = (
  ctx: DomainContext,
  route: DomainRouteBag<T>,
  reply: FastifyReply,
) => Promise<unknown>;

function parseDomainRouteInput<T extends DomainRouteSchemas>(
  schemas: T,
  request: FastifyRequest,
): DomainRouteBag<T> {
  const route = { request } as DomainRouteBag<T>;

  if (schemas.body) {
    (route as DomainRouteBag<T> & { body: unknown }).body = schemas.body.parse(request.body);
  }
  if (schemas.params) {
    (route as DomainRouteBag<T> & { params: unknown }).params = schemas.params.parse(
      request.params,
    );
  }
  if (schemas.query) {
    (route as DomainRouteBag<T> & { query: unknown }).query = schemas.query.parse(request.query);
  }

  return route;
}

/** Bridge return: response typing is enforced by route `schema.response`, not handler inference. */
export function withDomainRoute(handler: DomainRouteHandlerNoSchemas): RouteHandlerMethod;
export function withDomainRoute<T extends DomainRouteSchemas>(
  schemas: T,
  handler: DomainRouteHandler<T>,
): RouteHandlerMethod;
export function withDomainRoute<T extends DomainRouteSchemas>(
  schemasOrHandler: T | DomainRouteHandlerNoSchemas,
  maybeHandler?: DomainRouteHandler<T>,
): RouteHandlerMethod {
  if (typeof schemasOrHandler === "function") {
    const handler = schemasOrHandler;
    return (async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = domainContextFromRequest(request);
      return await handler(ctx, { request }, reply);
    }) as unknown as RouteHandlerMethod;
  }

  const schemas = schemasOrHandler;
  const handler = maybeHandler as DomainRouteHandler<T>;

  return (async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = domainContextFromRequest(request);
    const route = parseDomainRouteInput(schemas, request);
    return await handler(ctx, route, reply);
  }) as unknown as RouteHandlerMethod;
}
