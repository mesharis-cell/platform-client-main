"use client";

/**
 * Pricing Breakdown Component
 * Displays itemized pricing for client quotes
 */

import type { OrderPricing, OrderLineItem } from "@/types/hybrid-pricing";
import type { Order } from "@/types/order";

interface PricingBreakdownProps {
    pricing: OrderPricing;
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
    const activeLineItems = lineItems.filter((item) => !item.isVoided);
    const marginPercent = Number(pricing?.margin?.percent || 0);
    const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const applyMargin = (baseValue: number) => roundCurrency(baseValue * (1 + marginPercent / 100));

    const basePrice = applyMargin(Number(pricing?.base_ops_total || 0));
    const catalogPrice = applyMargin(Number(pricing?.line_items?.catalog_total || 0));
    const customPrice = applyMargin(Number(pricing?.line_items?.custom_total || 0));
    const operationalServicesTotal = roundCurrency(catalogPrice + customPrice);
    const total = roundCurrency(basePrice + operationalServicesTotal);
    const hasReskinLine = activeLineItems.some((item) => item.category === "RESKIN");

    const serviceLines = activeLineItems.map((item) => ({
        id: item.id,
        description: item.description,
        total: applyMargin(Number(item.total || 0)),
    }));

    return (
        <div className="border border-border rounded-lg p-6 space-y-4">
            {showTitle && <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>}

            {/* Base Operations */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Logistics & Handling ({order.calculated_totals.volume} m³)
                </span>
                <span className="font-mono">{basePrice.toFixed(2)} AED</span>
            </div>

            {/* Logistics Subtotal */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-semibold">{Number(basePrice).toFixed(2)} AED</span>
            </div>

            {/* Operational Services Total */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Operational Services</span>
                <span className="font-mono">{operationalServicesTotal.toFixed(2)} AED</span>
            </div>

            {/* Service Lines */}
            {serviceLines.length > 0 && (
                <>
                    <div className="border-t border-border my-2"></div>
                    {serviceLines.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.description}</span>
                            <span className="font-mono">{item.total.toFixed(2)} AED</span>
                        </div>
                    ))}
                </>
            )}

            <div className="border-t border-border my-2"></div>

            {/* Final Total */}
            <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-bold font-mono text-primary">
                    {total.toFixed(2)} AED
                </span>
            </div>

            {hasReskinLine && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3 mt-4">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                        ℹ️ This quote includes custom rebranding work which will be completed before
                        delivery.
                    </p>
                </div>
            )}
        </div>
    );
}
