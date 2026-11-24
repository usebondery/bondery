import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../../domains/_shared/context.js";
import {
  captureServerException,
  rootCause,
  type ServerExceptionContext,
} from "./capture-server-exception.js";
import { scrubExceptionEvent } from "./posthog-client.js";

type CaptureCall = { error: unknown; properties: unknown };

function fakeClient() {
  const calls: CaptureCall[] = [];
  return {
    calls,
    client: {
      captureException(error: unknown, options?: { properties?: Record<string, unknown> }) {
        calls.push({ error, properties: options?.properties });
      },
    },
  };
}

const context: ServerExceptionContext = {
  code: "failed_to_process_webhook",
  method: "POST",
  requestId: "req-1",
  route: "/webhooks/stripe",
  statusCode: 500,
};

describe("rootCause", () => {
  it("returns the innermost Error in a cause chain", () => {
    const database = new Error("connection refused");
    const upsert = new DomainError("x", 500, "billing_subscription_upsert_failed", database);
    const webhook = new DomainError("x", 500, "failed_to_process_webhook", upsert);

    assert.equal(rootCause(webhook), database);
  });

  it("returns the error itself when there is no Error cause", () => {
    const plain = new Error("boom");
    const withTextCause = new DomainError("x", 500, "failed_to_process_webhook", "not an error");

    assert.equal(rootCause(plain), plain);
    assert.equal(rootCause(withTextCause), withTextCause);
  });
});

describe("scrubExceptionEvent", () => {
  it("removes email addresses from exception messages and keeps the rest", () => {
    const event = {
      event: "$exception",
      properties: {
        $exception_list: [
          { stacktrace: { frames: [] }, type: "Error", value: "550 mailbox a@example.com gone" },
          { type: "Error", value: "connection refused" },
        ],
        request_id: "req-1",
      },
    };

    assert.deepEqual(scrubExceptionEvent(event), {
      event: "$exception",
      properties: {
        $exception_list: [
          { stacktrace: { frames: [] }, type: "Error", value: "550 mailbox [redacted-email] gone" },
          { type: "Error", value: "connection refused" },
        ],
        request_id: "req-1",
      },
    });
  });

  it("keeps the event options and uuid, so a personless exception stays personless", () => {
    // posthog-node 6 sends processing options next to `properties`. An exception without a
    // distinct id carries `process_person_profile: false`. A hook that builds a new message
    // and drops `options` would make PostHog create a person for the generated id.
    const event = {
      event: "$exception",
      options: { process_person_profile: false },
      properties: {
        $exception_list: [{ type: "Error", value: "550 mailbox a@example.com gone" }],
      },
      uuid: "0190f5f0-0000-7000-8000-000000000000",
    };

    const scrubbed = scrubExceptionEvent(event);

    assert.deepEqual(scrubbed?.options, { process_person_profile: false });
    assert.equal(scrubbed?.uuid, event.uuid);
    assert.deepEqual(scrubbed?.properties?.$exception_list, [
      { type: "Error", value: "550 mailbox [redacted-email] gone" },
    ]);
  });

  it("passes other events and null through unchanged", () => {
    const productEvent = { event: "billing:subscription_create", properties: { plan: "premium" } };

    assert.equal(scrubExceptionEvent(productEvent), productEvent);
    assert.equal(scrubExceptionEvent(null), null);
  });
});

describe("captureServerException", () => {
  it("reports a 5xx with the root cause, request context and no user id", () => {
    const { calls, client } = fakeClient();
    const database = new Error("connection refused");
    const error = new DomainError("x", 500, "failed_to_process_webhook", database);

    captureServerException(error, context, client);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].error, database);
    assert.deepEqual(calls[0].properties, {
      error_code: "failed_to_process_webhook",
      http_method: "POST",
      http_route: "/webhooks/stripe",
      http_status_code: 500,
      request_id: "req-1",
      service: "bondery-api",
    });
  });

  it("does not report 4xx responses", () => {
    const { calls, client } = fakeClient();

    captureServerException(new Error("bad input"), { ...context, statusCode: 400 }, client);
    captureServerException(new Error("slow down"), { ...context, statusCode: 429 }, client);

    assert.equal(calls.length, 0);
  });

  it("does nothing without a client and never throws when capture fails", () => {
    assert.doesNotThrow(() => captureServerException(new Error("boom"), context, null));
    assert.doesNotThrow(() =>
      captureServerException(new Error("boom"), context, {
        captureException() {
          throw new Error("posthog is down");
        },
      }),
    );
  });
});
