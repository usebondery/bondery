import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadTestEnv } from "./load-test-env.js";

/**
 * Route shells own authentication. No global hook backs them up, so every route
 * stamped `session` or `integration` must reject a request with no credentials
 * on its own, before the body is parsed.
 */
const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";
const PATH_PARAM_PATTERN = /:[A-Za-z0-9_]+/g;
const WILDCARD_PATTERN = /\*/g;
const DAV_CHALLENGE = 'Basic realm="Bondery", charset="UTF-8"';

describe("route auth coverage", () => {
  it("rejects every session and integration route without credentials", async () => {
    loadTestEnv();
    const { disableRouteSecurityAudit, enableRouteSecurityAudit, getRouteSecurityAudit } =
      await import("../lib/platform/route-areas.js");
    enableRouteSecurityAudit();

    try {
      const { createTestApp } = await import("./create-test-app.js");
      const app = await createTestApp();

      const audited = getRouteSecurityAudit().filter(
        (route) =>
          (route.openApiArea === "session" || route.openApiArea === "integration") &&
          route.method !== "HEAD" &&
          route.method !== "OPTIONS",
      );
      // A WebSocket route checks a single-use ticket in its handshake. A plain HTTP
      // request to it gets 404 from @fastify/websocket, so it is not an HTTP 401 route.
      const protectedRoutes = audited.filter((route) => !route.isWebSocket);
      assert.ok(protectedRoutes.length > 0, "expected protected routes");
      assert.ok(
        audited.some((route) => route.isWebSocket),
        "expected the sync WebSocket route in the audit",
      );

      const open: string[] = [];
      for (const route of protectedRoutes) {
        const url = route.url
          .replace(PATH_PARAM_PATTERN, PLACEHOLDER_ID)
          .replace(WILDCARD_PATTERN, "x");
        const response = await app.inject({
          method: route.method as "GET",
          url,
        });
        if (response.statusCode !== 401) {
          open.push(`${route.method} ${route.url} -> ${response.statusCode}`);
        }
      }

      assert.deepEqual(open, [], `routes that did not answer 401:\n${open.join("\n")}`);
    } finally {
      disableRouteSecurityAudit();
    }
  });

  it("rejects every DAV route except OPTIONS without credentials, with the Basic challenge", async () => {
    loadTestEnv();
    process.env["BONDERY_INFRA_CARDDAV_ENABLED"] = "true";
    const { disableRouteSecurityAudit, enableRouteSecurityAudit, getRouteSecurityAudit } =
      await import("../lib/platform/route-areas.js");
    enableRouteSecurityAudit();

    try {
      const { createTestApp } = await import("./create-test-app.js");
      const app = await createTestApp();

      // OPTIONS is the unauthenticated capability probe.
      const audited = getRouteSecurityAudit().filter(
        (route) => route.openApiArea === "dav" && route.method !== "OPTIONS",
      );
      assert.ok(audited.length > 0, "expected dav routes in the audit");

      const wrong: string[] = [];
      for (const route of audited) {
        const url = route.url
          .replace(PATH_PARAM_PATTERN, PLACEHOLDER_ID)
          .replace(WILDCARD_PATTERN, "x");
        const response = await app.inject({ method: route.method as "GET", url });
        if (
          response.statusCode !== 401 ||
          response.headers["www-authenticate"] !== DAV_CHALLENGE ||
          response.body !== ""
        ) {
          wrong.push(`${route.method} ${route.url} -> ${response.statusCode}`);
        }
      }

      assert.deepEqual(wrong, [], `dav routes that did not challenge:\n${wrong.join("\n")}`);
      await app.close();
    } finally {
      delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
      disableRouteSecurityAudit();
    }
  });
});
