import { test, expect } from "./fixtures";
import { USERS } from "./helpers";

test.describe("Order lifecycle & notifications", () => {
  test("TC-08: submit → designer proof → client approve & lock", async ({
    createOrder,
    login,
    orderPage,
  }) => {
    const orderPath = await createOrder();

    // Client submits for design approval.
    await orderPage.submitForApproval();

    // Designer uploads a proof (confirm-before-save → v1).
    await login(USERS.designer, orderPath);
    await orderPage.uploadProof();

    // Client approves & locks; the order becomes immutable.
    await login(USERS.client, orderPath);
    await orderPage.approveAndLock();
  });

  test("TC-09: submitting an order notifies the designer", async ({ createOrder, login, orderPage, app }) => {
    await createOrder();
    await orderPage.submitForApproval();

    // The designer's bell shows an unread badge.
    await login(USERS.designer);
    await expect(app.unreadBell).toBeVisible();
  });
});
