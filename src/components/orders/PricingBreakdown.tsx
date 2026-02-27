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
              (line: any) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
          )
        : [];
    const fallbackLineItems = lineItems
        .filter((item) => !item.isVoided)
        .map((item) => ({
            line_id: item.id,
            label: item.description,
            category: item.category,
            quantity: Number(item.quantity || 0),
            unit: item.unit || "service",
            total: Number(item.total || 0),
        }));
    const activeLineItems = projectedLineItems.length > 0 ? projectedLineItems : fallbackLineItems;
    const logisticsTotal = Number(
        pricing.totals?.base_ops_total ??
            pricing.totals?.sell_base_ops_total ??
            pricing.logistics_sub_total ??
            0
    );
    const serviceFee = Number(
        (pricing.totals?.rate_card_total ?? pricing.totals?.sell_rate_card_total ?? 0) +
            (pricing.totals?.custom_total ?? pricing.totals?.sell_custom_total ?? 0) ||
            pricing.service_fee ||
            0
    );
    const finalTotal = Number(
        pricing.totals?.total ?? pricing.totals?.sell_total ?? pricing.final_total ?? 0
    );
    const hasReskinLine = activeLineItems.some((item: any) => item.category === "RESKIN");

    return (
        <div className="border border-border rounded-lg p-6 space-y-4">
            {showTitle && <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>}

            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Logistics &amp; Handling ({order?.calculated_totals?.volume || "0"} m³)
                </span>
                <span className="font-mono">{logisticsTotal.toFixed(2)} AED</span>
            </div>

            {serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-mono">{serviceFee.toFixed(2)} AED</span>
                </div>
            )}

            {activeLineItems.length > 0 && (
                <>
                    <div className="border-t border-border my-2"></div>
                    {activeLineItems.map((item: any) => (
                        <div key={item.line_id || item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {item.label || item.description}
                            </span>
                            <span className="font-mono">
                                {Number(item.total || 0).toFixed(2)} AED
                            </span>
                        </div>
                    ))}
                </>
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
