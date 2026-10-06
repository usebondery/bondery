import { existsSync, mkdirSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { loginWithEmail } from "./email-login";

const AUTH_DIR = ".auth";
const AUTH_FILE = ".auth/email-user.json";
const E2E_AGENT_EMAIL = "e2e-agent@example.test";

setup("email login session", async ({ browser, page }) => {
  setup.setTimeout(120_000);
  mkdirSync(AUTH_DIR, { recursive: true });

  if (existsSync(AUTH_FILE)) {
    try {
      const reuse = await browser.newContext({ storageState: AUTH_FILE });
      const reusePage = await reuse.newPage();
      try {
        await reusePage.goto("/app/home");
        await reusePage.waitForURL(/\/app\/home(?:[/?#]|$)/, { timeout: 15_000 });
        await reuse.close();
        return;
      } catch {
        await reuse.close();
      }
    } catch {
      // Invalid storage — sign in again.
    }
  }

  await loginWithEmail(page, E2E_AGENT_EMAIL);
  await completeOnboardingIfNeeded(page);
  await expect(page).toHaveURL(/\/app\/home(?:[/?#]|$)/);
  await page.context().storageState({ path: AUTH_FILE });
});
