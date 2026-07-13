import type { Contact } from "#entities/contact/types.js";
import type { ApiErrorResponse } from "#errors/api-error-response/types.js";

export interface SyncConflictErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse["error"] & {
    code: "sync_conflict";
    details: { contact: Contact };
  };
}
