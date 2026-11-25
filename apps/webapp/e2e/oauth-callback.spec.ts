import { expect, test } from "@playwright/test";

const LOGIN_PATH = /\/login/u;

test("invalid oauth flow cookie redirects to login with oauth error", async ({ page }) => {
  await page.goto("/auth/oauth-callback?code=invalid&state=invalid");
  await expect(page).toHaveURL(LOGIN_PATH);
  await expect(
    page.getByText("Couldn’t complete sign-in. Try again with email, GitHub, or LinkedIn."),
  ).toBeVisible();
});
