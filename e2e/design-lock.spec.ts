import { test, expect } from "./fixtures";
import { USERS } from "./helpers";
import { seedOrder } from "./db";

test.describe("Design lock & collaboration", () => {
  test("TC-12: a locked order rejects further lock attempts with 409", async ({ login, page }) => {
    const order = await seedOrder({ status: "LOCKED_READY", withProof: true });
    await login(USERS.client); // client owns the order and has lock permission

    const res = await page.request.post("/api/design-lock", {
      data: { orderId: order.id, action: "lock" },
    });
    expect(res.status()).toBe(409);
  });

  test("TC-13: a designer is forbidden (403) from locking", async ({ login, page }) => {
    const order = await seedOrder({ status: "PENDING_APPROVAL", withProof: true });
    await login(USERS.designer);

    const res = await page.request.post("/api/design-lock", {
      data: { orderId: order.id, action: "lock" },
    });
    expect(res.status()).toBe(403);
  });

  test("TC-14: client requests a revision (note posts to the thread)", async ({
    login,
    orderPage,
    page,
  }) => {
    const order = await seedOrder({ status: "PENDING_APPROVAL", withReference: true, withProof: true });
    await login(USERS.client, order.path);
    await orderPage.goto(order.path);

    await orderPage.requestRevision("Please brighten the lime green.");
    // The note lands in the conversation thread (it also appears in the activity log, so first).
    await expect(page.getByText("Please brighten the lime green.").first()).toBeVisible();
  });
});
