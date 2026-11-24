import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_KEY_PREFIX } from "@bondery/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createVerifyServiceSecret } from "./service-secret.js";

const SECRET = "unit-test-service-secret-0123456789abcdef";

function mockRequest(authorization?: string): FastifyRequest {
  const noop = () => undefined;
  return {
    headers: authorization === undefined ? {} : { authorization },
    log: { warn: noop },
    url: "/internal/test",
  } as unknown as FastifyRequest;
}

const reply = {} as FastifyReply;

function rejectsWith(code: string) {
  return (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal((error as { statusCode?: number }).statusCode, 401);
    assert.equal((error as { code?: string }).code, code);
    return true;
  };
}

describe("verifyServiceSecret", () => {
  const verify = createVerifyServiceSecret(() => SECRET);

  it("accepts the configured secret as a bearer token", async () => {
    await assert.doesNotReject(verify(mockRequest(`Bearer ${SECRET}`), reply));
  });

  it("accepts the secret again on a later request", async () => {
    await verify(mockRequest(`Bearer ${SECRET}`), reply);
    await assert.doesNotReject(verify(mockRequest(`Bearer ${SECRET}`), reply));
  });

  it("rejects a wrong bearer token", async () => {
    await assert.rejects(
      verify(mockRequest("Bearer not-the-service-secret"), reply),
      rejectsWith("service_auth_invalid"),
    );
  });

  it("rejects a token that is a prefix of the secret", async () => {
    await assert.rejects(
      verify(mockRequest(`Bearer ${SECRET.slice(0, -1)}`), reply),
      rejectsWith("service_auth_invalid"),
    );
  });

  it("rejects an empty bearer token", async () => {
    await assert.rejects(
      verify(mockRequest("Bearer "), reply),
      rejectsWith("service_auth_invalid"),
    );
  });

  it("rejects a missing Authorization header", async () => {
    await assert.rejects(verify(mockRequest(), reply), rejectsWith("service_auth_required"));
  });

  it("rejects a non-bearer Authorization header", async () => {
    await assert.rejects(
      verify(mockRequest(`Basic ${SECRET}`), reply),
      rejectsWith("service_auth_required"),
    );
  });

  it("rejects an API key", async () => {
    await assert.rejects(
      verify(mockRequest(`Bearer ${API_KEY_PREFIX}abc`), reply),
      rejectsWith("service_auth_invalid"),
    );
  });

  it("rejects every token when the secret is not configured", async () => {
    const verifyUnset = createVerifyServiceSecret(() => undefined);
    await assert.rejects(
      verifyUnset(mockRequest("Bearer "), reply),
      rejectsWith("service_auth_invalid"),
    );
    await assert.rejects(
      verifyUnset(mockRequest("Bearer anything"), reply),
      rejectsWith("service_auth_invalid"),
    );
  });
});
