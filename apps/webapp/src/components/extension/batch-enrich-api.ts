import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { clientApiFetch } from "@/lib/api/client";

/** Number of consecutive timeouts before the circuit breaker aborts the loop. */
export const MAX_CONSECUTIVE_TIMEOUTS = 5;

export const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
export const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";

export interface QueueItem {
  firstName: string | null;
  lastName: string | null;
  linkedinHandle: string | null;
  personId: string;
  queueItemId: string;
}

export interface NextBatchResponse {
  items: QueueItem[];
}

export async function getResponseErrorDescription(
  response: Response,
  fallbackDescription: string,
): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      message?: string;
    };
    const detail = data?.error ?? data?.message;
    if (detail && detail.trim().length > 0) {
      return `${fallbackDescription} (${detail})`;
    }
  } catch {
    try {
      const text = await response.text();
      if (text.trim().length > 0) {
        return `${fallbackDescription} (${text.trim()})`;
      }
    } catch {
      // Ignore parse errors and return fallback below.
    }
  }

  return fallbackDescription;
}

export async function patchEnrichQueueItem(
  queueItemId: string,
  status: "completed" | "failed",
  errorMessage?: string,
) {
  await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue/${queueItemId}`, {
    body: JSON.stringify({ errorMessage: errorMessage ?? null, status }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function enrichSinglePersonViaExtension(
  contactId: string,
  linkedinHandle: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ error: "timeout", success: false });
    }, 90_000);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }
      if (event.data?.type !== ENRICH_RESULT_TYPE) {
        return;
      }
      if (event.data?.payload?.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve({
        error: event.data.payload.error,
        success: event.data.payload.success,
      });
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };

    window.addEventListener("message", onMessage);

    window.postMessage(
      {
        payload: { contactId, linkedinHandle, requestId },
        type: ENRICH_REQUEST_TYPE,
      },
      window.location.origin,
    );
  });
}

export async function fetchNextEnrichBatch(): Promise<
  { ok: true; items: QueueItem[] } | { ok: false; response: Response }
> {
  const batchRes = await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue/next-batch`);

  if (!batchRes.ok) {
    return { ok: false, response: batchRes };
  }

  const { items } = (await batchRes.json()) as NextBatchResponse;
  return { items: items ?? [], ok: true };
}

export async function deleteEnrichQueue() {
  await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue`, { method: "DELETE" });
}
