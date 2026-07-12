import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
} from "fastify";
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiTypeProvider,
} from "fastify-zod-openapi";

export type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
} from "fastify-zod-openapi";

/** Fastify instance with Zod OpenAPI type provider (use in nested route helpers). */
export type AppFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  FastifyZodOpenApiTypeProvider
>;

/** Top-level route plugin — use for `export const fooRoutes: AppRoutePlugin = ...`. */
export type AppRoutePlugin = FastifyPluginAsyncZodOpenApi;

/**
 * HTTP route handler for `AppFastifyInstance`.
 * Schema-specific response typing is enforced at each route's `schema.response`, not here.
 */
export type AppRouteHandler = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  RouteGenericInterface,
  unknown,
  // biome-ignore lint/suspicious/noExplicitAny: route schemas vary; response shapes are validated per-route
  any,
  FastifyZodOpenApiTypeProvider,
  FastifyBaseLogger
>;
