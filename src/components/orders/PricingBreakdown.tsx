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
    if (!pricing) return null;

    const projectedLineItems = Array.isArray(pricing.breakdown_lines)
        ? pricing.breakdown_lines.filter(
              (line: any) =>
                  !line.is_voided &&
                  String(line.billing_mode || "BILLABLE") === "BILLABLE" &&
                  !(
                      String(line.line_kind || "") === "CUSTOM" &&
                      String(line.billing_mode || "BILLABLE") === "NON_BILLABLE"
                  )
          )
        : [];
    const fallbackLineItems = lineItems
        .filter((item: any) => {
            if (item.isVoided) return false;
            const lineItemType = String(item.line_item_type || item.lineItemType || "CATALOG");
            const billingMode = String(item.billing_mode || item.billingMode || "BILLABLE");
            return !(lineItemType === "CUSTOM" && billingMode === "NON_BILLABLE");
        })
        .map((item) => ({
            line_id: item.id,
            label: item.description,
            category: item.category,
            quantity: Number(item.quantity || 0),
            unit: item.unit || "service",
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
                        <span className="text-muted-foreground">
                            {item.label || item.description}
                        </span>
                        {item.total === null || item.total === undefined ? null : (
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
                    <span className="text-muted-foreground">VAT ({vatPercent.toFixed(2)}%)</span>
                    <span className="font-mono">{vatAmount.toFixed(2)} AED</span>
                </div>
            )}

            <div className="border-t border-border my-2"></div>

            <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-bold font-mono text-primary">
                    {finalTotal.toFixed(2)} AED
                </span>
            </div>

            {hasReskinLine && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3 mt-4">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                        This quote includes custom rebranding work which will be completed before
                        delivery.
                    </p>
                </div>
            )}
        </div>
    );
}
