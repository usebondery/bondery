import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import type { ShareableField } from "@bondery/types";
import { shareContact } from "./lib.js";

const ShareContactBody = Type.Object({
  personId: Type.String({ minLength: 1 }),
  recipientEmails: Type.Array(Type.String({ format: "email" }), { minItems: 1, maxItems: 10 }),
  message: Type.Optional(Type.String({ maxLength: 2000 })),
  selectedFields: Type.Array(
    Type.Union([
      Type.Literal("name"),
      Type.Literal("avatar"),
      Type.Literal("headline"),
      Type.Literal("phones"),
      Type.Literal("emails"),
      Type.Literal("location"),
      Type.Literal("linkedin"),
      Type.Literal("instagram"),
      Type.Literal("facebook"),
      Type.Literal("website"),
      Type.Literal("whatsapp"),
      Type.Literal("signal"),
      Type.Literal("addresses"),
      Type.Literal("notes"),
      Type.Literal("importantDates"),
    ]),
    { minItems: 1 },
  ),
});

export async function shareRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Share"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/",
    { schema: { body: ShareContactBody } },
    async (
      request: FastifyRequest<{
        Body: {
          personId: string;
          recipientEmails: string[];
          message?: string;
          selectedFields: ShareableField[];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { user, client } = getAuth(request);
      const result = await shareContact(client, user, request.body);

      if ("error" in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return result;
    },
  );
}
