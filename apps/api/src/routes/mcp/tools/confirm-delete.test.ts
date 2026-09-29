import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isInputRequiredResult } from "@modelcontextprotocol/server";
import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  canonicalMcpToolArgs,
  confirmMcpDelete,
  MCP_DELETE_CONFIRM_KEY,
  signMcpDeleteRequestState,
  verifyMcpDeleteRequestState,
} from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";

const SECRET = "unit-test-mcp-delete-hmac-secret-32ch";
const ARGS = { groupId: "11111111-1111-4111-8111-111111111111" };
const USER_ID = "22222222-2222-4222-8222-222222222222";

function mockMcpCtx(): DomainContext {
  return { requestId: "mcp-confirm-test", user: { email: "t@example.com", id: USER_ID } };
}

function structuredErrorCode(result: unknown): string | undefined {
  if (!result || typeof result !== "object" || !("structuredContent" in result)) {
    return undefined;
  }
  const content = (result as { structuredContent?: unknown }).structuredContent;
  if (!content || typeof content !== "object" || !("error" in content)) {
    return undefined;
  }
  const error = (content as { error?: { code?: unknown } }).error;
  return typeof error?.code === "string" ? error.code : undefined;
}

function tamperMcpRequestState(requestState: string): string {
  const parts = requestState.split(".");
  const signature = parts[2] ?? "";
  if (signature.length === 0) {
    return `${requestState}x`;
  }
  const flipped = signature.startsWith("A") ? "B" : "A";
  return `${parts[0]}.${parts[1]}.${flipped}${signature.slice(1)}`;
}

describe("canonicalMcpToolArgs", () => {
  it("sorts object keys so argument order does not change the digest", () => {
    assert.equal(
      canonicalMcpToolArgs(
        JSON.parse('{"personIds":["b","a"],"groupId":"g"}') as Record<string, unknown>,
      ),
      canonicalMcpToolArgs(
        JSON.parse('{"groupId":"g","personIds":["b","a"]}') as Record<string, unknown>,
      ),
    );
    assert.notEqual(
      canonicalMcpToolArgs({ personIds: ["a", "b"] }),
      canonicalMcpToolArgs({ personIds: ["b", "a"] }),
    );
  });
});

describe("signMcpDeleteRequestState / verifyMcpDeleteRequestState", () => {
  it("accepts a fresh token for the same user, tool, and args", () => {
    const requestState = signMcpDeleteRequestState({
      args: ARGS,
      preview: "Delete group Friends?",
      secret: SECRET,
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(
      verifyMcpDeleteRequestState({
        args: ARGS,
        requestState,
        secret: SECRET,
        toolName: "delete_group",
        userId: USER_ID,
      }).ok,
      true,
    );
  });

  it("rejects a tampered payload, expired token, or mismatched sub/args/tool", () => {
    const nowMs = 1_700_000_000_000;
    const requestState = signMcpDeleteRequestState({
      args: ARGS,
      nowMs,
      preview: "Delete group Friends?",
      secret: SECRET,
      toolName: "delete_group",
      userId: USER_ID,
    });
    const tampered = tamperMcpRequestState(requestState);
    assert.equal(
      verifyMcpDeleteRequestState({
        args: ARGS,
        requestState: tampered,
        secret: SECRET,
        toolName: "delete_group",
        userId: USER_ID,
      }).ok,
      false,
    );
    assert.equal(
      verifyMcpDeleteRequestState({
        args: ARGS,
        nowMs: nowMs + 6 * 60 * 1000,
        requestState,
        secret: SECRET,
        toolName: "delete_group",
        userId: USER_ID,
      }).ok,
      false,
    );
    assert.equal(
      verifyMcpDeleteRequestState({
        args: ARGS,
        requestState,
        secret: SECRET,
        toolName: "delete_group",
        userId: "other-user",
      }).ok,
      false,
    );
    assert.equal(
      verifyMcpDeleteRequestState({
        args: { groupId: "33333333-3333-4333-8333-333333333333" },
        requestState,
        secret: SECRET,
        toolName: "delete_group",
        userId: USER_ID,
      }).ok,
      false,
    );
    assert.equal(
      verifyMcpDeleteRequestState({
        args: ARGS,
        requestState,
        secret: SECRET,
        toolName: "delete_tag",
        userId: USER_ID,
      }).ok,
      false,
    );
  });
});

describe("confirmMcpDelete", () => {
  const previousSecret = process.env.BONDERY_PRIVATE_SERVICE_SECRET;

  afterEach(() => {
    process.env.BONDERY_PRIVATE_SERVICE_SECRET = previousSecret;
  });

  it("returns input_required on the first call and does not run onConfirm", async () => {
    process.env.BONDERY_PRIVATE_SERVICE_SECRET = SECRET;
    let confirmed = false;
    const result = await confirmMcpDelete({
      args: ARGS,
      extra: { mcpReq: { requestState: () => undefined } },
      onConfirm: async () => {
        confirmed = true;
        return mcpJsonResult({ deletedId: ARGS.groupId });
      },
      preview: "Delete group Friends?",
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(isInputRequiredResult(result), true);
    assert.equal(confirmed, false);
    if (isInputRequiredResult(result)) {
      assert.ok(result.requestState);
      assert.ok(result.inputRequests?.[MCP_DELETE_CONFIRM_KEY]);
    }
  });

  it("cancels on decline and deletes only after accept plus a valid requestState", async () => {
    process.env.BONDERY_PRIVATE_SERVICE_SECRET = SECRET;
    const first = await confirmMcpDelete({
      args: ARGS,
      extra: { mcpReq: { requestState: () => undefined } },
      onConfirm: async () => mcpJsonResult({ deletedId: ARGS.groupId }),
      preview: "Delete group Friends?",
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(isInputRequiredResult(first), true);
    const requestState = isInputRequiredResult(first) ? first.requestState : undefined;
    assert.ok(requestState);

    let confirmed = false;
    const declined = await confirmMcpDelete({
      args: ARGS,
      extra: {
        mcpReq: {
          inputResponses: { [MCP_DELETE_CONFIRM_KEY]: { action: "decline" } },
          requestState: () => requestState,
        },
      },
      onConfirm: async () => {
        confirmed = true;
        return mcpJsonResult({ deletedId: ARGS.groupId });
      },
      preview: "Delete group Friends?",
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(confirmed, false);
    assert.equal(isInputRequiredResult(declined), false);
    assert.deepEqual("structuredContent" in declined ? declined.structuredContent : null, {
      cancelled: true,
      message: "Cancelled",
    });

    const accepted = await confirmMcpDelete({
      args: ARGS,
      extra: {
        mcpReq: {
          inputResponses: {
            [MCP_DELETE_CONFIRM_KEY]: { action: "accept", content: { confirm: true } },
          },
          requestState: () => requestState,
        },
      },
      onConfirm: async () => {
        confirmed = true;
        return mcpJsonResult({ deletedId: ARGS.groupId });
      },
      preview: "Delete group Friends?",
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(confirmed, true);
    assert.equal(isInputRequiredResult(accepted), false);
    assert.deepEqual("structuredContent" in accepted ? accepted.structuredContent : null, {
      deletedId: ARGS.groupId,
    });
  });

  it("does not delete when requestState is tampered", async () => {
    process.env.BONDERY_PRIVATE_SERVICE_SECRET = SECRET;
    const first = await confirmMcpDelete({
      args: ARGS,
      extra: { mcpReq: { requestState: () => undefined } },
      onConfirm: async () => mcpJsonResult({ deletedId: ARGS.groupId }),
      preview: "Delete group Friends?",
      toolName: "delete_group",
      userId: USER_ID,
    });
    assert.equal(isInputRequiredResult(first), true);
    const requestState = isInputRequiredResult(first) ? (first.requestState ?? "") : "";
    const tampered = tamperMcpRequestState(requestState);
    let confirmed = false;
    const result = await runMcpTool(mockMcpCtx(), () =>
      confirmMcpDelete({
        args: ARGS,
        extra: {
          mcpReq: {
            inputResponses: {
              [MCP_DELETE_CONFIRM_KEY]: { action: "accept", content: { confirm: true } },
            },
            requestState: () => tampered,
          },
        },
        onConfirm: async () => {
          confirmed = true;
          return mcpJsonResult({ deletedId: ARGS.groupId });
        },
        preview: "Delete group Friends?",
        toolName: "delete_group",
        userId: USER_ID,
      }),
    );
    assert.equal(confirmed, false);
    assert.equal(isInputRequiredResult(result), false);
    assert.equal("isError" in result ? result.isError : false, true);
    assert.equal(structuredErrorCode(result), "bad_request");
  });

  it("returns service_unavailable when the HMAC secret is missing", async () => {
    delete process.env.BONDERY_PRIVATE_SERVICE_SECRET;
    const result = await runMcpTool(mockMcpCtx(), () =>
      confirmMcpDelete({
        args: ARGS,
        extra: { mcpReq: { requestState: () => undefined } },
        onConfirm: async () => mcpJsonResult({ deletedId: ARGS.groupId }),
        preview: "Delete group Friends?",
        toolName: "delete_group",
        userId: USER_ID,
      }),
    );
    assert.equal(isInputRequiredResult(result), false);
    assert.equal("isError" in result ? result.isError : false, true);
    assert.equal(structuredErrorCode(result), "service_unavailable");
  });
});
