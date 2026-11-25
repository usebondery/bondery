import { expect, test } from "@playwright/test";
import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { loginWithEmail } from "./email-login";

const APP_HOME_URL = /\/app\/home(?:[/?#]|$)/u;
const LOGIN_PATH = /\/login/u;
const SIGN_OUT_I = /sign out/iu;

const HOME = "/app/home";
const SETTINGS = "/app/settings";

test("email magic-link login then logout", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-${crypto.randomUUID()}@example.test`;

  await loginWithEmail(page, email);
  await completeOnboardingIfNeeded(page);
  await expect(page).toHaveURL(APP_HOME_URL);

  await page.goto(SETTINGS);
  await expect(page).not.toHaveURL(LOGIN_PATH);

  await page.getByRole("button", { name: SIGN_OUT_I }).click();
  await page.waitForURL(LOGIN_PATH, { timeout: 60_000 });

  await page.goto(HOME);
  await expect(page).toHaveURL(LOGIN_PATH);
});
