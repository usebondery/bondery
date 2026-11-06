import { mapAddressPinsResponseSchema, mapPinsResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getMapAddressPins, getMapPins } from "../../services/contacts/queries.js";
import { mapAddressPinsQuerySchema, mapPinsQuerySchema } from "./schemas.js";

export function registerContactMapRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/map-address-pins",
    {
      schema: {
        description: "Fetch address-level map pins within a bounding box (one pin per address).",
        querystring: mapAddressPinsQuerySchema,
        response: withOkResponse(
          mapAddressPinsResponseSchema,
          "Address map pins within the bounding box",
        ),
        summary: "List address map pins",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getMapAddressPins(ctx, request.query);
    },
  );

  fastify.get(
    "/map-pins",
    {
      schema: {
        description: "Fetch lightweight map pins for contacts within a bounding box.",
        querystring: mapPinsQuerySchema,
        response: withOkResponse(mapPinsResponseSchema, "Map pins within the bounding box"),
        summary: "List contact map pins",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getMapPins(ctx, request.query);
    },
  );
}
