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
});
