import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../domains/_shared/context.js";
import { GENERIC_500_MESSAGE } from "../lib/platform/errors/codes.js";
import {
  toAgentToolErrorResponse,
  toApiErrorResponse,
} from "../lib/platform/errors/to-api-error-response.js";

describe("toApiErrorResponse", () => {
  it("maps DomainError 4xx with catalog code, type, message, and doc_url", () => {
    const error = new DomainError("Contact not found", 404, "contact_not_found");
    const body = toApiErrorResponse(error, "req-4xx");

    assert.equal(body.error.code, "contact_not_found");
    assert.equal(body.error.message, "Contact not found");
    assert.equal(body.error.type, "not_found_error");
    assert.equal(body.error.request_id, "req-4xx");
    assert.match(body.error.doc_url, /\/docs\/api\/errors\/contact_not_found$/);
  });

  it("sanitizes DomainError 5xx to GENERIC_500_MESSAGE and keeps the catalog code", () => {
    const error = new DomainError("postgres connection failed", 500, "contact_update_failed");
    const body = toApiErrorResponse(error, "req-5xx");

    assert.equal(body.error.message, GENERIC_500_MESSAGE);
    assert.equal(body.error.code, "contact_update_failed");
    assert.equal(body.error.request_id, "req-5xx");
    assert.equal(body.error.message.includes("postgres"), false);
  });

  it("maps unknown Error to internal_server_error and GENERIC_500_MESSAGE", () => {
    const body = toApiErrorResponse(new Error("something broke"), "req-unknown");

    assert.equal(body.error.code, "internal_server_error");
    assert.equal(body.error.message, GENERIC_500_MESSAGE);
    assert.equal(body.error.type, "api_error");
    assert.equal(body.error.request_id, "req-unknown");
    assert.equal(body.error.message.includes("something broke"), false);
  });

  it("always includes agent_message, even on the REST path", () => {
    const body = toApiErrorResponse(
      new DomainError("Contact not found", 404, "contact_not_found"),
      "req-rest",
    );

    assert.equal(body.error.message, "Contact not found");
    assert.equal(typeof body.error.agent_message, "string");
    assert.match(body.error.agent_message, /^Contact not found\. /);
    assert.match(body.error.agent_message, /search_contacts/);
  });

  it("agent_message is never empty for a code with no specific hint", () => {
    const body = toApiErrorResponse(
      new DomainError("Settings could not be loaded", 500, "settings_fetch_failed"),
      "req-fallback",
    );

    assert.ok(body.error.agent_message.length > 0);
    assert.match(body.error.agent_message, /Retry the call once/);
  });

  it("agent_message keeps a sanitized 500 free of the cause", () => {
    const body = toApiErrorResponse(
      new DomainError("postgres connection failed", 500, "contact_update_failed"),
      "req-500",
    );

    assert.equal(body.error.agent_message.includes("postgres"), false);
    assert.match(body.error.agent_message, /Retry the call once/);
  });

  it("does not repeat a recovery step the message already states", () => {
    const message =
      "Contact not found. Call search_contacts with the person's name and retry with a personId from the results.";
    const body = toApiErrorResponse(
      new DomainError(message, 404, "contact_not_found"),
      "req-idempotent",
    );

    assert.equal(body.error.agent_message.split("search_contacts").length - 1, 1);
  });
});

describe("toAgentToolErrorResponse", () => {
  it("promotes the recovery step into message for a model reader", () => {
    const body = toAgentToolErrorResponse(
      new DomainError("Contact not found", 404, "contact_not_found"),
      "req-agent",
    );

    assert.equal(body.error.message, body.error.agent_message);
    assert.match(body.error.message, /search_contacts/);
    assert.match(body.error.doc_url, /\/docs\/api\/errors\/contact_not_found$/);
  });

  it("keeps agent_message on an unknown error", () => {
    const body = toAgentToolErrorResponse(new Error("boom"), "req-agent-unknown");

    assert.equal(body.error.code, "internal_server_error");
    assert.equal(body.error.message, body.error.agent_message);
    assert.match(body.error.agent_message, /Retry the call once/);
  });
});
