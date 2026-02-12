"use client";

/**
 * Quote Review Section
 * Client reviews and accepts/declines quote with itemized pricing
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { PricingBreakdown } from "./PricingBreakdown";
import type { OrderPricing, OrderLineItem } from "@/types/hybrid-pricing";
import type { Order } from "@/types/order";

interface QuoteReviewSectionProps {
    order: Order;
    pricing: OrderPricing;
    lineItems: OrderLineItem[];
    hasReskinRequests?: boolean;
    onApprove: () => Promise<void>;
    onDecline: (reason: string) => Promise<void>;
}

export function QuoteReviewSection({
    order,
    pricing,
    lineItems,
    hasReskinRequests = false,
    onApprove,
    onDecline,
}: QuoteReviewSectionProps) {
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await onApprove();
            toast.success("Quote accepted! Your order is confirmed.");
            setApproveDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        } finally {
            setIsApproving(false);
        }
    };

    const handleDecline = async () => {
        if (!declineReason.trim() || declineReason.trim().length < 10) {
            toast.error("Please provide a decline reason (min 10 characters)");
            return;
        }

        setIsDeclining(true);
        try {
            await onDecline(declineReason.trim());
            toast.success("Quote declined");
            setDeclineDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to decline quote");
        } finally {
            setIsDeclining(false);
        }
    };

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

    const logisticsSubTotal = basePrice + transportPrice;
    const total = logisticsSubTotal + catalogPrice + customPrice;

    return (
        <div className="space-y-6">
            {/* Quote Expiry Notice */}
            <Card className="border-red-500/30 bg-red-50">
                <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-red-600 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-500">
                            Please respond within 48 hours
                        </p>
                        <p className="text-xs text-red-500">
                            This quote is valid for 48 hours from receipt.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <PricingBreakdown
                order={order}
                pricing={pricing}
                lineItems={lineItems}
                showTitle={true}
            />

            {/* Rebrand Note */}
            {hasReskinRequests && (
                <Card className="border-blue-500/30 bg-blue-50">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-500">
                            ℹ️ This order includes custom rebranding work which will be completed
                            before delivery. Your order will enter fabrication once you approve this
                            quote.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setApproveDialogOpen(true)} size="lg" className="flex-1">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Quote
                </Button>
                <Button variant="outline" onClick={() => setDeclineDialogOpen(true)} size="lg">
                    <XCircle className="h-5 w-5 mr-2" />
                    Decline Quote
                </Button>
            </div>

            {/* Approve Confirmation Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Accept Quote</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm">
                            By accepting this quote, you confirm the order total of{" "}
                            <span className="font-bold font-mono text-lg">
                                {Number(total).toFixed(2)} AED
                            </span>
                        </p>
                        {hasReskinRequests && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-500">
                                    Your order will enter fabrication for custom rebranding work
                                    before delivery.
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Assets will be reserved for your event dates and preparation will begin.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setApproveDialogOpen(false)}
                            disabled={isApproving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} disabled={isApproving}>
                            {isApproving ? "Confirming..." : "Confirm & Accept Quote"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Decline Dialog */}
            <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Decline Quote</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Please let us know why you're declining this quote so we can better
                            assist you.
                        </p>
                        <div>
                            <Label>
                                Decline Reason <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                placeholder="e.g., Price is higher than expected, need to adjust event dates..."
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Minimum 10 characters
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeclineDialogOpen(false)}
                            disabled={isDeclining}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDecline}
                            variant="destructive"
                            disabled={isDeclining}
                        >
                            {isDeclining ? "Declining..." : "Decline Quote"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
