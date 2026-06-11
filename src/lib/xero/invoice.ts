// Mock Xero invoice builder (README step 7). Prices the order from real catalogue prices
// (product_catalog.csv) times the account's discount tier, with 10% GST and a 50% deposit
// when the account requires one. No real Xero API is called.

export const GST_RATE = 0.1;
export const DEPOSIT_RATE = 0.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// One priced roster line: a product, its catalogue unit price, and a quantity.
export interface PricedLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number; // catalogue price, ex GST
}

export interface XeroInvoice {
  invoice_ref: string;
  account_code: string;
  account_name: string;
  status: "DRAFT";
  line_amount_types: "Exclusive";
  currency: "AUD";
  discount_pct: number;
  lines: {
    description: string;
    quantity: number;
    list_unit_amount: number;
    unit_amount: number; // after discount
    line_amount: number;
  }[];
  subtotal_ex_gst: number;
  gst: number;
  total_inc_gst: number;
  deposit_due: number;
  balance_due: number;
}

export interface InvoiceInput {
  orderId: string;
  accountCode: string;
  accountName: string;
  discountPct: number;
  requiresDeposit: boolean;
  lines: PricedLine[];
}

export function buildXeroInvoice(input: InvoiceInput): XeroInvoice {
  const factor = 1 - input.discountPct / 100;

  const lines = input.lines.map((l) => {
    const unit = round2(l.unitPrice * factor);
    return {
      description: `${l.name} (${l.sku})`,
      quantity: l.quantity,
      list_unit_amount: l.unitPrice,
      unit_amount: unit,
      line_amount: round2(unit * l.quantity),
    };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.line_amount, 0));
  const gst = round2(subtotal * GST_RATE);
  const total = round2(subtotal + gst);
  const deposit = input.requiresDeposit ? round2(total * DEPOSIT_RATE) : 0;

  return {
    invoice_ref: `INV-B2B-${input.orderId.slice(0, 8).toUpperCase()}`,
    account_code: input.accountCode,
    account_name: input.accountName,
    status: "DRAFT",
    line_amount_types: "Exclusive",
    currency: "AUD",
    discount_pct: input.discountPct,
    lines,
    subtotal_ex_gst: subtotal,
    gst,
    total_inc_gst: total,
    deposit_due: deposit,
    balance_due: round2(total - deposit),
  };
}
