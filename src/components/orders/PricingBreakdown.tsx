"use client";

import type { OrderLineItem } from "@/types/hybrid-pricing";
import type { Order } from "@/types/order";

interface PricingBreakdownProps {
    pricing: Record<string, any>;
    lineItems?: OrderLineItem[];
    showTitle?: boolean;
    order: Order;
}

export function PricingBreakdown({
    pricing,
    lineItems = [],
    order,
    showTitle = true,
}: PricingBreakdownProps) {
    // No-cost orders (owner feedback 2026-07-07 item 14): no priced breakdown to
    // show. Render the clean "provided at no cost" state instead of a hollow
    // 0.00 total with an empty/near-empty line list — and never the download
    // button (that lives in the page; the API 409s the PDF for this mode too).
    const isNoCost = (order as any)?.pricing_mode === "NO_COST";
    if (isNoCost) {
        return (
            <div className="border border-border rounded-lg p-6 space-y-4">
                {showTitle && <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>}
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-foreground">
                        This order is provided at no cost.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        No charges apply — there is nothing to pay.
                    </p>
                </div>
                <div className="border-t border-border my-2"></div>
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">TOTAL</span>
                    <span className="text-2xl font-bold font-mono text-primary">0.00 AED</span>
                </div>
            </div>
        );
    }

    if (!pricing) return null;

    // Primary source: the role-projected breakdown snapshot. `projectByRole`
    // (pricing.service.ts) already builds the CLIENT-visible line set FIRST —
    // voided / NON_BILLABLE / client_visible=false lines are dropped from BOTH
    // the list and the totals — so no re-filtering happens here; re-deriving
    // hide rules client-side is exactly the drift this contract exists to avoid.
    const projectedLineItems = Array.isArray(pricing.breakdown_lines)
        ? pricing.breakdown_lines
        : [];
    // Fallback only fires when the breakdown snapshot itself is absent/empty
    // (e.g. a pre-projection legacy record). `lineItems` (order.line_items) is
    // ALREADY the server-filtered CLIENT array (projectLineItemsForClient drops
    // voided / NON_BILLABLE / client_visible=false) — this is a plain map, not a
    // second filter pass, so it can't diverge from the server's choke point.
    const fallbackLineItems = lineItems.map((item: any) => ({
        line_id: item.id,
        label: item.description,
        category: item.category,
        quantity: Number(item.quantity || 0),
        unit: item.unit || "service",
        is_complimentary: !!item.is_complimentary,
        total: null,
    }));
    const activeLineItems = projectedLineItems.length > 0 ? projectedLineItems : fallbackLineItems;
    const subtotal = Number(
        pricing.subtotal ?? pricing.totals?.subtotal ?? pricing.totals?.sell_total ?? 0
    );
    const vatPercent = Number(pricing.vat?.percent ?? pricing.totals?.vat_percent ?? 0);
    const vatAmount = Number(pricing.vat?.amount ?? pricing.totals?.vat_amount ?? 0);
    const finalTotal = Number(
        pricing.totals?.total ??
            pricing.totals?.sell_total_with_vat ??
            pricing.final_total ??
            pricing.totals?.sell_total ??
            0
    );
    const hasReskinLine = activeLineItems.some((item: any) => item.category === "RESKIN");

    return (
        <div className="border border-border rounded-lg p-6 space-y-4">
            {showTitle && <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>}

            {activeLineItems.length > 0 ? (
                activeLineItems.map((item: any) => (
                    <div
                        key={item.line_id || item.id}
                        className="flex justify-between text-sm gap-3"
                    >
                        <span className="text-muted-foreground inline-flex items-center gap-2">
                            {item.label || item.description}
                            {item.is_complimentary ? (
                                <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                    Complimentary
                                </span>
                            ) : null}
                        </span>
                        {item.total === null ||
                        item.total === undefined ? null : item.is_complimentary ? (
                            <span className="font-mono text-muted-foreground">—</span>
                        ) : (
                            <span className="font-mono">{Number(item.total).toFixed(2)} AED</span>
                        )}
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">No line items available.</p>
            )}

            <div className="border-t border-border my-2"></div>

            {subtotal > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{subtotal.toFixed(2)} AED</span>
                </div>
            )}

            {vatPercent > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {vatAmount > 0
                            ? `VAT (${vatPercent.toFixed(2)}%)`
                            : `VAT included (${vatPercent.toFixed(2)}%)`}
                    </span>
                    {vatAmount > 0 && <span className="font-mono">{vatAmount.toFixed(2)} AED</span>}
                </div>
            )}

            <div className="border-t border-border my-2"></div>

            <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-bold font-mono text-primary">
                    {finalTotal.toFixed(2)} AED
                </span>
            </div>
        </div>
    );
}
