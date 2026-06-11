import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// Base page object: the persistent app chrome (sidebar nav + topbar notification bell) shared
// by every authenticated page. Other page objects extend this.
export class BasePage {
  constructor(protected readonly page: Page) {}

  get notificationsBell(): Locator {
    return this.page.getByRole("button", { name: /Notifications|unread notifications/ });
  }

  get unreadBell(): Locator {
    return this.page.getByRole("button", { name: /unread notifications/ });
  }

  navLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  pageHeading(name: string): Locator {
    return this.page.getByRole("heading", { name });
  }

  // Resolves once the shell has rendered (used after navigation instead of networkidle, which
  // is unreliable against the dev server's HMR websocket).
  async expectLoaded() {
    await expect(this.notificationsBell).toBeVisible();
  }
}
