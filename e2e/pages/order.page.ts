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

  get fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }

  async goto(orderPath: string) {
    await this.page.goto(orderPath);
    await this.expectLoaded();
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
    await expect(this.status("Locked")).toBeVisible();
  }
}
