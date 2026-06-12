import { test, expect } from "./fixtures";
import { USERS } from "./helpers";
import { seedOrder } from "./db";

test.describe("Fulfillment & pricing", () => {
  test("TC-15: warehouse marks a locked order packed and invoiced", async ({
    login,
    orderPage,
    page,
  }) => {
    const order = await seedOrder({ status: "LOCKED_READY", withProof: true });
    await login(USERS.warehouse, order.path);
    await orderPage.goto(order.path);

    await orderPage.markPacked();
    // The invoice flips to "Issued" once packed.
    await expect(page.getByText("Issued")).toBeVisible();
  });

  test("TC-16: the quote reflects the club's discount tier", async ({ login, orderPage, page }) => {
    // e2e_club is Silver (10% off), set in global-setup.
    const order = await seedOrder({ status: "PENDING_APPROVAL", withProof: true });
    await login(USERS.client, order.path);
    await orderPage.goto(order.path);

    await expect(page.getByText(/10% \(estimate\)/)).toBeVisible();
  });
});
