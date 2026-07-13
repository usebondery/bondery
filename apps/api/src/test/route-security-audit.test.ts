import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  disableRouteSecurityAudit,
  enableRouteSecurityAudit,
  getRouteSecurityAudit,
} from "../lib/platform/route-areas.js";
import { loadTestEnv } from "./load-test-env.js";

describe("route security audit", () => {
  it("stamps openApiArea on every route registered through area shells", async () => {
    loadTestEnv();
    enableRouteSecurityAudit();

    try {
      const { createTestApp } = await import("./create-test-app.js");
      await createTestApp();

      const audited = getRouteSecurityAudit();
      assert.ok(audited.length > 0, "expected shelled routes to be audited");

      const missingArea = audited.filter((route) => !route.openApiArea);
      assert.equal(
        missingArea.length,
        0,
        `routes missing openApiArea: ${missingArea.map((r) => `${r.method} ${r.url}`).join(", ")}`,
      );

      const integrationRoutes = audited.filter((route) => route.openApiArea === "integration");
      const sessionRoutes = audited.filter((route) => route.openApiArea === "session");
      assert.ok(integrationRoutes.length > 0, "expected integration routes");
      assert.ok(sessionRoutes.length > 0, "expected session routes");
    } finally {
      disableRouteSecurityAudit();
    }
  });
});
