import { expect, test } from "@playwright/test";

test.describe("unauthenticated login", () => {
  test("renders /login with GitHub button on desktop", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(page.getByTestId("login-email-submit")).toBeVisible();
    const githubBox = await page.getByTestId("login-github").boundingBox();
    const emailSubmitBox = await page.getByTestId("login-email-submit").boundingBox();
    expect(githubBox).not.toBeNull();
    expect(emailSubmitBox).not.toBeNull();
    expect(emailSubmitBox?.y ?? 0).toBeGreaterThan(githubBox?.y ?? 0);
    await expect(page.getByTestId("login-email")).toBeHidden();
    const emailSubmit = page.getByTestId("login-email-submit");
    if (await emailSubmit.isEnabled()) {
      await emailSubmit.click();
      await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    }
  });

  test("renders GitHub login on a small viewport", async ({ page }) => {
    await page.setViewportSize({ height: 667, width: 375 });
    await page.goto("/login");
    await expect(page.getByTestId("login-github")).toBeVisible();
  });

  test("blocks /app without session", async ({ page }) => {
    await page.goto("/app/home");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows a notification for ?error=oauth", async ({ page }) => {
    await page.goto("/login?error=oauth");
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(
      page.getByText("Couldn’t complete sign-in. Try again with email, GitHub, or LinkedIn."),
    ).toBeVisible();
  });

  test("shows a notification for ?error=internal_server_error", async ({ page }) => {
    await page.goto("/login?error=internal_server_error");
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(
      page.getByText("Something went wrong on our end. Please try again."),
    ).toBeVisible();
  });

  test("shows a notification for an invalid magic-link error", async ({ page }) => {
    await page.goto("/login?error=INVALID_TOKEN");
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(page.getByTestId("login-email-request-new")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request a new link" })).toHaveCount(0);
    await expect(page.getByText("This sign-in link isn’t valid. Request a new one.")).toBeVisible();
  });
});
