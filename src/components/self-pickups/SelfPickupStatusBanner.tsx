"use client";

/**
 * Self-Pickup Status Banner.
 * Per-status explanatory messaging on the client detail page. Mirrors the
 * order detail's explanatory-alert pattern — each status gets a short
 * paragraph of guidance so the client always knows what's happening and
 * what's next. See SP6 in .claude/plans/tender-knitting-avalanche.md.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Clock, Package, PackageCheck, Truck, XCircle } from "lucide-react";
import type { ReactNode } from "react";

interface SelfPickupStatusBannerProps {
    pickup: {
        self_pickup_status: string;
        decline_reason?: string | null;
        pickup_window?: { start?: string; end?: string } | null;
        expected_return_at?: string | null;
        created_at?: string;
        updated_at?: string;
        notes?: string | null;
        pricing_mode?: "STANDARD" | "NO_COST";
    };
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "");

function bannerFor(pickup: SelfPickupStatusBannerProps["pickup"]): {
    variant?: "default" | "destructive";
    className?: string;
    icon: ReactNode;
    title: string;
    body: ReactNode;
} | null {
    const status = pickup.self_pickup_status;
    const pw = pickup.pickup_window;

    switch (status) {
        case "SUBMITTED":
            return {
                icon: <Clock className="h-5 w-5" />,
                title: "Pickup Submitted",
                body: (
                    <p>
                        Thank you for submitting your pickup. Our team is reviewing the details and
                        will send a quote shortly.
                    </p>
                ),
            };
        case "PRICING_REVIEW":
            return {
                icon: <Clock className="h-5 w-5" />,
                title: "Pricing Under Review",
                body: (
                    <p>
                        Our team is pricing your request. You'll receive a quote for approval as
                        soon as it's ready.
                    </p>
                ),
            };
        case "PENDING_APPROVAL":
            return {
                icon: <Clock className="h-5 w-5" />,
                title: "Quote Being Finalized",
                body: <p>Your quote is being finalized by the admin team — shouldn't be long.</p>,
            };
        case "QUOTED":
            return {
                className: "border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/20",
                icon: <CheckCircle className="h-5 w-5 text-indigo-600" />,
                title: "Your Quote is Ready",
                body: <p>Review the pricing below and accept or decline.</p>,
            };
        case "DECLINED":
            return {
                variant: "destructive",
                className: "border-red-500 bg-red-50 dark:bg-red-950/20",
                icon: <XCircle className="h-5 w-5" />,
                title: "Quote Declined",
                body: (
                    <>
                        <p>You declined this quote.</p>
                        {pickup.decline_reason && (
                            <p className="mt-2">
                                <strong>Your reason:</strong> {pickup.decline_reason}
                            </p>
                        )}
                    </>
                ),
            };
        case "CONFIRMED":
            return {
                className: "border-green-500/40 bg-green-50 dark:bg-green-950/20",
                icon: <CheckCircle className="h-5 w-5 text-green-600" />,
                title:
                    pickup.pricing_mode === "NO_COST"
                        ? "Pickup Approved — No Cost"
                        : "Pickup Confirmed",
                body:
                    pickup.pricing_mode === "NO_COST" ? (
                        <p>
                            Your pickup has been approved at no cost. Items will be ready for
                            collection during your pickup window
                            {pw?.start ? ` (${fmtDate(pw.start)})` : ""}.
                        </p>
                    ) : (
                        <p>
                            We'll have your items ready for collection during your pickup window
                            {pw?.start ? ` (${fmtDate(pw.start)})` : ""}.
                        </p>
                    ),
            };
        case "READY_FOR_PICKUP":
            return {
                className: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
                icon: <PackageCheck className="h-5 w-5 text-emerald-600" />,
                title: "Items Ready for Collection",
                body: (
                    <p>
                        Your items are ready at our warehouse. Please collect during your pickup
                        window{pw?.start ? `: ${fmtDate(pw.start)} – ${fmtDate(pw.end)}` : ""}.
                    </p>
                ),
            };
        case "PICKED_UP":
            return {
                className: "border-teal-500/40 bg-teal-50 dark:bg-teal-950/20",
                icon: <Package className="h-5 w-5 text-teal-600" />,
                title: "Items Collected",
                body: (
                    <p>
                        Items have been collected
                        {pickup.expected_return_at
                            ? `. Please return them by ${fmtDate(pickup.expected_return_at)}`
                            : "."}
                    </p>
                ),
            };
        case "AWAITING_RETURN":
            return {
                className: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20",
                icon: <Truck className="h-5 w-5 text-amber-600" />,
                title: "Awaiting Return",
                body: (
                    <p>
                        We're expecting your return. Please contact our team if you need more time.
                    </p>
                ),
            };
        case "CLOSED":
            return {
                className: "border-border bg-muted/50",
                icon: <CheckCircle className="h-5 w-5 text-muted-foreground" />,
                title: "Pickup Closed",
                body: <p>Thank you! Return scan complete and your pickup is fully closed.</p>,
            };
        case "CANCELLED":
            return {
                variant: "destructive",
                className: "border-red-500 bg-red-50 dark:bg-red-950/20",
                icon: <XCircle className="h-5 w-5" />,
                title: "Pickup Cancelled",
                body: <p>This pickup was cancelled.</p>,
            };
        default:
            return null;
    }
}

export function SelfPickupStatusBanner({ pickup }: SelfPickupStatusBannerProps) {
    const b = bannerFor(pickup);
    if (!b) return null;
    return (
        <Alert variant={b.variant} className={b.className}>
            {b.icon}
            <AlertTitle>{b.title}</AlertTitle>
            <AlertDescription>{b.body}</AlertDescription>
        </Alert>
    );
}
