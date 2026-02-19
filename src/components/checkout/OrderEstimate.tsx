"use client";

/**
 * Order Estimate Display
 * Shows itemized estimate at checkout (before submission)
 */

import type { OrderEstimate } from "@/types/hybrid-pricing";

interface OrderEstimateProps {
    estimate: OrderEstimate;
    hasRebrandItems: boolean;
}

export function OrderEstimate({ estimate, hasRebrandItems }: OrderEstimateProps) {
    const marginPercent = Number(estimate.margin?.percent || 0);
    const baseOpsTotal = Number(estimate.base_operations?.total || 0);
    const transportRate = Number(
        estimate.transport?.rate ?? estimate.suggested_transport?.estimated_rate ?? 0
    );
    const hasMarginBreakdown =
        typeof estimate.margin?.base_ops_amount === "number" &&
        typeof estimate.margin?.transport_rate_amount === "number";
    const logisticsSubtotal = hasMarginBreakdown
        ? baseOpsTotal + Number(estimate.margin.base_ops_amount)
        : baseOpsTotal * (1 + marginPercent / 100);
    const transportSubtotal = hasMarginBreakdown
        ? transportRate + Number(estimate.margin.transport_rate_amount)
        : transportRate * (1 + marginPercent / 100);
    const totalEstimate = Number(
        estimate.estimate_total || (logisticsSubtotal + transportSubtotal).toFixed(2)
    );
    const tripType = estimate.transport?.trip_type || "ROUND_TRIP";

    return (
        <div className="border border-border rounded-lg p-6 space-y-3">
            <h3 className="text-lg font-semibold mb-4">Estimated Cost</h3>

            {/* Base Operations */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Logistics & Handling ({estimate.base_operations.volume.toFixed(4)} m³)
                </span>
                <span className="font-mono">{logisticsSubtotal.toFixed(2)} AED</span>
            </div>

            {/* Transport */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Transport ({tripType === "ROUND_TRIP" ? "Round-trip" : "One-way"})
                </span>
                <span className="font-mono">{transportSubtotal.toFixed(2)} AED</span>
            </div>

            <div className="border-t border-border my-2"></div>

            {/* Subtotal */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-semibold">{totalEstimate.toFixed(2)} AED</span>
            </div>

            {/* Margin (Service Fee) */}
            {/* <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Service Fee ({estimate.margin.percent.toFixed(0)}%)
                </span>
                <span className="font-mono">{estimate.margin.amount.toFixed(2)} AED</span>
            </div> */}

            <div className="border-t border-border my-2"></div>

            {/* Estimated Total */}
            <div className="flex justify-between items-center">
                <span className="text-base font-bold">Estimated Total</span>
                <span className="text-xl font-bold font-mono text-primary">
                    {totalEstimate.toFixed(2)} AED
                </span>
            </div>

            {/* Rebrand disclaimer */}
            {hasRebrandItems && (
                <>
                    <div className="border-t border-border my-2"></div>
                    <div className="text-sm font-mono text-amber-600 dark:text-amber-400">
                        + Rebranding costs (quoted after review)
                    </div>
                </>
            )}

            {/* Disclaimer */}
            <div className="bg-primary/10 border border-primary rounded-md p-3 mt-4">
                <p className="text-xs text-primary">
                    {hasRebrandItems
                        ? "This estimate excludes rebranding costs, which will be quoted during order review."
                        : "Additional services or vehicle requirements may affect the final price."}
                </p>
            </div>
        </div>
    );
}
