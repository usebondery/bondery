import { expect, test } from "@playwright/test";

const LOGIN_PATH = /\/login/u;
const APP_HOME_PATH = /\/app\/home/u;
const APP_HOME_URL = /\/app\/home(?:[/?#]|$)/u;
const APP_CHAT_URL = /\/app\/chat(?:[/?#]|$)/u;

const HOME = "/app/home";

const appDestinations = [
  { name: "People", url: /\/app\/people(?:[/?#]|$)/u },
  { name: "Interactions", url: /\/app\/interactions(?:[/?#]|$)/u },
  { name: "Keep in touch", url: /\/app\/keep-in-touch(?:[/?#]|$)/u },
  { name: "Groups", url: /\/app\/groups(?:[/?#]|$)/u },
  { name: "Map", url: /\/app\/map(?:[/?#]|$)/u },
  { name: "Fix & merge", url: /\/app\/fix(?:[/?#]|$)/u },
  { name: "Settings", url: /\/app\/settings(?:[/?#]|$)/u },
  { name: "Home", url: /\/app\/home(?:[/?#]|$)/u },
] as const;

test.describe("authenticated session", () => {
  test("loads app shell without redirect to login", async ({ page }) => {
    await page.goto(HOME);
    await expect(page).not.toHaveURL(LOGIN_PATH);
    await expect(page).toHaveURL(APP_HOME_PATH);
  });

  test("clicks through app sections after login", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(HOME);
    await expect(page).toHaveURL(APP_HOME_URL);

    for (const destination of appDestinations) {
      await page.getByRole("link", { exact: true, name: destination.name }).click();
      await expect(page).toHaveURL(destination.url);
      await expect(page).not.toHaveURL(LOGIN_PATH);
    }

    await page.getByRole("radio", { name: "Chats" }).click();
    await expect(page).toHaveURL(APP_CHAT_URL);
    await expect(page).not.toHaveURL(LOGIN_PATH);
  });

  test("reload preserves session", async ({ page }) => {
    await page.goto(HOME);
    await expect(page).toHaveURL(APP_HOME_PATH);

    await page.reload();
    await expect(page).not.toHaveURL(LOGIN_PATH);
    await expect(page).toHaveURL(APP_HOME_PATH);

    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "bondery_webapp_session")).toBe(true);
  });

  test("server-renders every app page without a hydration error", async ({ page }) => {
    // Regression: headless shell components subscribed to queries during the server render,
    // so pages below them rendered their loading state on the server and content in the
    // browser. React reports that as a page error. Only hydration errors count here: a dev API
    // restart mid-run surfaces as unrelated "Failed to fetch" errors.
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(`${page.url()}: ${error.message.slice(0, 200)}`);
    });

    const paths = [
      "/app/home",
      "/app/people",
      "/app/interactions",
      "/app/keep-in-touch",
      "/app/groups",
      "/app/map",
      "/app/fix",
      "/app/settings",
    ];
    for (const path of paths) {
      await page.goto(path);
      // biome-ignore lint/suspicious/noPlaywrightNetworkidle: lets late hydration errors surface on each page before the check below
      await page.waitForLoadState("networkidle");
    }

    expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([]);
  });

  test("settings stays responsive", async ({ page }) => {
    // Regression: the timezone picker rebuilt about 500 labels every second, each one scanning
    // the whole tzdb list, and blocked the main thread for minutes.
    await page.addInitScript(() => {
      const target = window as unknown as { __longTaskMs: number };
      target.__longTaskMs = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          target.__longTaskMs += entry.duration;
        }
      }).observe({ entryTypes: ["longtask"] });
    });
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    // biome-ignore lint/suspicious/noPlaywrightWaitForTimeout: the sleep is the long-task measurement window, not a wait for a condition
    await page.waitForTimeout(5000);

    const longTaskMs = await page.evaluate(
      () => (window as unknown as { __longTaskMs: number }).__longTaskMs,
    );
    expect(longTaskMs).toBeLessThan(5000);
  });
});
