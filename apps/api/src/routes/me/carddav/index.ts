/**
 * CardDAV device management (session-only). API keys and DAV keys cannot call these routes.
 *
 * With `BONDERY_INFRA_CARDDAV_ENABLED` off, `GET /me/carddav` reports `enabled: false` with no
 * devices, and every other route answers 404 `carddav_not_enabled`.
 */

import { API_ROUTES } from "@bondery/helpers";
import {
  carddavDeviceCredentialsResponseSchema,
  carddavDeviceResponseSchema,
  carddavSettingsResponseSchema,
  createCarddavDeviceInputSchema,
  updateCarddavDeviceInputSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import {
  conflictResponse,
  noContentResponse,
  standardErrorResponses,
} from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { consumeStepUpHeader } from "../../../lib/auth/step-up-redis.js";
import { notFound } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import {
  createCarddavDevice,
  deleteCarddavDevice,
  getCarddavSettings,
  renameCarddavDevice,
  resumeCarddavDevice,
  rotateCarddavDevice,
} from "../../../services/carddav/devices.js";
import { disconnectAllCarddavDevices } from "../../../services/carddav/disconnect-all.js";

const TRAILING_SLASHES_PATTERN = /\/+$/;

const STEP_UP_NOTE = "Requires a one-shot `X-Bondery-Step-Up` token from `POST /me/step-up`.";

/**
 * A create or rotate response holds the device password. The global Idempotency-Key store would
 * save that response for 24 hours, so these routes reject the header instead.
 */
const SECRET_RESPONSE_ROUTE_CONFIG = { idempotency: false } as const;

export const meCarddavRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  const isEnabled = () => fastify.config.BONDERY_INFRA_CARDDAV_ENABLED;
  const serverUrl = `${fastify.config.BONDERY_PUBLIC_API_URL.replace(TRAILING_SLASHES_PATTERN, "")}${API_ROUTES.DAV}/`;

  function assertEnabled(): void {
    if (!isEnabled()) {
      throw notFound("CardDAV sync is not enabled on this server", "carddav_not_enabled");
    }
  }

  fastify.get(
    "/",
    {
      schema: {
        description:
          "Return the CardDAV server address, the username and the connected devices. `enabled` is false when this server does not offer CardDAV sync.",
        response: withOkResponse(carddavSettingsResponseSchema, "CardDAV settings"),
        summary: "Get CardDAV settings",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => ({
      carddav: await getCarddavSettings(ctx, { isEnabled: isEnabled(), serverUrl }),
    })),
  );

  fastify.delete(
    "/",
    {
      schema: {
        description: `Disconnect every device. Deletes all device passwords, the device list and the synced cards. Contacts stay. ${STEP_UP_NOTE}`,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
        summary: "Disconnect all CardDAV devices",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, { request }, reply) => {
      assertEnabled();
      await consumeStepUpHeader(ctx.user.id, request.headers);
      await disconnectAllCarddavDevices(ctx);
      return reply.status(204).send(null);
    }),
  );

  fastify.post(
    "/devices",
    {
      config: SECRET_RESPONSE_ROUTE_CONFIG,
      schema: {
        body: createCarddavDeviceInputSchema,
        description: `Connect a device. The response holds the device password. It is shown once and cannot be read again. ${STEP_UP_NOTE}`,
        response: {
          ...withCreatedResponse(carddavDeviceCredentialsResponseSchema, "Device created"),
          ...conflictResponse,
        },
        summary: "Connect a CardDAV device",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: createCarddavDeviceInputSchema },
      async (ctx, { body, request }, reply) => {
        assertEnabled();
        await consumeStepUpHeader(ctx.user.id, request.headers);
        const result = await createCarddavDevice(ctx, body, serverUrl);
        reply.status(201);
        return result;
      },
    ),
  );

  fastify.patch(
    "/devices/:id",
    {
      schema: {
        body: updateCarddavDeviceInputSchema,
        description: "Rename a device.",
        params: uuidParamSchema,
        response: withOkResponse(carddavDeviceResponseSchema, "Updated device"),
        summary: "Rename a CardDAV device",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: updateCarddavDeviceInputSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        assertEnabled();
        return { device: await renameCarddavDevice(ctx, params.id, body.name) };
      },
    ),
  );

  fastify.delete(
    "/devices/:id",
    {
      schema: {
        description: `Remove a device. Its password stops working at once. Cards already on the device stay there. ${STEP_UP_NOTE}`,
        params: uuidParamSchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
        summary: "Remove a CardDAV device",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params, request }, reply) => {
      assertEnabled();
      await consumeStepUpHeader(ctx.user.id, request.headers);
      await deleteCarddavDevice(ctx, params.id);
      return reply.status(204).send(null);
    }),
  );

  fastify.post(
    "/devices/:id/resume",
    {
      schema: {
        description:
          "Let a paused device write again. The mass-change guard pauses a device that sends too many changes at once.",
        params: uuidParamSchema,
        response: withOkResponse(carddavDeviceResponseSchema, "Resumed device"),
        summary: "Resume a CardDAV device",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      assertEnabled();
      return { device: await resumeCarddavDevice(ctx, params.id) };
    }),
  );

  fastify.post(
    "/devices/:id/rotate",
    {
      config: SECRET_RESPONSE_ROUTE_CONFIG,
      schema: {
        description: `Replace the device password. The old password stops working at once. The response holds the new password. It is shown once. ${STEP_UP_NOTE}`,
        params: uuidParamSchema,
        response: withOkResponse(carddavDeviceCredentialsResponseSchema, "Device rotated"),
        summary: "Rotate a CardDAV device password",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params, request }) => {
      assertEnabled();
      await consumeStepUpHeader(ctx.user.id, request.headers);
      return rotateCarddavDevice(ctx, params.id, serverUrl);
    }),
  );
};
