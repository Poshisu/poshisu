import { test, expect } from "@playwright/test";

/**
 * Full auth flow: signup → implicit login → /chat → logout → /.
 *
 * Requires the Supabase project to have email confirmation DISABLED for
 * this test to see a session immediately after signup. In Supabase Studio:
 * Authentication → Providers → Email → "Confirm email" toggle OFF for the
 * test environment (or use a separate project for e2e).
 *
 * For CI this should run against a fresh local supabase instance.
 */
test.describe("auth flow", () => {
  test("protected /chat redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup → chat → logout → landing", async ({ page }) => {
    const unique = `e2e+${Date.now()}@example.test`;
    const password = "Test-Password-1234";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(unique);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Either we're redirected to onboarding (session issued immediately) or
    // we're asked to check email. Both are valid outcomes depending on project
    // settings — the rest of the flow only runs in the immediate-session case.
    await page.waitForLoadState("networkidle");
    if (!page.url().includes("/onboarding")) {
      await expect(page.getByRole("status")).toContainText(/check your inbox/i);
      return;
    }

    await page.goto("/chat");
    await expect(page.getByText(unique)).toBeVisible();

    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("login with wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password").fill("not-the-right-one");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("signup → onboarding → log meal → confirm → appears in Today", async ({ page }) => {
    const unique = `e2e-meal+${Date.now()}@example.test`;
    const password = "Test-Password-1234";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(unique);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForLoadState("networkidle");
    if (!page.url().includes("/onboarding")) {
      await expect(page.getByRole("status")).toContainText(/check your inbox/i);
      return;
    }

    const answers = [
      "Aarti",
      "31",
      "Lose weight",
      "none",
      "vegetarian",
      "08:30 13:00 19:30",
    ];

    for (const answer of answers) {
      await page.getByPlaceholder("Type your answer naturally...").fill(answer);
      await page.getByRole("button", { name: "Send" }).click();
    }

    await page.getByRole("checkbox", { name: /this looks right/i }).check();
    await page.getByRole("button", { name: /start building/i }).click();

    await expect(page).toHaveURL(/\/chat/);

    await page.getByRole("button", { name: /looks right — save meal/i }).click();
    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { name: /lunch/i })).toBeVisible();
    await expect(page.getByText(/2 rotis and a bowl of dal/i)).toBeVisible();
  });
});
