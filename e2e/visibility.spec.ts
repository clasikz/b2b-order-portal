import { test, expect } from "./fixtures";
import { USERS } from "./helpers";
import { seedOrder } from "./db";

// Per-order visibility is enforced server-side, so a direct URL to an order a role shouldn't
// see returns 404 (not just a hidden link).
test.describe("Order visibility (direct URL)", () => {
  test("TC-10: a designer cannot open a Draft order", async ({ login, page }) => {
    const order = await seedOrder({ status: "DRAFT" });
    await login(USERS.designer);
    const res = await page.goto(order.path);
    expect(res?.status()).toBe(404);
  });

  test("TC-11: warehouse cannot open a Pending Approval order", async ({ login, page }) => {
    const order = await seedOrder({ status: "PENDING_APPROVAL", withProof: true });
    await login(USERS.warehouse);
    const res = await page.goto(order.path);
    expect(res?.status()).toBe(404);
  });
});
