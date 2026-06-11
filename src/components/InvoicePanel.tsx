import type { XeroInvoice } from "@/lib/xero/invoice";

const money = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

// Shows the order's pricing. Before lock it's a quote (README step 3); once Locked/Ready it's
// the mock Xero invoice (README step 7). Both are computed from the catalogue + discount tier.
export function InvoicePanel({
  invoice,
  locked,
  issued = false,
}: {
  invoice: XeroInvoice | null;
  locked: boolean;
  issued?: boolean;
}) {
  const title = issued ? "Invoice (mock Xero)" : locked ? "Invoice (pro-forma)" : "Quote";
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {issued && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
              Issued ✓
            </span>
          )}
        </div>
        {invoice && (
          <span className="text-xs text-muted">
            {invoice.account_name} · {invoice.discount_pct}% {locked ? "" : "(estimate)"}
          </span>
        )}
      </div>

      {!invoice ? (
        <p className="text-sm text-muted">
          No priced items. Add a Product SKU column to the roster to price this order.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">List</th>
                  <th className="px-4 py-2.5 text-right">Unit (net)</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l, i) => (
                  <tr key={i} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{l.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {money(l.list_unit_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">{money(l.unit_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink">
                      {money(l.line_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
            <Row label="Subtotal (ex GST)" value={money(invoice.subtotal_ex_gst)} />
            <Row label="GST (10%)" value={money(invoice.gst)} />
            <Row label="Total (inc GST)" value={money(invoice.total_inc_gst)} strong />
            {invoice.deposit_due > 0 && (
              <>
                <Row label="Deposit due (50%)" value={money(invoice.deposit_due)} />
                <Row label="Balance" value={money(invoice.balance_due)} />
              </>
            )}
          </dl>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-primary-600">
              Preview Xero invoice payload (mock, not sent)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 text-xs text-ink">
              {JSON.stringify(invoice, null, 2)}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-ink" : "text-muted"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
