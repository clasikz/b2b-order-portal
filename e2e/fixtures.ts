import { test as base, expect } from "@playwright/test";
import { BasePage } from "./pages/base-page";
import { RosterUploadPage } from "./pages/roster-upload.page";
import { OrderPage } from "./pages/order.page";
import { USERS } from "./helpers";

type Fixtures = {
  app: BasePage;
  rosterUpload: RosterUploadPage;
  orderPage: OrderPage;
  // Authenticate as a seeded user via the dev-only login route.
  login: (email: string, next?: string) => Promise<void>;
  // Client creates a Draft order from a valid roster; returns the /orders/<id> path.
  createOrder: (file?: string) => Promise<string>;
};

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await use(new BasePage(page));
  },
  rosterUpload: async ({ page }, use) => {
    await use(new RosterUploadPage(page));
  },
  orderPage: async ({ page }, use) => {
    await use(new OrderPage(page));
  },

  login: async ({ page, app }, use) => {
    await use(async (email, next = "/") => {
      await page.goto(
        `/api/dev-login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
      );
      await app.expectLoaded();
    });
  },

  createOrder: async ({ page, login, rosterUpload }, use) => {
    await use(async (file = "roster-auto-detect.csv") => {
      await login(USERS.client);
      await rosterUpload.goto();
      await rosterUpload.upload(file);
      await expect(rosterUpload.allValid).toBeVisible();
      await rosterUpload.submit();
      return new URL(page.url()).pathname;
    });
  },
});

export { expect };
