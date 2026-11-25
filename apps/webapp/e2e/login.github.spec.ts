import { expect, test } from "@playwright/test";

const APP_PATH_PREFIX = /\/app\//u;
const OAUTH_ERROR_QUERY = /error=oauth/u;

test.use({ storageState: { cookies: [], origins: [] } });

test("login with GitHub", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-github").click();

  if (process.env["E2E_PAUSE_GITHUB"] === "1") {
    // biome-ignore lint/suspicious/noPlaywrightPagePause: opt-in through E2E_PAUSE_GITHUB=1 for the interactive GitHub login
    await page.pause();
  } else {
    await page.waitForURL(APP_PATH_PREFIX, { timeout: 300_000 });
  }

  await expect(page).toHaveURL(APP_PATH_PREFIX);
  await expect(page).not.toHaveURL(OAUTH_ERROR_QUERY);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "bondery_webapp_session")).toBe(true);
});
