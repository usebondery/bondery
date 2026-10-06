import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Finish first-run onboarding when the magic-link lands on `/app/onboarding`. */
export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  if (/\/app\/home(?:[/?#]|$)/.test(page.url())) {
    return;
  }

  await expect(page).toHaveURL(/\/app\/onboarding(?:[/?#]|$)/);
  await page.getByTestId("onboarding-lets-go").click({ timeout: 15_000 });
  await page.getByTestId("onboarding-intent-personal").click();
  await page.getByTestId("onboarding-skip-import").click();
  await page.waitForURL(/\/app\/home(?:[/?#]|$)/, { timeout: 60_000 });
}
