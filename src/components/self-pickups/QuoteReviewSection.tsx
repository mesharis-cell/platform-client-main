"use client";

/**
 * Quote Review Section (self-pickup variant).
 * Direct port of components/orders/QuoteReviewSection.tsx — identical
 * PricingBreakdown layout, identical accept/decline dialogs, PO# required
 * on accept, decline reason (min 10 chars) required on decline.
 * See SP5 in .claude/plans/tender-knitting-avalanche.md.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CheckCircle, XCircle } from "lucide-react";
import { PricingBreakdown } from "@/components/orders/PricingBreakdown";
import type { OrderLineItem } from "@/types/hybrid-pricing";

interface SelfPickupQuoteReviewSectionProps {
    pickup: any;
    pricing: Record<string, any>;
    lineItems: OrderLineItem[];
    onApprove: (poNumber: string) => Promise<void>;
    onDecline: (reason: string) => Promise<void>;
}

export function SelfPickupQuoteReviewSection({
    pickup,
    pricing,
    lineItems,
    onApprove,
    onDecline,
}: SelfPickupQuoteReviewSectionProps) {
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
    const [poNumber, setPoNumber] = useState(pickup?.po_number || "");
    const [declineReason, setDeclineReason] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

    const handleApprove = async () => {
        if (!poNumber.trim()) {
            toast.error("Please enter a PO number before accepting the quote");
            return;
        }

        setIsApproving(true);
        try {
            await onApprove(poNumber.trim());
            toast.success("Quote accepted! Your pickup is confirmed.");
            setApproveDialogOpen(false);
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to approve quote");
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
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to decline quote");
        } finally {
            setIsDeclining(false);
        }
    };

    const total = Number(pricing?.final_total || pricing?.totals?.sell_total_with_vat || 0);

    return (
        <div className="space-y-6">
            {/* Pricing Breakdown — reuses the order version; 'order' prop is
                passed through but the component body only uses pricing + lineItems. */}
            <PricingBreakdown
                order={pickup}
                pricing={pricing}
                lineItems={lineItems}
                showTitle={true}
            />

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
                            By accepting this quote, you confirm the pickup total of{" "}
                            <span className="font-bold font-mono text-lg">
                                {Number(total).toFixed(2)} AED
                            </span>
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="sp-client-po-number">
                                Purchase Order Number <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="sp-client-po-number"
                                data-testid="sp-client-po-number-input"
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                placeholder="Enter PO number"
                                autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground">
                                This PO number will be attached to the confirmed pickup.
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Items will be reserved for your pickup window and prepared for your
                            collection.
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
                                placeholder="e.g., Price is higher than expected, need to adjust pickup dates..."
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
