import { test, expect } from "./fixtures";
import { USERS } from "./helpers";

test.describe("Auth & RBAC", () => {
  test("TC-01: unauthenticated access redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("TC-02: Club Manager lands on the dashboard with an upload entry", async ({ login, app }) => {
    await login(USERS.client);
    await expect(app.pageHeading("Dashboard")).toBeVisible();
    await expect(app.navLink("Upload roster")).toBeVisible();
  });

  test("TC-03: Designer cannot upload rosters", async ({ login, app }) => {
    await login(USERS.designer);
    await expect(app.navLink("Upload roster")).toHaveCount(0);
  });

  test("TC-04: Warehouse sees the Integration console", async ({ login, app }) => {
    await login(USERS.warehouse);
    await expect(app.navLink("Integration")).toBeVisible();
  });

  test("TC-05: Super Admin sees Settings", async ({ login, app }) => {
    await login(USERS.admin);
    await expect(app.navLink("Settings")).toBeVisible();
  });
});
