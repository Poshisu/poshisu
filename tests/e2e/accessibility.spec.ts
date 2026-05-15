import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({
  trace: "on",
  video: "on",
  screenshot: "only-on-failure",
});

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body, contentType: "image/png" });
}

async function expectFocusedElementHasVisibleIndicator(page: Page) {
  const result = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return { ok: false, reason: "No focused element" };
    const styles = window.getComputedStyle(active);
    const rect = active.getBoundingClientRect();
    const hasOutline = styles.outlineStyle !== "none" && styles.outlineWidth !== "0px";
    const hasRing = styles.boxShadow !== "none";
    return {
      ok: rect.width > 0 && rect.height > 0 && (hasOutline || hasRing),
      reason: `focused=${active.tagName} outline=${styles.outlineStyle}/${styles.outlineWidth} boxShadow=${styles.boxShadow}`,
    };
  });
  expect(result.ok, result.reason).toBe(true);
}

async function signupAndCompleteOnboarding(page: Page, testInfo: TestInfo) {
  const supabaseReady = await page.request.get("http://127.0.0.1:54321/auth/v1/health").then(
    (response) => response.ok(),
    () => false,
  );
  if (!supabaseReady) {
    test.skip(true, "Local Supabase is not running; authenticated accessibility journey runs in CI with the e2e DB.");
  }

  const unique = `e2e-a11y+${Date.now()}-${Math.round(Math.random() * 100000)}@example.test`;
  const password = "Test-Password-1234";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(unique);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForLoadState("networkidle");

  if (!page.url().includes("/onboarding")) {
    test.skip(true, "Supabase email confirmation is enabled; authenticated accessibility journey requires immediate test session.");
  }

  await expect(page.getByRole("heading", { name: /nourish onboarding/i })).toBeVisible();
  await expect(page.getByLabel("Onboarding answer")).toBeVisible();
  await expect(page.getByRole("button", { name: /photo upload coming soon/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /camera coming soon/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /file upload coming soon/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /voice coming soon/i })).toBeDisabled();
  await attachScreenshot(page, testInfo, "onboarding-authenticated-accessible-state");

  const answers = [
    { value: "Aarti", next: /how old are you/i },
    { value: "31", next: /primary health goal/i },
    { value: "Maintain wellness", next: /any conditions/i },
    { value: "none", next: /diet pattern or allergies/i },
    { value: "vegetarian", next: /usual meal times/i },
    { value: "08:30 13:00 19:30", next: /what i understood/i },
  ];

  for (const { value, next } of answers) {
    await page.getByLabel("Onboarding answer").fill(value);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(next)).toBeVisible();
  }

  await expect(page.getByRole("checkbox", { name: /this looks right/i })).toBeVisible();
  await page.getByRole("checkbox", { name: /this looks right/i }).check();
  await page.getByRole("button", { name: /start building/i }).click();
  await expect(page).toHaveURL(/\/chat/);
  return unique;
}

test.describe("accessibility release gate", () => {
  test("accessibility: auth forms expose labels, alerts, headings, and visible keyboard focus", async ({ page }, testInfo) => {
    await page.goto("/login?error=invalid_credentials");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator("#login-error")).toContainText(/invalid email or password/i);
    await page.getByLabel("Email").focus();
    await expectFocusedElementHasVisibleIndicator(page);
    await attachScreenshot(page, testInfo, "login-accessible-error-state");

    await page.goto("/signup?error=signup_weak_password");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator("#signup-error")).toContainText(/password is too weak/i);
    await attachScreenshot(page, testInfo, "signup-accessible-error-state");
  });

  test("accessibility: onboarding is protected for signed-out users and returns to accessible sign-in", async ({ page }, testInfo) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await attachScreenshot(page, testInfo, "onboarding-protected-login-state");
  });

  test("accessibility: authenticated app routes support keyboard nav, live chat status, and evidence screenshots", async ({ page }, testInfo) => {
    await signupAndCompleteOnboarding(page, testInfo);

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
    await expect(page.getByLabel("Chat transcript")).toBeVisible();
    await expect(page.getByLabel("Quick meal prompts")).toBeVisible();
    await expect(page.getByLabel("Meal message")).toBeVisible();


    await page.keyboard.press("Tab");
    await expectFocusedElementHasVisibleIndicator(page);
    await attachScreenshot(page, testInfo, "chat-keyboard-ready-state");

    await page.getByLabel("Meal message").fill("I had idli and sambar for breakfast");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText(/estimating your meal/i);
    await expect(page.getByRole("heading", { name: /estimated meal: i had idli and sambar for breakfast/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /looks right — save meal/i })).toBeVisible();
    await attachScreenshot(page, testInfo, "chat-estimate-confirm-save-state");

    for (const route of ["/today", "/trends", "/profile"]) {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
      await attachScreenshot(page, testInfo, `${route.slice(1)}-accessible-route-state`);
    }
  });
});
