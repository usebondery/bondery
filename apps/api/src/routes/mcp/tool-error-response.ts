/**
 * Rewrites tool failures that the MCP SDK produced itself.
 *
 * `tools/call` validates arguments inside the SDK and answers a plain string
 * with `isError: true` — no `code`, no `doc_url`. A model cannot read that.
 * This layer converts those results into the agent-facing error envelope, so
 * every failure an agent sees has a message, `agent_message`, and a docs link.
 *
 * Results that already carry the nested envelope are left untouched.
 */
import {
  type ApiErrorBody,
  type ApiErrorType,
  buildAgentMessage,
  getErrorDocUrl,
  isApiErrorCode,
} from "@bondery/schemas/errors";
import { URLS } from "../../lib/platform/config.js";

const INPUT_VALIDATION_PREFIX = "Input validation error:";
const OUTPUT_VALIDATION_PREFIX = "Output validation error:";
const TOOL_NOT_FOUND_RE = /^Tool (.+?) not found$/;
const TOOL_DISABLED_RE = /^Tool (.+?) disabled$/;

function envelope(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): { error: ApiErrorBody } {
  const website = (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
  const known = isApiErrorCode(code);
  const resolved = known ? code : "internal_server_error";
  const type: ApiErrorType = code === "validation_error" ? "invalid_request_error" : "api_error";

  return {
    error: {
      agent_message: buildAgentMessage(resolved, message),
      code: resolved,
      details,
      doc_url: getErrorDocUrl(resolved, website),
      message,
      request_id: requestId,
      type,
    },
  };
}

function isEnvelope(text: string): boolean {
  if (!text.startsWith("{")) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !("error" in parsed)) {
      return false;
    }
    const body = (parsed as { error: unknown }).error;
    if (!body || typeof body !== "object") {
      return false;
    }
    const record = body as { agent_message?: unknown; code?: unknown };
    return typeof record.code === "string" && typeof record.agent_message === "string";
  } catch {
    return false;
  }
}

/**
 * Maps an SDK-generated tool error string to the agent-facing envelope.
 * Returns null when the text already carries one.
 */
export function rewriteToolErrorText(
  text: string,
  requestId: string,
): { error: ApiErrorBody } | null {
  if (isEnvelope(text)) {
    return null;
  }

  if (text.startsWith(INPUT_VALIDATION_PREFIX) || text.startsWith(OUTPUT_VALIDATION_PREFIX)) {
    const isInput = text.startsWith(INPUT_VALIDATION_PREFIX);
    const detail = text.slice(
      (isInput ? INPUT_VALIDATION_PREFIX : OUTPUT_VALIDATION_PREFIX).length,
    );
    const toolMatch = detail.match(/tool ([a-z0-9_]+)/i);
    const toolName = toolMatch?.[1];
    const what = toolName ? `Invalid arguments for \`${toolName}\`` : "Invalid tool arguments";
    const why = isInput
      ? "the arguments did not match the tool input schema"
      : "the tool returned data that did not match its output schema";
    return envelope(
      isInput ? "validation_error" : "internal_server_error",
      `${what}: ${why}`,
      requestId,
      { issues: detail.trim(), toolName: toolName ?? "(unknown)" },
    );
  }

  const notFound = text.match(TOOL_NOT_FOUND_RE) ?? text.match(TOOL_DISABLED_RE);
  if (notFound) {
    return envelope(
      "validation_error",
      `Tool \`${notFound[1]}\` is not available on this server`,
      requestId,
      { toolName: notFound[1] ?? "(unknown)" },
    );
  }

  return envelope("internal_server_error", text.trim(), requestId);
}

type JsonRpcPayload = {
  error?: { code?: unknown; data?: unknown; message?: unknown };
  result?: {
    content?: Array<{ text?: unknown; type?: unknown }>;
    isError?: unknown;
  };
};

/**
 * Rewrites every SDK-generated tool error in a JSON-RPC payload, in place.
 * Returns true when at least one result changed.
 */
export function rewriteMcpToolErrors(payload: unknown, requestId: string): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const message = payload as JsonRpcPayload;
  const result = message.result;
  if (result?.isError !== true) {
    return false;
  }
  const blocks = result.content;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return false;
  }
  const first = blocks[0];
  if (!first || typeof first.text !== "string") {
    return false;
  }

  const replacement = rewriteToolErrorText(first.text, requestId);
  if (!replacement) {
    return false;
  }

  first.text = JSON.stringify(replacement);
  (result as { structuredContent?: unknown }).structuredContent = replacement;
  return true;
}

/**
 * Applies {@link rewriteMcpToolErrors} to a JSON response body. SSE bodies pass
 * through untouched, and so does any body that needs no rewrite.
 */
export async function rewriteMcpFetchResponse(
  response: Response,
  requestId: string,
): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return response;
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(text, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  const rewrote = Array.isArray(payload)
    ? payload.map((entry) => rewriteMcpToolErrors(entry, requestId)).some(Boolean)
    : rewriteMcpToolErrors(payload, requestId);

  const body = rewrote ? JSON.stringify(payload) : text;
  const headers = new Headers(response.headers);
  if (rewrote) {
    headers.delete("content-length");
  }
  return new Response(body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
