import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_ROUTES, BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
import Fastify from "fastify";
import {
  type FastifyZodOpenApiTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-zod-openapi";
import { oauthProviders } from "../lib/auth/oauth-provider-config.js";
import { registerOAuthProvidersRoutes } from "../lib/auth/oauth-providers-routes.js";
import {
  BETTER_AUTH_SIGN_IN_SOCIAL_PATH,
  resolveUnconfiguredSocialOAuthProvider,
} from "../lib/auth/oauth-social-request.js";
import { badRequest } from "../lib/platform/errors/http-errors.js";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import type { AppFastifyInstance } from "../lib/platform/fastify-types.js";
import { loadTestEnv } from "./load-test-env.js";

/**
 * Minimal Fastify — no Better Auth, no Prisma. `buildApp` registers auth
 * strategies that construct the BA instance and probe Postgres.
 */
async function buildOAuthProvidersApp() {
  const app = Fastify()
    .withTypeProvider<FastifyZodOpenApiTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = mapErrorToResponse(
      error as Parameters<typeof mapErrorToResponse>[0],
      request,
    );
    return reply.status(statusCode).send(body);
  });

  registerOAuthProvidersRoutes(app as AppFastifyInstance);

  app.route({
    async handler(request) {
      if (
        resolveUnconfiguredSocialOAuthProvider(
          request.method,
          request.url,
          request.body,
          oauthProviders,
        )
      ) {
        throw badRequest(
          "OAuth provider is not configured on this instance",
          "oauth_provider_not_configured",
        );
      }

      return { forwarded: true };
    },
    method: ["GET", "POST"],
    url: `${BETTER_AUTH_BASE_PATH}/*`,
  });

  await app.ready();
  return app;
}

describe("oauth providers HTTP", () => {
  it("gET /oauth-providers returns the boot snapshot from Fastify, not Better Auth", async () => {
    loadTestEnv();
    const app = await buildOAuthProvidersApp();
    const response = await app.inject({ method: "GET", url: API_ROUTES.OAUTH_PROVIDERS });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "public, max-age=60");
    const body = response.json() as {
      oauthProviders: { email: boolean; github: boolean; linkedin: boolean };
    };
    assert.deepEqual(body.oauthProviders, oauthProviders);
    assert.equal(typeof body.oauthProviders.email, "boolean");
    assert.equal(typeof body.oauthProviders.github, "boolean");
    assert.equal(typeof body.oauthProviders.linkedin, "boolean");
    await app.close();
  });

  it("pOST /auth/sign-in/social returns oauth_provider_not_configured when the snapshot is false", async () => {
    loadTestEnv();
    if (oauthProviders.github) {
      // Boot-time snapshot is frozen at module init; mutating process.env
      // cannot flip it. Path matching is covered in oauth-social-request.test.ts.
      return;
    }

    const app = await buildOAuthProvidersApp();
    const response = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: { callbackURL: "http://localhost/login", provider: "github" },
      url: BETTER_AUTH_SIGN_IN_SOCIAL_PATH,
    });
    assert.equal(response.statusCode, 400);
    const body = response.json() as { error: { code: string; type: string } };
    assert.equal(body.error.code, "oauth_provider_not_configured");
    assert.equal(body.error.type, "invalid_request_error");
    await app.close();
  });
});
