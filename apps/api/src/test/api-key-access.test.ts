import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  assertApiKeyAccess,
  isMethodAllowedForPermission,
} from "../lib/platform/auth/api-key-access.js";
import { loadTestEnv } from "./load-test-env.js";

function mockReply(): FastifyReply {
  return {} as FastifyReply;
}

function mockRequest(input: {
  url: string;
  method: string;
  permission?: "read" | "full";
  openApiArea?: "integration" | "session" | "internal";
}): FastifyRequest {
  const log = { warn: () => {} };
  return {
    authApiKey: input.permission ? { id: "k", label: "t", permission: input.permission } : null,
    log,
    method: input.method,
    routeOptions: input.openApiArea ? { config: { openApiArea: input.openApiArea } } : {},
    url: input.url,
  } as FastifyRequest;
}

describe("isMethodAllowedForPermission", () => {
  it("allows GET for read keys", () => {
    assert.equal(isMethodAllowedForPermission("GET", "read"), true);
  });

  it("denies POST for read keys", () => {
    assert.equal(isMethodAllowedForPermission("POST", "read"), false);
  });
});

describe("assertApiKeyAccess", () => {
  it("no-ops without authApiKey", () => {
    assert.doesNotThrow(() =>
      assertApiKeyAccess(mockRequest({ method: "GET", url: "/api/sync/pull" }), mockReply()),
    );
  });

  it("allows integration routes", () => {
    assert.doesNotThrow(() =>
      assertApiKeyAccess(
        mockRequest({
          method: "GET",
          openApiArea: "integration",
          permission: "read",
          url: "/api/geocode/suggest",
        }),
        mockReply(),
      ),
    );
  });

  it("denies session routes", () => {
    assert.throws(
      () =>
        assertApiKeyAccess(
          mockRequest({
            method: "POST",
            openApiArea: "session",
            permission: "full",
            url: "/api/contacts/merge",
          }),
          mockReply(),
        ),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );
  });

  it("denies routes without openApiArea", () => {
    assert.throws(
      () =>
        assertApiKeyAccess(
          mockRequest({
            method: "GET",
            permission: "read",
            url: "/api/unknown",
          }),
          mockReply(),
        ),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );
  });
  it("denies read key POST on integration routes", () => {
    assert.throws(
      () =>
        assertApiKeyAccess(
          mockRequest({
            method: "POST",
            openApiArea: "integration",
            permission: "read",
            url: "/api/contacts",
          }),
          mockReply(),
        ),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );
  });
});

describe("API key policy via HTTP", () => {
  it("returns 401 for session merge route with API key bearer", async () => {
    loadTestEnv();
    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();

    const response = await app.inject({
      headers: {
        authorization: "Bearer bondery_key_testid_testsecret",
      },
      method: "POST",
      payload: {
        conflictResolutions: {},
        leftPersonId: "00000000-0000-4000-8000-000000000001",
        rightPersonId: "00000000-0000-4000-8000-000000000002",
      },
      url: "/api/contacts/merge",
    });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("returns 401 for sync pull with API key bearer", async () => {
    loadTestEnv();
    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();

    const response = await app.inject({
      headers: {
        authorization: "Bearer bondery_key_testid_testsecret",
      },
      method: "GET",
      url: "/api/sync/pull?since=0",
    });

    assert.equal(response.statusCode, 401);
    await app.close();
  });
});
