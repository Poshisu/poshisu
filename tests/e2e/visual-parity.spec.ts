import { expect, test } from "@playwright/test";

test.describe("RDX-05C.5 visual parity", () => {
  test("landing page matches baseline", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-page.png", { fullPage: true, animations: "disabled" });
  });

  test("signup page matches baseline", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("signup-page.png", { fullPage: true, animations: "disabled" });
  });

  test("onboarding first step matches baseline", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("onboarding-step-1.png", { fullPage: true, animations: "disabled" });
  });
});
