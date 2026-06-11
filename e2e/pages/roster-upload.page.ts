import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./base-page";
import { SAMPLE } from "../helpers";

// /roster/new — upload a CSV, see live validation, submit to create a Draft order.
export class RosterUploadPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }

  get summary(): Locator {
    return this.page.getByText(/\d+ rows/);
  }

  get allValid(): Locator {
    return this.page.getByText("All rows valid");
  }

  get needsAttention(): Locator {
    return this.page.getByText(/need attention/);
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: "Submit roster" });
  }

  async goto() {
    await this.page.goto("/roster/new");
    await this.expectLoaded();
  }

  // Upload a sample CSV (by filename in docs/) and wait for the validation preview.
  async upload(file: string) {
    await this.fileInput.setInputFiles(SAMPLE(file));
    await expect(this.summary).toBeVisible();
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForURL(/\/orders\/.+/);
  }

  rowError(message: string): Locator {
    return this.page.getByText(message).first();
  }
}
