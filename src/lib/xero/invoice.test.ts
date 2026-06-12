import { describe, it, expect } from "vitest";
import { buildXeroInvoice } from "./invoice";

describe("buildXeroInvoice", () => {
  it("applies the discount tier, GST, and deposit", () => {
    const inv = buildXeroInvoice({
      orderNumber: 42,
      accountCode: "ACC-1001",
      accountName: "Northside FC",
      discountPct: 15, // Gold
      requiresDeposit: false,
      lines: [{ sku: "SUB-JER-CUSTOM-ADULTL", name: "Sublimated Jersey", quantity: 10, unitPrice: 72 }],
    });

    // 72 * 0.85 = 61.2 ; * 10 = 612 ex GST ; GST 61.2 ; total 673.2 ; no deposit
    expect(inv.lines[0].unit_amount).toBe(61.2);
    expect(inv.subtotal_ex_gst).toBe(612);
    expect(inv.gst).toBe(61.2);
    expect(inv.total_inc_gst).toBe(673.2);
    expect(inv.deposit_due).toBe(0);
    expect(inv.balance_due).toBe(673.2);
  });

  it("charges a 50% deposit when the account requires one", () => {
    const inv = buildXeroInvoice({
      orderNumber: 42,
      accountCode: "ACC-1003",
      accountName: "South Coast",
      discountPct: 5, // Bronze
      requiresDeposit: true,
      lines: [{ sku: "SOCK-WHT-ADULT", name: "Socks", quantity: 4, unitPrice: 12 }],
    });

    // 12 * 0.95 = 11.4 ; * 4 = 45.6 ; GST 4.56 ; total 50.16 ; deposit 25.08
    expect(inv.total_inc_gst).toBe(50.16);
    expect(inv.deposit_due).toBe(25.08);
    expect(inv.balance_due).toBe(25.08);
  });
});
