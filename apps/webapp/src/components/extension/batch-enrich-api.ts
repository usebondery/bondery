/** Number of consecutive timeouts before the circuit breaker aborts the loop. */
export const MAX_CONSECUTIVE_TIMEOUTS = 5;

/** Scrape can take 180s; API (history / logos / photo / geo) can take another ~90s. */
export const ENRICH_VIA_EXTENSION_TIMEOUT_MS = 270_000;

export const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
export const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";

export function enrichSinglePersonViaExtension(
  contactId: string,
  linkedinHandle: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ error: "timeout", success: false });
    }, ENRICH_VIA_EXTENSION_TIMEOUT_MS);

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
