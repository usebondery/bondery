import type { Page } from "@playwright/test";
import { waitForMagicLinkVerifyUrl } from "./mailpit";

const SIGNED_IN_URL = /\/app\/(home|onboarding)(?:[/?#]|$)/;

/** Sign in through `/login` email magic-link and wait for `/app/home` or onboarding. */
export async function loginWithEmail(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email-submit").click();
  await page.getByTestId("login-email").fill(email);

  const requestedAt = new Date();
  await page.getByTestId("login-email-send").click();

  const verifyUrl = await waitForMagicLinkVerifyUrl(email, requestedAt);
  await page.goto(verifyUrl);

  try {
    await page.waitForURL(SIGNED_IN_URL, { timeout: 60_000 });
  } catch (error) {
    throw new Error(
      `Email magic-link did not reach /app/home or /app/onboarding (last URL: ${page.url()}). ` +
        "Confirm Mailpit is running (`pnpm run start:mailpit`) and BONDERY_PRIVATE_EMAIL_HOST=127.0.0.1.",
      { cause: error },
    );
  }
}
