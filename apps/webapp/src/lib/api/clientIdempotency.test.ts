import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { IDEMPOTENCY_KEY_HEADER } from "@bondery/helpers/globals/paths";
import { isUuidV7 } from "@bondery/helpers/ids/generate-id";
import { ApiError, clientApiJson } from "./client.js";

afterEach(() => {
  mock.restoreAll();
});

type FetchCall = {
  body: BodyInit | null | undefined;
  credentials: RequestCredentials | undefined;
  key: string | null;
  method: string;
  url: string;
};

function stubFetch(
  handler: (call: FetchCall, index: number) => Response | Promise<Response>,
): FetchCall[] {
  const calls: FetchCall[] = [];
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const call: FetchCall = {
      body: init?.body,
      credentials: init?.credentials,
      key: headers.get(IDEMPOTENCY_KEY_HEADER),
      method: init?.method ?? "GET",
      url: String(input),
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  });
  return calls;
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...headers },
    status,
  });
}

function errorBody(code: string): { error: { code: string; message: string } } {
  return { error: { code, message: code } };
}

describe("clientApiJson idempotency", () => {
  it("sends one UUIDv7 on POST and PATCH", async () => {
    const calls = stubFetch(() => jsonResponse(200, { ok: true }));

    await clientApiJson("/widgets", { body: '{"name":"a"}', method: "POST" });
    await clientApiJson("/widgets/1", { body: '{"name":"b"}', method: "PATCH" });

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.url, "/api/widgets");
    assert.equal(calls[0]?.credentials, "include");
    assert.equal(isUuidV7(calls[0]?.key ?? ""), true);
    assert.equal(calls[1]?.method, "PATCH");
    assert.equal(isUuidV7(calls[1]?.key ?? ""), true);
    assert.notEqual(calls[0]?.key, calls[1]?.key);
  });

  it("reuses the key and the body after 409 idempotency_key_in_progress", async () => {
    const calls = stubFetch((_call, index) => {
      if (index === 0) {
        return jsonResponse(409, errorBody("idempotency_key_in_progress"), { "Retry-After": "0" });
      }
      return jsonResponse(200, { ok: true });
    });

    const result = await clientApiJson<{ ok: boolean }>("/widgets", {
      body: '{"name":"same"}',
      method: "POST",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 2);
    assert.equal(isUuidV7(calls[0]?.key ?? ""), true);
    assert.equal(calls[1]?.key, calls[0]?.key);
    assert.equal(calls[0]?.body, '{"name":"same"}');
    assert.equal(calls[1]?.body, calls[0]?.body);
  });

  it("does not send a key for GET, PUT, or DELETE", async () => {
    const calls = stubFetch(() => jsonResponse(200, { ok: true }));

    await clientApiJson("/widgets", { method: "GET" });
    await clientApiJson("/widgets/1", { body: "{}", method: "PUT" });
    await clientApiJson("/widgets/1", { method: "DELETE" });

    assert.equal(calls.length, 3);
    assert.equal(calls[0]?.key, null);
    assert.equal(calls[1]?.key, null);
    assert.equal(calls[2]?.key, null);
  });

  it("keeps a caller-supplied key", async () => {
    const calls = stubFetch(() => jsonResponse(200, { ok: true }));

    await clientApiJson("/widgets", {
      headers: { [IDEMPOTENCY_KEY_HEADER]: "caller-key" },
      method: "POST",
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.key, "caller-key");
  });

  it("does not retry 409 conflict", async () => {
    const calls = stubFetch(() => jsonResponse(409, errorBody("conflict")));

    await assert.rejects(
      () => clientApiJson("/subscriptions/checkout", { method: "POST" }),
      (error: unknown) =>
        error instanceof ApiError && error.status === 409 && error.code === "conflict",
    );
    assert.equal(calls.length, 1);
  });

  it("does not retry 422 idempotency_key_mismatch", async () => {
    const calls = stubFetch(() => jsonResponse(422, errorBody("idempotency_key_mismatch")));

    await assert.rejects(
      () => clientApiJson("/widgets", { body: "{}", method: "POST" }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 422 &&
        error.code === "idempotency_key_mismatch",
    );
    assert.equal(calls.length, 1);
  });

  it("throws after the third transient failure", async () => {
    const calls = stubFetch(() =>
      jsonResponse(503, errorBody("service_unavailable"), { "Retry-After": "0" }),
    );

    await assert.rejects(
      () => clientApiJson("/widgets", { body: '{"name":"a"}', method: "POST" }),
      (error: unknown) => error instanceof ApiError && error.status === 503,
    );
    assert.equal(calls.length, 3);
    assert.equal(calls[0]?.key, calls[1]?.key);
    assert.equal(calls[1]?.key, calls[2]?.key);
    assert.equal(calls[0]?.body, calls[2]?.body);
  });

  it("does not retry a one-shot stream", async () => {
    const calls = stubFetch(() => jsonResponse(503, errorBody("service_unavailable")));
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
        controller.close();
      },
    });

    await assert.rejects(
      () => clientApiJson("/widgets", { body: stream, method: "POST" }),
      (error: unknown) => error instanceof ApiError && error.status === 503,
    );
    assert.equal(calls.length, 1);
  });
});
