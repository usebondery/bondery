/**
 * Geocode proxy routes.
 * Proxies address suggestion lookups to Mapy.com so the private API key
 * never leaves the server.
 */

import type { AppRoutePlugin } from "../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  parseMapSuggestions,
  mapSuggestionToContactAddress,
} from "@bondery/helpers/address";
import { getTimezoneForCoordinates } from "../../lib/mapy";
import { registerApiKeyProtectedHooks } from "../../lib/api-key-access";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse } from "../../lib/openapi-route-responses";
import { GEOCODE_TIER } from "../../lib/rate-limit";
import {
  geocodeSuggestQuerySchema,
  geocodeSuggestResponseWireSchema,
  geocodeTimezoneQuerySchema,
  geocodeTimezoneResponseWireSchema,
} from "@bondery/schemas/http";

export const geocodeRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Geocode"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
  });
  registerApiKeyProtectedHooks(fastify);

  fastify.get(
    "/suggest",
    {
      config: { rateLimit: GEOCODE_TIER },
      schema: {
        description: "Returns mapped address/place autocomplete entries from Mapy.com",
        querystring: geocodeSuggestQuerySchema,
        response: withOkResponse(
          geocodeSuggestResponseWireSchema,
          "Address suggestions",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { search, mode = "address" } = request.query;

      const mapsKey = fastify.config.PRIVATE_MAPS_KEY;
      const mapsUrl = fastify.config.PUBLIC_MAPS_URL;

      if (!mapsKey) {
        request.log.warn({ query: search.trim(), mode }, "Geocode suggest skipped: missing maps API key");
        return reply.send({ addresses: [] });
      }

      const upstream = new URL(`${mapsUrl}/v1/suggest`);
      upstream.searchParams.set("apikey", mapsKey);
      upstream.searchParams.set("query", search.trim());
      upstream.searchParams.set("lang", "en");
      upstream.searchParams.set("limit", "8");
      upstream.searchParams.set(
        "type",
        mode === "place"
          ? "regional.municipality"
          : "regional.address,regional.street,regional.municipality",
      );

      try {
        const response = await fetch(upstream.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          request.log.warn(
            { query: search.trim(), mode, status: response.status },
            "Geocode suggest upstream request failed",
          );
          return reply.send({ addresses: [] });
        }

        const payload = await response.json();
        const rawResults = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.result)
            ? payload.result
            : Array.isArray(payload?.results)
              ? payload.results
              : [];

        const addresses = parseMapSuggestions(rawResults).map((item) =>
          mapSuggestionToContactAddress(item, { type: "home" }),
        );
        return reply.send({ addresses });
      } catch (error) {
        request.log.error({ err: error, query: search.trim(), mode }, "Geocode suggest handler error");
        return reply.send({ addresses: [] });
      }
    },
  );

  fastify.get(
    "/timezone",
    {
      config: { rateLimit: GEOCODE_TIER },
      schema: {
        description: "Returns the IANA timezone for a latitude/longitude pair from Mapy.com",
        querystring: geocodeTimezoneQuerySchema,
        response: withOkResponse(
          geocodeTimezoneResponseWireSchema,
          "Timezone lookup result",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { lat, lon } = request.query;

      try {
        const timezone = await getTimezoneForCoordinates(lat, lon);
        return reply.send({ timezone });
      } catch (error) {
        request.log.error({ err: error, lat, lon }, "Geocode timezone handler error");
        return reply.send({ timezone: null });
      }
    },
  );
};
