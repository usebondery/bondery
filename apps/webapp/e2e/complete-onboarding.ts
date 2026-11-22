import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const APP_HOME_URL = /\/app\/home(?:[/?#]|$)/;
const APP_ONBOARDING_URL = /\/app\/onboarding(?:[/?#]|$)/;

/** Finish first-run onboarding when the magic-link lands on `/app/onboarding`. */
export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  if (APP_HOME_URL.test(page.url())) {
    return;
  }

  await expect(page).toHaveURL(APP_ONBOARDING_URL);
  await page.getByTestId("onboarding-lets-go").click({ timeout: 15_000 });
  await page.getByTestId("onboarding-intent-personal").click();
  await page.getByTestId("onboarding-skip-import").click();
  await page.waitForURL(APP_HOME_URL, { timeout: 60_000 });
}
