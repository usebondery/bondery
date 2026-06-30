import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
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
