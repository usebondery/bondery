/**
 * Regenerates the marketing hero image `apps/website/public/images/hero-app-dashboard.png`.
 *
 * Signs in as a dedicated sample account through the local email magic link,
 * makes sure the account holds the Bondery sample dataset, then captures the
 * home dashboard (`/app/home`) at 1440x810 CSS px, 2x, dark theme -> 2880x1620.
 *
 * ## Required services (already running; this does not start any of them)
 *
 * - Postgres, Redis, SeaweedFS (avatars), Mailpit (`pnpm run start:mailpit`)
 * - API + webapp (`pnpm run dev:webapp-api`), public URLs from
 *   `apps/api/.env.development.local` (BONDERY_PUBLIC_API_URL / BONDERY_PUBLIC_WEBAPP_URL)
 * - A Playwright Chromium (`pnpm run test:e2e:install -w webapp`, once per machine)
 *
 * `globalSetup` probes Mailpit, API, and webapp and fails with the start commands when
 * one is down.
 *
 * ## Command (from the repo root)
 *
 *   pnpm --filter webapp run hero-shot
 *
 * ## Env
 *
 * None beyond the API env files the e2e config already loads. The sample account is
 * `hero-shot@example.com`; its sidebar name is set to "Alex".
 *
 * ## Data
 *
 * The account is seeded once: when it has no contacts, the spec uploads
 * `packages/tests/sample-data/bondery/bondery-sample-export.zip` to `POST /api/me/import`
 * (the same route as Settings -> Import -> Bondery JSON). A re-run finds contacts and skips
 * the import, so nothing is duplicated. To start over, delete the account's data in the app.
 *
 * The PNG is written to `.temp/` first, its dimensions are asserted, and only then is it
 * copied over the website asset. A failed run leaves the old image in place.
 */
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { loginWithEmail } from "./email-login";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const sampleZipPath = join(
  repoRoot,
  "packages/tests/sample-data/bondery/bondery-sample-export.zip",
);
const outputPath = join(repoRoot, "apps/website/public/images/hero-app-dashboard.png");
const stagingPath = join(repoRoot, ".temp/hero-app-dashboard.png");

const SAMPLE_EMAIL = "hero-shot@example.com";
const SAMPLE_FIRST_NAME = "Alex";
const EXPECTED_WIDTH = 2880;
const EXPECTED_HEIGHT = 1620;

function note(message: string, detail?: unknown): void {
  const suffix = detail === undefined ? "" : ` ${String(detail)}`;
  process.stdout.write(`${message}${suffix}\n`);
}

function readPngSize(filePath: string): { height: number; width: number } {
  const header = readFileSync(filePath).subarray(0, 26);
  return { height: header.readUInt32BE(20), width: header.readUInt32BE(16) };
}

/** Same-origin BFF call (`/api/*`) using the signed-in browser context cookies. */
function apiHeaders(): Record<string, string> {
  return { "Idempotency-Key": randomUUID() };
}

async function totalContacts(page: Page): Promise<number> {
  const response = await page.request.get("/api/contacts?limit=1&offset=0");
  expect(response.ok(), `GET /api/contacts -> HTTP ${response.status()}`).toBe(true);
  const body = (await response.json()) as { stats?: { totalContacts?: number } };
  const total = body.stats?.totalContacts;
  expect(typeof total, "contacts list response has stats.totalContacts").toBe("number");
  return total as number;
}

async function ensureSampleData(page: Page): Promise<number> {
  const existing = await totalContacts(page);
  if (existing > 0) {
    note(`hero-shot: ${SAMPLE_EMAIL} already has ${existing} contacts, skipping import`);
    return existing;
  }

  note("hero-shot: account is empty, importing the Bondery sample export");
  const response = await page.request.post("/api/me/import", {
    headers: apiHeaders(),
    multipart: {
      file: {
        buffer: readFileSync(sampleZipPath),
        mimeType: "application/zip",
        name: "bondery-sample-export.zip",
      },
    },
    timeout: 180_000,
  });
  expect(
    response.ok(),
    `POST /api/me/import -> HTTP ${response.status()} ${await response.text()}`,
  ).toBe(true);

  const imported = await totalContacts(page);
  expect(imported, "contacts after sample import").toBeGreaterThan(0);
  return imported;
}

/** Dark theme is an account preference (SSR reads it), so set it on the account. */
async function preparePreferences(page: Page): Promise<void> {
  const settings = await page.request.patch("/api/me/settings", {
    data: { colorScheme: "dark" },
    headers: apiHeaders(),
  });
  expect(settings.ok(), `PATCH /api/me/settings -> HTTP ${settings.status()}`).toBe(true);

  // Hide the getting-started rail so the hero shows the dashboard widgets only.
  const dismiss = await page.request.patch("/api/me/settings/getting-started-dismiss", {
    headers: apiHeaders(),
  });
  if (!dismiss.ok()) {
    note(`hero-shot: getting-started dismiss returned HTTP ${dismiss.status()}`);
  }

  // Best effort: replace the email-derived sidebar name with a presentable one.
  try {
    const me = await page.request.get("/api/me/person");
    if (me.ok()) {
      const { contact } = (await me.json()) as { contact?: { firstName?: string; id: string } };
      if (contact && contact.firstName !== SAMPLE_FIRST_NAME) {
        const patch = await page.request.patch(`/api/contacts/${contact.id}`, {
          data: { firstName: SAMPLE_FIRST_NAME, lastName: null },
          headers: apiHeaders(),
        });
        if (!patch.ok()) {
          note(`hero-shot: could not set display name (HTTP ${patch.status()})`);
        }
      }
    }
  } catch (error) {
    note("hero-shot: could not set display name", error);
  }
}

async function waitForDashboard(page: Page, contacts: number): Promise<void> {
  await page.goto("/app/home");
  await expect(page).toHaveURL(/\/app\/home(?:[/?#]|$)/);
  await expect(page.locator("html")).toHaveAttribute("data-mantine-color-scheme", "dark");

  // Stat cards show the contact count once the stats query resolves.
  // biome-ignore lint/nursery/noPlaywrightNthMethods: several stat cards can show the same count
  await expect(page.getByText(String(contacts), { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });

  // No loading skeletons left.
  await expect
    .poll(() => page.locator(".mantine-Skeleton-root").count(), { timeout: 60_000 })
    .toBe(0);

  await page.evaluate(() => document.fonts.ready);

  // Every visible image (avatars) decoded.
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Array.from(document.images)
            .filter((img) => {
              const rect = img.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
            })
            .every((img) => img.complete && img.naturalWidth > 0),
        ),
      { timeout: 60_000 },
    )
    .toBe(true);
}

async function cleanForCapture(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dev-tools-button],
      [data-next-badge-root],
      .mantine-Notifications-root,
      .mantine-Notification-root { display: none !important; }
    `,
  });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.mouse.move(0, 0);
  // Let layout settle after the style change.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test("export hero-app-dashboard.png", async ({ page }) => {
  await loginWithEmail(page, SAMPLE_EMAIL);
  await completeOnboardingIfNeeded(page);

  const contacts = await ensureSampleData(page);
  await preparePreferences(page);

  await waitForDashboard(page, contacts);
  await cleanForCapture(page);

  mkdirSync(dirname(stagingPath), { recursive: true });
  rmSync(stagingPath, { force: true });
  await page.screenshot({
    animations: "disabled",
    caret: "hide",
    omitBackground: false,
    path: stagingPath,
    type: "png",
  });

  const { height, width } = readPngSize(stagingPath);
  expect(width, "hero-app-dashboard.png width").toBe(EXPECTED_WIDTH);
  expect(height, "hero-app-dashboard.png height").toBe(EXPECTED_HEIGHT);

  mkdirSync(dirname(outputPath), { recursive: true });
  copyFileSync(stagingPath, outputPath);
  note(`hero-shot: wrote ${outputPath} (${width}x${height}, ${contacts} contacts)`);
});
