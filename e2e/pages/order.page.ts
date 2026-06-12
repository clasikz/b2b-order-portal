import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./base-page";
import { DESIGN_IMAGE } from "../helpers";

// /orders/<id> — the order detail page: draft submit, design collaboration + lock.
export class OrderPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  status(label: string): Locator {
    return this.page.getByText(label).first();
  }

  // Draft → Pending Approval. (The button label is "Submit".)
  get submitForApprovalButton(): Locator {
    return this.page.getByRole("button", { name: "Submit", exact: true });
  }

  get approveAndLockButton(): Locator {
    return this.page.getByRole("button", { name: "Approve & Lock" });
  }

  get confirmLockButton(): Locator {
    return this.page.getByRole("button", { name: "Confirm & lock" });
  }

  get fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }

  get requestRevisionButton(): Locator {
    return this.page.getByRole("button", { name: "Request Revision" });
  }

  get markPackedButton(): Locator {
    return this.page.getByRole("button", { name: "Mark as packed & invoice" });
  }

  async goto(orderPath: string) {
    await this.page.goto(orderPath);
    await this.expectLoaded();
  }

  // Client requests a revision (two-step: button -> note -> send).
  async requestRevision(note: string) {
    await this.requestRevisionButton.click();
    await this.page.getByPlaceholder("Describe the changes for the designer…").fill(note);
    await this.page.getByRole("button", { name: "Send revision request" }).click();
    // The "Revision requested" badge (also appears as an activity-log entry, so scope to first).
    await expect(this.page.getByText("Revision requested").first()).toBeVisible();
  }

  // Warehouse marks a locked order packed (which generates the mock invoice).
  async markPacked() {
    await this.markPackedButton.click();
    await expect(this.status("Packed")).toBeVisible();
  }

  async submitForApproval() {
    await this.submitForApprovalButton.click();
    await expect(this.status("Pending Approval")).toBeVisible();
  }

  // Designer uploads a proof through the confirm-before-save flow.
  async uploadProof() {
    await this.fileInput.setInputFiles(DESIGN_IMAGE);
    await this.page.getByRole("button", { name: /Submit v\d/ }).click();
    await expect(this.page.getByText(/Design proof/)).toBeVisible();
  }

  async approveAndLock() {
    await expect(this.approveAndLockButton).toBeEnabled();
    await this.approveAndLockButton.click();
    // Two-step: an optional approval note appears, then confirm.
    await this.confirmLockButton.click();
    await expect(this.status("Locked")).toBeVisible();
  }
}
