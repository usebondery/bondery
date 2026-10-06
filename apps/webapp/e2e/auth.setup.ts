import { expect, test as setup } from "@playwright/test";

const authFile = ".auth/user.json";

setup("manual GitHub login", async ({ page }) => {
  setup.setTimeout(300_000);

  await page.goto("/login");
  await page.getByTestId("login-github").click();

  // Complete GitHub sign-in in the Playwright browser window when prompted.
  try {
    await page.waitForURL(/\/app\//, { timeout: 300_000 });
  } catch (error) {
    const url = page.url();
    if (url.includes("error=oauth")) {
      throw new Error(
        `OAuth failed — landed on ${url}. ` +
          "Common fixes: align BONDERY_PUBLIC_API_URL and BONDERY_PUBLIC_WEBAPP_URL " +
          "(localhost vs 127.0.0.1), set GitHub callback to " +
          "<BONDERY_PUBLIC_API_URL>/auth/callback/github, " +
          "run `pnpm run provision:oauth-clients`, restart dev servers.",
        { cause: error },
      );
    }

    throw new Error(
      `Timed out waiting for /app/ (last URL: ${url}). ` +
        "Finish GitHub sign-in in the Playwright window, or fix OAuth if stuck on login/github.",
      { cause: error },
    );
  }

  await expect(page).not.toHaveURL(/error=oauth/);
  await page.context().storageState({ path: authFile });
});
