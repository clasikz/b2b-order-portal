import { test, expect } from "./fixtures";
import { USERS } from "./helpers";

test.describe("Roster upload & validation", () => {
  test("TC-06: a valid roster validates and creates a Draft order", async ({
    login,
    rosterUpload,
    orderPage,
  }) => {
    await login(USERS.client);
    await rosterUpload.goto();
    await rosterUpload.upload("roster-auto-detect.csv");

    await expect(rosterUpload.allValid).toBeVisible();
    await expect(rosterUpload.submitButton).toBeEnabled();

    await rosterUpload.submit();
    await expect(orderPage.status("Draft")).toBeVisible();
  });

  test("TC-07: an invalid roster shows errors and blocks submit", async ({ login, rosterUpload }) => {
    await login(USERS.client);
    await rosterUpload.goto();
    await rosterUpload.upload("roster-invalid-data.csv");

    await expect(rosterUpload.needsAttention).toBeVisible();
    await expect(rosterUpload.rowError("Unknown product SKU")).toBeVisible();
    await expect(rosterUpload.submitButton).toBeDisabled();
  });
});
