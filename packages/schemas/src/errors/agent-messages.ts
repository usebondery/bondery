/**
 * Builds `agent_message`: the recovery step an AI agent needs.
 *
 * An agent must repair a failed call without a human. `message` states WHAT
 * failed for a developer reading logs. `agent_message` adds HOW to fix the
 * call, so the model can retry on its own.
 *
 * Every error body carries this field. Codes without a specific hint fall
 * back to the docs link, so the field is never empty.
 */
import { type ApiErrorCode, getErrorDefinition } from "./api-error-codes.generated.js";

/**
 * HOW sentence per code. Prefer a named tool and a named argument, because
 * that is what the model can act on without another lookup.
 */
const AGENT_RECOVERY_HINTS: Partial<Record<ApiErrorCode, string>> = {
  auth_required: "Reconnect the client and approve access, then retry the call.",
  bad_request:
    "Check the argument names and types against the tool input schema, then retry the call.",
  chat_quota_exceeded:
    "Tell the user the chat quota is used up for now. Do not retry until the quota resets.",
  contact_delete_self_forbidden:
    "Choose another personId. Your own contact card cannot be deleted.",
  contact_not_found:
    "Call search_contacts with the person's name and retry with a personId from the results.",
  email_service_not_configured:
    "Tell the user. The server cannot send email until the operator configures it.",
  extension_outdated: "Ask the user to update the browser extension, then retry the call.",
  group_not_found: "Call get_groups or search_groups and retry with a groupId from the results.",
  idempotency_key_in_progress:
    "Read the Retry-After header, wait that many seconds, then retry the same call with the same Idempotency-Key.",
  idempotency_key_invalid:
    "Send an Idempotency-Key of 1 to 255 printable ASCII characters with no spaces, then retry the call.",
  idempotency_key_mismatch:
    "Send a new Idempotency-Key. This key already belongs to a different request.",
  idempotency_key_unsupported:
    "Remove the Idempotency-Key header and retry the call. This route does not store a replay.",
  idempotency_response_omitted:
    "Send a new Idempotency-Key and retry the call. The original response was not stored.",
  important_date_duplicate: "Remove the duplicate date from the list and retry the same call.",
  interaction_not_found:
    "Call get_interactions with the personId and retry with an interactionId from the results.",
  internal_server_error:
    "Retry the call once with the same arguments. If it fails again, tell the user the request_id and report the failure.",
  not_found: "Check the resource id, then retry the call.",
  rate_limit_exceeded:
    "Wait for the number of seconds in retry_after, then retry the same call. Do not retry in a loop.",
  relationship_already_exists:
    "Call get_relationships for that personId and update the existing relationship instead of creating another.",
  relationship_not_found:
    "Call get_relationships with the personId and retry with a relationshipId from the results.",
  service_unavailable:
    "Retry the call after a short wait. The server dependency is temporarily unavailable.",
  session_not_fresh: "Ask the user to confirm the action again, then retry the call.",
  sync_conflict:
    "Read the resource again to get the current version, reapply the change, then retry.",
  tag_label_exists:
    "Call search_tags and reuse the existing tag id instead of creating a duplicate label.",
  tag_not_found: "Call get_tags or search_tags and retry with a tagId from the results.",
  validation_error:
    "Read details for the rejected fields, correct those arguments, then retry the call.",
};

const FALLBACK_HINT = "Read doc_url for the recovery steps, then retry the call.";

export function agentRecoveryHint(code: string): string {
  return AGENT_RECOVERY_HINTS[code as ApiErrorCode] ?? FALLBACK_HINT;
}

/** Joins the developer message and the hint as two sentences. */
function joinSentences(message: string, hint: string): string {
  const base = message.trim();
  if (base.length === 0) {
    return hint;
  }
  const terminated = /[.!?]$/.test(base) ? base : `${base}.`;
  return `${terminated} ${hint}`;
}

/**
 * Produces `agent_message` from the message that goes on the wire.
 *
 * A 5xx carries an operation-specific code (for example `contact_update_failed`)
 * but the agent advice is the same as for `internal_server_error`, so server
 * errors use the retry hint.
 *
 * Idempotent: a message that already states the hint is not repeated.
 */
export function buildAgentMessage(code: string, message: string): string {
  const hintKey = isServerErrorCode(code) ? "internal_server_error" : code;
  const hint = agentRecoveryHint(hintKey);
  if (message.includes(hint)) {
    return message.trim();
  }
  return joinSentences(message, hint);
}

function isServerErrorCode(code: string): boolean {
  const definition = getErrorDefinition(code as ApiErrorCode);
  return definition !== undefined && definition.httpStatus >= 500;
}
