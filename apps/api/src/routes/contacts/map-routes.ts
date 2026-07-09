import { mapAddressPinsResponseSchema, mapPinsResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/platform/auth/strategies.js";
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return getMapAddressPins(client, user.id, request.query, request.log);
    },
  );

  fastify.get(
    "/map-pins",
    {
      schema: {
        description: "Fetch lightweight map pins for contacts within a bounding box.",
        querystring: mapPinsQuerySchema,
        response: withOkResponse(mapPinsResponseSchema, "Map pins within the bounding box"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return getMapPins(client, user.id, request.query, request.log);
    },
  );
}
