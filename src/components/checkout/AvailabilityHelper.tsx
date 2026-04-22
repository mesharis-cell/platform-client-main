"use client";

/**
 * AvailabilityHelper — inline sibling to FeasibilityHelper. Surfaces cart
 * items that can't be booked in the user's chosen window, so they see it
 * at the date picker step rather than being surprised at review time.
 *
 * Reads from the availability preview hook and renders a compact amber
 * banner listing each blocking item with its human-readable reason. For
 * INSUFFICIENT_QUANTITY issues we show the deficit + suggested earliest
 * date (from the booking overlap computation); for TRANSFORMED /
 * MAINTENANCE it's a terminal message.
 *
 * Deliberately separate from FeasibilityHelper (time-math) rather than
 * merged — the two concerns evolve independently (feasibility is order-
 * only, availability applies to all entities) and keeping them as
 * siblings avoids a bigger component refactor for this ship.
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { AvailabilityPreviewItem } from "@/hooks/use-availability-preview";

interface AvailabilityHelperProps {
    isLoading: boolean;
    blockingItems: AvailabilityPreviewItem[];
}

function describeReason(item: AvailabilityPreviewItem): string {
    switch (item.reason_code) {
        case "INSUFFICIENT_QUANTITY": {
            const need = item.requested_quantity ?? 0;
            const have = item.available_quantity;
            return `only ${have} available for this window (you need ${need})`;
        }
        case "TRANSFORMED":
            return "asset has been replaced";
        case "MAINTENANCE":
            return "in maintenance";
        case "NOT_FOUND":
            return "no longer available";
        case "SOFT_DELETED":
            return "no longer available";
        default:
            return "not available";
    }
}

export function AvailabilityHelper({ isLoading, blockingItems }: AvailabilityHelperProps) {
    if (isLoading) return null;
    if (blockingItems.length === 0) return null;

    return (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900">
                        Some items aren't available for this window
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1 pt-1">
                        {blockingItems.map((item) => (
                            <li key={item.asset_id}>
                                <span className="font-medium">{item.asset_name}</span>
                                <span className="text-amber-700"> — {describeReason(item)}</span>
                                {item.next_available_date ? (
                                    <span className="font-mono text-amber-700">
                                        {" "}
                                        · earliest {item.next_available_date}
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
