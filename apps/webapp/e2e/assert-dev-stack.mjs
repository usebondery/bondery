/**
 * Fail when Mailpit, the API, or the webapp is not already running.
 * Playwright does not start those processes.
 */
import { assertMailpitReady } from "./mailpit-ready.mjs";
import { resolveE2ePublicUrls } from "./resolve-e2e-public-urls.mjs";

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return { error: undefined, ok: response.ok, reachable: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, ok: false, reachable: false, status: null };
  }
}

function formatProbe(label, url, result) {
  if (!result.reachable) {
    return `${label}: ${url} UNREACHABLE (${result.error ?? "connection failed"})`;
  }
  return `${label}: ${url} HTTP ${result.status}${result.ok ? " OK" : ""}`;
}

export async function assertDevStackReady() {
  await assertMailpitReady();

  const { apiUrl, cookieDomain, webappUrl } = resolveE2ePublicUrls();
  const apiHealth = `${apiUrl}/health/live`;
  const webappHealth = `${webappUrl}/api/health/live`;
  const [api, webappBff] = await Promise.all([probe(apiHealth), probe(webappHealth)]);

  if (!api.reachable || !webappBff.reachable || !api.ok || !webappBff.ok) {
    throw new Error(
      `E2E requires a running Mailpit + API + webapp stack.\n` +
        `  ${formatProbe("API", apiHealth, api)}\n` +
        `  ${formatProbe("Webapp BFF", webappHealth, webappBff)}\n\n` +
        `Start the stack, then retry:\n` +
        `  pnpm run start:mailpit\n` +
        `  pnpm run dev:webapp-api`,
    );
  }

  return { apiUrl, cookieDomain, webappUrl };
}
