"use client";

/**
 * Order Status Banner
 * Special status displays for AWAITING_FABRICATION and CANCELLED
 */

import { AlertCircle, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { OrderStatus } from "@/types/order";

interface OrderStatusBannerProps {
    status: OrderStatus;
    cancellationReason?: string;
    cancellationNotes?: string;
    cancelledAt?: string;
    pendingReskinCount?: number;
}

export function OrderStatusBanner({
    status,
    cancellationReason,
    cancellationNotes,
    cancelledAt,
    pendingReskinCount = 0,
}: OrderStatusBannerProps) {
    if (status === "AWAITING_FABRICATION") {
        return (
            <Alert className="border-blue-500 bg-blue-50">
                <Clock className="h-5 w-5 text-blue-500" />
                <AlertTitle className="text-blue-500">
                    Order Confirmed - Awaiting Fabrication
                </AlertTitle>
                <AlertDescription className="text-blue-500">
                    Your order is confirmed and being prepared. Custom rebranding work is currently
                    in progress.
                    {pendingReskinCount > 0 && (
                        <span className="block mt-2 font-semibold">
                            {pendingReskinCount} rebrand{pendingReskinCount > 1 ? "s" : ""} in
                            fabrication
                        </span>
                    )}
                </AlertDescription>
            </Alert>
        );
    }

    if (status === "CANCELLED") {
        return (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
                <XCircle className="h-5 w-5" />
                <AlertTitle>Order Cancelled</AlertTitle>
                <AlertDescription>
                    <p>This order has been cancelled.</p>
                    {cancellationReason && (
                        <p className="mt-2">
                            <strong>Reason:</strong>{" "}
                            {cancellationReason
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                    )}
                    {cancellationNotes && (
                        <p className="mt-1">
                            <strong>Notes:</strong> {cancellationNotes}
                        </p>
                    )}
                    {cancelledAt && (
                        <p className="text-xs mt-2 text-muted-foreground">
                            Cancelled on: {new Date(cancelledAt).toLocaleString()}
                        </p>
                    )}
                </AlertDescription>
            </Alert>
        );
    }

    return null;
}
