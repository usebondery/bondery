import { reminderDigestRequestSchema, reminderDigestResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { sendReminderDigest } from "../../services/notifications/reminder-digest.js";

export const reminderDigestRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Internal"];
    }
  });

  fastify.post(
    "/",
    {
      config: { rateLimit: false },
      schema: {
        body: reminderDigestRequestSchema,
        description: "Send reminder digest emails for the given users and target date.",
        response: withOkResponse(reminderDigestResponseSchema, "Digest send result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      request.log.info(
        { targetDate: request.body.targetDate, userCount: request.body.users.length },
        "Received reminder digest request",
      );

      const result = await sendReminderDigest(
        {
          address: fastify.config.PRIVATE_EMAIL_ADDRESS,
          host: fastify.config.PRIVATE_EMAIL_HOST,
          pass: fastify.config.PRIVATE_EMAIL_PASS,
          port: Number(fastify.config.PRIVATE_EMAIL_PORT),
          user: fastify.config.PRIVATE_EMAIL_USER,
        },
        request.body,
      );

      return reply.send(result);
    },
  );
};
