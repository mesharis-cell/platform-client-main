"use client";

import { XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { OrderStatus } from "@/types/order";

interface OrderStatusBannerProps {
    status: OrderStatus;
    cancellationReason?: string;
    cancellationNotes?: string;
    cancelledAt?: string;
}

export function OrderStatusBanner({
    status,
    cancellationReason,
    cancellationNotes,
    cancelledAt,
}: OrderStatusBannerProps) {
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
