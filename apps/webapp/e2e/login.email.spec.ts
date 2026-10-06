import { expect, test } from "@playwright/test";
import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { loginWithEmail } from "./email-login";

const HOME = "/app/home";
const SETTINGS = "/app/settings";

test("email magic-link login then logout", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-${crypto.randomUUID()}@example.test`;

  await loginWithEmail(page, email);
  await completeOnboardingIfNeeded(page);
  await expect(page).toHaveURL(/\/app\/home(?:[/?#]|$)/);

  await page.goto(SETTINGS);
  await expect(page).not.toHaveURL(/\/login/);

  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 60_000 });

  await page.goto(HOME);
  await expect(page).toHaveURL(/\/login/);
});
