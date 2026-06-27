/**
 * Geocode proxy routes.
 * Proxies address suggestion lookups to Mapy.com so the private API key
 * never leaves the server.
 */

import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import {
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
  mapSuggestionToContactAddress,
  parseMapSuggestions,
} from "@bondery/helpers/address";
import { getTimezoneForCoordinates } from "../../lib/mapy.js";
import { GEOCODE_TIER } from "../../lib/rate-limit.js";
import { GeocodeSuggestResponseSchema, GeocodeTimezoneResponseSchema } from "../../lib/schemas.js";

const SuggestQuery = Type.Object({
  q: Type.String({ minLength: GEOCODE_SUGGEST_MIN_QUERY_LENGTH, maxLength: 200 }),
  mode: Type.Optional(
    Type.Union([Type.Literal("address"), Type.Literal("place")], {
      default: "address",
    }),
  ),
});

const TimezoneQuery = Type.Object({
  lat: Type.Number({ minimum: -90, maximum: 90 }),
  lon: Type.Number({ minimum: -180, maximum: 180 }),
});

export async function geocodeRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Geocode"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/geocode/suggest
   *
   * Returns up to 8 mapped address entries for the given query string by
   * proxying to the Mapy.com /v1/suggest API. The Mapy.com API key is kept
   * server-side and never exposed to the client.
   */
  fastify.get(
    "/suggest",
    {
      config: { rateLimit: GEOCODE_TIER },
      schema: {
        description: "Returns mapped address/place autocomplete entries from Mapy.com",
        querystring: SuggestQuery,
        response: {
          200: GeocodeSuggestResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { q, mode = "address" } = request.query as {
        q: string;
        mode?: "address" | "place";
      };

      const mapsKey = fastify.config.NEXT_PRIVATE_MAPS_KEY;
      const mapsUrl = fastify.config.NEXT_PUBLIC_MAPS_URL;

      if (!mapsKey) {
        request.log.warn({ query: q.trim(), mode }, "Geocode suggest skipped: missing maps API key");
        return reply.send({ addresses: [] });
      }

      const upstream = new URL(`${mapsUrl}/v1/suggest`);
      upstream.searchParams.set("apikey", mapsKey);
      upstream.searchParams.set("query", q.trim());
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
            { query: q.trim(), mode, status: response.status },
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
        request.log.error({ err: error, query: q.trim(), mode }, "Geocode suggest handler error");
        return reply.send({ addresses: [] });
      }
    },
  );

  /**
   * GET /api/geocode/timezone
   *
   * Returns the IANA timezone identifier for a coordinate pair by proxying to
   * the Mapy.com /v1/timezone/coordinate API.
   */
  fastify.get(
    "/timezone",
    {
      config: { rateLimit: GEOCODE_TIER },
      schema: {
        description: "Returns the IANA timezone for a latitude/longitude pair from Mapy.com",
        querystring: TimezoneQuery,
        response: {
          200: GeocodeTimezoneResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { lat, lon } = request.query as { lat: number; lon: number };

      try {
        const timezone = await getTimezoneForCoordinates(lat, lon);
        return reply.send({ timezone });
      } catch (error) {
        request.log.error({ err: error, lat, lon }, "Geocode timezone handler error");
        return reply.send({ timezone: null });
      }
    },
  );
}
