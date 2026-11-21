import { expect, test } from "@playwright/test";

const HOME = "/app/home";

const appDestinations = [
  { name: "People", url: /\/app\/people(?:[/?#]|$)/ },
  { name: "Interactions", url: /\/app\/interactions(?:[/?#]|$)/ },
  { name: "Keep in touch", url: /\/app\/keep-in-touch(?:[/?#]|$)/ },
  { name: "Groups", url: /\/app\/groups(?:[/?#]|$)/ },
  { name: "Map", url: /\/app\/map(?:[/?#]|$)/ },
  { name: "Fix & merge", url: /\/app\/fix(?:[/?#]|$)/ },
  { name: "Settings", url: /\/app\/settings(?:[/?#]|$)/ },
  { name: "Home", url: /\/app\/home(?:[/?#]|$)/ },
] as const;

test.describe("authenticated session", () => {
  test("loads app shell without redirect to login", async ({ page }) => {
    await page.goto(HOME);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/app\/home/);
  });

  test("clicks through app sections after login", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(HOME);
    await expect(page).toHaveURL(/\/app\/home(?:[/?#]|$)/);

    for (const destination of appDestinations) {
      await page.getByRole("link", { exact: true, name: destination.name }).click();
      await expect(page).toHaveURL(destination.url);
      await expect(page).not.toHaveURL(/\/login/);
    }

    await page.getByRole("radio", { name: "Chats" }).click();
    await expect(page).toHaveURL(/\/app\/chat(?:[/?#]|$)/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("reload preserves session", async ({ page }) => {
    await page.goto(HOME);
    await expect(page).toHaveURL(/\/app\/home/);

    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/app\/home/);

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
    await page.waitForTimeout(5_000);

    const longTaskMs = await page.evaluate(
      () => (window as unknown as { __longTaskMs: number }).__longTaskMs,
    );
    expect(longTaskMs).toBeLessThan(5_000);
  });
});
