import { expect, test } from "@playwright/test";

test.describe("v1.1 auth and operator browser coverage", () => {
  test("sign-up submits cleanly and returns to pending verification", async ({ page }) => {
    let payload: Record<string, unknown> | null = null;

    await page.route("**/api/auth/register", async (route) => {
      payload = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: { id: "playwright-user" }
        })
      });
    });

    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await page.locator('input[name="username"]').fill("playwright-signup");
    await page.locator('input[name="email"]').fill("playwright-signup@example.test");
    await page.locator('input[name="password"]').fill("PlaywrightP@55!");
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/sign-in\?emailVerify=pending$/);
    expect(payload).toMatchObject({
      username: "playwright-signup",
      email: "playwright-signup@example.test",
      acceptTerms: true
    });
  });

  test("forgot-password, reset-password, and MFA surfaces handle browser flows", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Check your email for the next steps."
        })
      });
    });

    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
    await page.getByPlaceholder("you@example.com").fill("playwright@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Check your email for the next steps.")).toBeVisible();

    await page.goto("/reset-password?token=playwright-reset-token");
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByPlaceholder("New password (min 8 characters)").fill("PlaywrightP@55!");
    await page.getByPlaceholder("Confirm new password").fill("DifferentP@55!");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });

    await page.getByPlaceholder("Confirm new password").fill("PlaywrightP@55!");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();

    await page.goto("/sign-in/mfa");
    await expect(page.getByText("This sign-in challenge is missing or expired.")).toBeVisible();

    await page.goto("/sign-in/mfa?ticket=playwright-ticket");
    await expect(page.getByRole("textbox", { name: "Authenticator code" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Recovery code" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete sign-in" })).toBeEnabled();
  });

  test("admin discord stays protected while the public Discord hub stays available", async ({ page }) => {
    await page.goto("/admin/discord");
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fadmin|\/sign-in\?callbackUrl=\/admin/);
    await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();

    await page.goto("/discord");
    await expect(page.getByRole("heading", {
      name: /Mirror site activity, bootstrap servers, and give your ops team a single Discord command surface\./
    })).toBeVisible();
    await expect(page.getByText("Terms of Service URL", { exact: true })).toBeVisible();
    await expect(page.getByText("Privacy Policy URL", { exact: true })).toBeVisible();
    await expect(page.getByText("Custom Install Link", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open workspace" })).toBeVisible();
  });
});
