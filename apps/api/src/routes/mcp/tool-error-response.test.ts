import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  rewriteMcpFetchResponse,
  rewriteMcpToolErrors,
  rewriteToolErrorText,
} from "./tool-error-response.js";

const REQUEST_ID = "req-test-1";

describe("rewriteToolErrorText", () => {
  it("converts an SDK input validation error to the agent envelope", () => {
    const rewritten = rewriteToolErrorText(
      "Input validation error: Invalid arguments for tool search_contacts: search: Required",
      REQUEST_ID,
    );
    assert.ok(rewritten);
    assert.equal(rewritten.error.code, "validation_error");
    assert.match(rewritten.error.message, /search_contacts/);
    assert.match(String(rewritten.error.doc_url), /\/docs\/api\/errors\/validation_error$/);
    assert.equal(rewritten.error.request_id, REQUEST_ID);
    assert.equal((rewritten.error.details as { toolName: string }).toolName, "search_contacts");
    assert.match(rewritten.error.agent_message, /correct those arguments/);
  });

  it("converts an SDK output validation error", () => {
    const rewritten = rewriteToolErrorText(
      "Output validation error: Invalid structured content for tool get_contact: bad",
      REQUEST_ID,
    );
    assert.ok(rewritten);
    assert.equal(rewritten.error.code, "internal_server_error");
    assert.match(rewritten.error.agent_message, /Retry the call once/);
  });

  it("converts an unknown tool name", () => {
    const rewritten = rewriteToolErrorText("Tool get_contactt not found", REQUEST_ID);
    assert.ok(rewritten);
    assert.equal(rewritten.error.code, "validation_error");
    assert.match(rewritten.error.agent_message, /correct those arguments/);
    assert.equal((rewritten.error.details as { toolName: string }).toolName, "get_contactt");
  });

  it("always produces agent_message", () => {
    const rewritten = rewriteToolErrorText("some unexpected failure", REQUEST_ID);
    assert.ok(rewritten);
    assert.ok(rewritten.error.agent_message.length > 0);
    assert.equal(rewritten.error.code, "internal_server_error");
  });

  it("leaves an existing envelope untouched", () => {
    const text = JSON.stringify({
      error: {
        agent_message: "do this",
        code: "contact_not_found",
        doc_url: "https://x/y",
        message: "nope",
      },
    });
    assert.equal(rewriteToolErrorText(text, REQUEST_ID), null);
  });
});

describe("rewriteMcpToolErrors", () => {
  it("rewrites a JSON-RPC tool error result in place", () => {
    const payload = {
      id: 1,
      jsonrpc: "2.0",
      result: {
        content: [
          {
            text: "Input validation error: Invalid arguments for tool get_contact: x",
            type: "text",
          },
        ],
        isError: true,
      },
    };
    assert.equal(rewriteMcpToolErrors(payload, REQUEST_ID), true);
    const text = payload.result.content[0].text;
    assert.match(text, /"validation_error"/);
    assert.match(text, /doc_url/);
    assert.equal(
      (payload.result as { structuredContent?: { error: { code: string } } }).structuredContent
        ?.error.code,
      "validation_error",
    );
  });

  it("ignores a successful result", () => {
    const payload = {
      jsonrpc: "2.0",
      result: { content: [{ text: "Input validation error: x", type: "text" }], isError: false },
    };
    assert.equal(rewriteMcpToolErrors(payload, REQUEST_ID), false);
  });

  it("ignores a result that already carries a complete envelope", () => {
    const payload = {
      jsonrpc: "2.0",
      result: {
        content: [
          {
            text: JSON.stringify({
              error: {
                agent_message: "Call search_contacts, then retry.",
                code: "contact_not_found",
                doc_url: "https://usebondery.com/docs/api/errors/contact_not_found",
                message: "Contact not found",
                request_id: "req-1",
                type: "not_found_error",
              },
            }),
            type: "text",
          },
        ],
        isError: true,
      },
    };
    assert.equal(rewriteMcpToolErrors(payload, REQUEST_ID), false);
  });

  it("rewrites a legacy envelope that has no agent_message", () => {
    const payload = {
      jsonrpc: "2.0",
      result: {
        content: [
          {
            text: JSON.stringify({ error: { code: "contact_not_found", message: "nope" } }),
            type: "text",
          },
        ],
        isError: true,
      },
    };
    assert.equal(rewriteMcpToolErrors(payload, REQUEST_ID), true);
  });
});

describe("rewriteMcpFetchResponse", () => {
  it("rewrites a JSON body", async () => {
    const response = new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        result: { content: [{ text: "Tool nope not found", type: "text" }], isError: true },
      }),
      { headers: { "content-type": "application/json" }, status: 200 },
    );
    const rewritten = await rewriteMcpFetchResponse(response, REQUEST_ID);
    const body = await rewritten.text();
    assert.match(body, /validation_error/);
  });

  it("passes an SSE body through untouched", async () => {
    const original = "event: message\ndata: {}\n\n";
    const response = new Response(original, {
      headers: { "content-type": "text/event-stream" },
      status: 200,
    });
    const rewritten = await rewriteMcpFetchResponse(response, REQUEST_ID);
    assert.equal(await rewritten.text(), original);
  });
});
