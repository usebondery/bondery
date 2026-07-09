import type { ApiKeyPermission } from "@bondery/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppFastifyInstance } from "../lib/platform/fastify-types.js";

/** Bypass Supabase and install a synthetic API key session for policy tests. */
export function installMockApiKeyAuth(
  app: AppFastifyInstance,
  permission: ApiKeyPermission = "full",
): void {
  app.verifyAuth = async (request: FastifyRequest, _reply: FastifyReply) => {
    request.authUser = { email: "test@example.com", id: "test-user-id" };
    request.authClient = null;
    request.authApiKey = {
      id: "test-key-id",
      label: "test-key",
      permission,
    };
  };
}
