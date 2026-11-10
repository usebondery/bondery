import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_ROUTES } from "@bondery/helpers";
import Fastify from "fastify";
import {
  type FastifyZodOpenApiTypeProvider,
  fastifyZodOpenApiPlugin,
  serializerCompiler,
  validatorCompiler,
} from "fastify-zod-openapi";
import { cspReportRoutes } from "../routes/security/csp-report.js";

/**
 * The route plugin under test is registered on a bare Fastify instance.
 *
 * `buildApp()` needs Postgres, because Better Auth seeds its OAuth resources at
 * boot. This route has no auth and no database access, so a minimal app tests
 * the real content-type parsers and handler without that dependency.
 */
async function createRouteApp() {
  const app = Fastify().withTypeProvider<FastifyZodOpenApiTypeProvider>();
  await app.register(fastifyZodOpenApiPlugin, { documentOpts: { openapi: "3.0.3" } });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cspReportRoutes, { prefix: API_ROUTES.SECURITY_CSP_REPORT });
  await app.ready();
  return app;
}

const LEGACY_REPORT = {
  "csp-report": {
    "blocked-uri": "https://cdn.example.test/bundle.js?v=1",
    disposition: "enforce",
    "document-uri": "https://app.example.test/app/people?search=alice",
    "effective-directive": "script-src-elem",
    "line-number": 42,
    sample: "<div>alice@example.test</div>",
  },
};

describe("POST /security/csp-report", () => {
  it("accepts the legacy content type without credentials and returns 204", async () => {
    const app = await createRouteApp();

    const response = await app.inject({
      headers: { "content-type": "application/csp-report" },
      method: "POST",
      payload: JSON.stringify(LEGACY_REPORT),
      url: API_ROUTES.SECURITY_CSP_REPORT,
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    await app.close();
  });

  it("accepts the Reporting API content type", async () => {
    const app = await createRouteApp();

    const response = await app.inject({
      headers: { "content-type": "application/reports+json" },
      method: "POST",
      payload: JSON.stringify([
        {
          body: {
            documentURL: "https://app.example.test/app/people",
            effectiveDirective: "script-src-elem",
          },
          type: "csp-violation",
        },
      ]),
      url: API_ROUTES.SECURITY_CSP_REPORT,
    });

    assert.equal(response.statusCode, 204);
    await app.close();
  });

  it("never echoes the request body back", async () => {
    const app = await createRouteApp();

    const response = await app.inject({
      headers: { "content-type": "application/csp-report" },
      method: "POST",
      payload: JSON.stringify(LEGACY_REPORT),
      url: API_ROUTES.SECURITY_CSP_REPORT,
    });

    assert.equal(response.body.includes("alice"), false);
    await app.close();
  });

  it("stays at 204 for a malformed body", async () => {
    const app = await createRouteApp();

    const response = await app.inject({
      headers: { "content-type": "application/csp-report" },
      method: "POST",
      payload: "not json",
      url: API_ROUTES.SECURITY_CSP_REPORT,
    });

    assert.equal(response.statusCode, 204);
    await app.close();
  });

  it("rejects a body over the hard cap", async () => {
    const app = await createRouteApp();

    const response = await app.inject({
      headers: { "content-type": "application/csp-report" },
      method: "POST",
      payload: JSON.stringify({ "csp-report": { padding: "x".repeat(64 * 1024) } }),
      url: API_ROUTES.SECURITY_CSP_REPORT,
    });

    assert.equal(response.statusCode, 413);
    await app.close();
  });
});
