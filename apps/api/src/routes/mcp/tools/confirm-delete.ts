/**
 * MCP 2026-07-28 delete confirm. Each POST builds a new McpServer, so elicit
 * state cannot live in memory. `requestState` is an HMAC blob (user, tool,
 * args, preview, expiry) signed with BONDERY_PRIVATE_SERVICE_SECRET.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  acceptedContent,
  type CallToolResult,
  type InputRequiredResult,
  inputRequired,
  inputResponse,
} from "@modelcontextprotocol/server";
import { badRequest, serviceUnavailable } from "../../../lib/platform/errors/http-errors.js";
import { mcpJsonResult } from "./json.js";

export const MCP_DELETE_CONFIRM_KEY = "confirm";
export const MCP_DELETE_CONFIRM_TTL_MS = 5 * 60 * 1000;
const REQUEST_STATE_VERSION = "v1";
const INVALID_CONFIRMATION_MESSAGE = "Invalid or expired confirmation";

function confirmActionSchema(description: string) {
  return {
    properties: {
      confirm: {
        description,
        type: "boolean" as const,
      },
    },
    required: ["confirm"],
    type: "object" as const,
  };
}

export type McpDeleteConfirmExtra = {
  mcpReq: {
    inputResponses?: Record<string, unknown>;
    requestState: () => unknown;
  };
};

type SignedDeletePayload = {
  args: string;
  exp: number;
  preview: string;
  sub: string;
  tool: string;
};

export function canonicalMcpToolArgs(args: Record<string, unknown>): string {
  return JSON.stringify(sortJson(args));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortJson(record[key])]),
    );
  }
  return value;
}

function getMcpHmacSecret(): string {
  const secret = process.env.BONDERY_PRIVATE_SERVICE_SECRET;
  return typeof secret === "string" ? secret : "";
}

function hmacSignature(secret: string, payloadB64: string): string {
  return createHmac("sha256", secret).update(payloadB64, "utf8").digest("base64url");
}

function signaturesMatch(secret: string, payloadB64: string, signatureB64: string): boolean {
  let actual: Buffer;
  try {
    actual = Buffer.from(signatureB64, "base64url");
  } catch {
    return false;
  }
  const expected = Buffer.from(hmacSignature(secret, payloadB64), "base64url");
  if (actual.length !== expected.length || actual.length === 0) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export function signMcpDeleteRequestState(params: {
  args: Record<string, unknown>;
  nowMs?: number;
  preview: string;
  secret: string;
  ttlMs?: number;
  toolName: string;
  userId: string;
}): string {
  const nowMs = params.nowMs ?? Date.now();
  const payload: SignedDeletePayload = {
    args: canonicalMcpToolArgs(params.args),
    exp: Math.floor((nowMs + (params.ttlMs ?? MCP_DELETE_CONFIRM_TTL_MS)) / 1000),
    preview: params.preview,
    sub: params.userId,
    tool: params.toolName,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${REQUEST_STATE_VERSION}.${payloadB64}.${hmacSignature(params.secret, payloadB64)}`;
}

export function verifyMcpDeleteRequestState(params: {
  args: Record<string, unknown>;
  nowMs?: number;
  requestState: string;
  secret: string;
  toolName: string;
  userId: string;
}): { ok: true } | { ok: false } {
  if (!params.secret) {
    return { ok: false };
  }
  const parts = params.requestState.split(".");
  if (parts.length !== 3 || parts[0] !== REQUEST_STATE_VERSION) {
    return { ok: false };
  }
  const payloadB64 = parts[1];
  const signatureB64 = parts[2];
  if (!payloadB64 || !signatureB64) {
    return { ok: false };
  }
  if (!signaturesMatch(params.secret, payloadB64, signatureB64)) {
    return { ok: false };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false };
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.args !== "string" || typeof record.exp !== "number") {
    return { ok: false };
  }
  if (typeof record.sub !== "string" || typeof record.tool !== "string") {
    return { ok: false };
  }
  const nowSeconds = Math.floor((params.nowMs ?? Date.now()) / 1000);
  if (record.exp < nowSeconds) {
    return { ok: false };
  }
  if (record.sub !== params.userId || record.tool !== params.toolName) {
    return { ok: false };
  }
  if (record.args !== canonicalMcpToolArgs(params.args)) {
    return { ok: false };
  }
  return { ok: true };
}

type ConfirmMcpActionParams = {
  args: Record<string, unknown>;
  confirmDescription?: string;
  extra: McpDeleteConfirmExtra;
  onConfirm: () => Promise<CallToolResult>;
  preview: string;
  toolName: string;
  userId: string;
};

/**
 * After ownership/not-found checks: first call elicits; retry with
 * inputResponses + requestState either runs onConfirm, cancels, or errors.
 */
export async function confirmMcpAction(
  params: ConfirmMcpActionParams,
): Promise<CallToolResult | InputRequiredResult> {
  const secret = getMcpHmacSecret();
  if (!secret) {
    throw serviceUnavailable();
  }

  const confirmDescription = params.confirmDescription ?? "Confirm this delete";
  const responses = params.extra.mcpReq.inputResponses;
  const view = inputResponse(responses, MCP_DELETE_CONFIRM_KEY);
  if (view.kind === "missing") {
    return inputRequired({
      inputRequests: {
        [MCP_DELETE_CONFIRM_KEY]: inputRequired.elicit({
          message: params.preview,
          mode: "form",
          requestedSchema: confirmActionSchema(confirmDescription),
        }),
      },
      requestState: signMcpDeleteRequestState({
        args: params.args,
        preview: params.preview,
        secret,
        toolName: params.toolName,
        userId: params.userId,
      }),
    });
  }

  const echoedState = params.extra.mcpReq.requestState();
  const requestState = typeof echoedState === "string" ? echoedState : "";
  const verified = verifyMcpDeleteRequestState({
    args: params.args,
    requestState,
    secret,
    toolName: params.toolName,
    userId: params.userId,
  });
  if (!verified.ok) {
    throw badRequest(INVALID_CONFIRMATION_MESSAGE, "bad_request");
  }

  if (view.kind !== "elicit" || view.action !== "accept") {
    // `message` satisfies delete `outputSchema`; `cancelled` is extra signal for hosts.
    return mcpJsonResult({ cancelled: true, message: "Cancelled" });
  }

  const content = acceptedContent<{ confirm: boolean }>(responses, MCP_DELETE_CONFIRM_KEY);
  if (content?.confirm !== true) {
    return mcpJsonResult({ cancelled: true, message: "Cancelled" });
  }

  return params.onConfirm();
}

/** Delete-specific confirm (same HMAC elicitation as {@link confirmMcpAction}). */
export async function confirmMcpDelete(
  params: Omit<ConfirmMcpActionParams, "confirmDescription">,
): Promise<CallToolResult | InputRequiredResult> {
  return confirmMcpAction({ ...params, confirmDescription: "Confirm this delete" });
}
