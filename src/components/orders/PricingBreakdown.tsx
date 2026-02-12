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
    // Separate catalog and custom line items
    const catalogItems = lineItems.filter(
        (item) => item.lineItemType === "CATALOG" && !item.isVoided
    );
    const customItems = lineItems.filter(
        (item) => item.lineItemType === "CUSTOM" && !item.isVoided
    );

    const marginAmount = pricing?.margin?.percent;

    const basePrice =
        Number(pricing?.base_ops_total) + Number(pricing?.base_ops_total) * (marginAmount / 100);
    const transportPrice =
        Number(pricing?.transport.final_rate) +
        Number(pricing?.transport.final_rate) * (marginAmount / 100);
    const catalogPrice =
        Number(pricing?.line_items?.catalog_total) +
        Number(pricing?.line_items?.catalog_total) * (marginAmount / 100);
    const customPrice = Number(pricing?.line_items?.custom_total);

    const servicePrice = catalogPrice + customPrice;
    const total = basePrice + transportPrice + servicePrice;

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

            {/* Transport */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Transport ({order.venue_city},{" "}
                    {order.trip_type === "ROUND_TRIP" ? "Round-trip" : "One-way"})
                </span>
                <span className="font-mono">{transportPrice.toFixed(2)} AED</span>
            </div>

            {/* Catalog Line Items */}
            {catalogItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {item.description}
                        {item.quantity && ` (${item.quantity} ${item.unit})`}
                    </span>
                    <span className="font-mono">{item.total.toFixed(2)} AED</span>
                </div>
            ))}

            <div className="border-t border-border my-2"></div>

            {/* Logistics Subtotal */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-semibold">
                    {(Number(basePrice) + Number(transportPrice)).toFixed(2)} AED
                </span>
            </div>

            {/* Margin (Service Fee) */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee (Including Reskin)</span>
                <span className="font-mono">{servicePrice.toFixed(2)} AED</span>
            </div>

            {/* Custom Line Items (if any) */}
            {customItems.length > 0 && (
                <>
                    <div className="border-t border-border my-2"></div>
                    {customItems.map((item) => (
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

            {customItems.some((item) => item.category === "RESKIN") && (
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
