/**
 * Fail when Mailpit HTTP is not reachable at 127.0.0.1:26641.
 */
const MAILPIT_INFO_URL = "http://127.0.0.1:26641/api/v1/info";

export async function assertMailpitReady() {
  try {
    const response = await fetch(MAILPIT_INFO_URL, { signal: AbortSignal.timeout(5_000) });
    if (response.ok) {
      return;
    }
  } catch {
    // Fall through to the same operator message.
  }

  throw new Error(
    "Mailpit is not running at http://127.0.0.1:26641. Start it with `pnpm run start:mailpit`.",
  );
}
