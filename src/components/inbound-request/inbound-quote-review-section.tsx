"use client";

/**
 * Inbound Quote Review Section
 * Client reviews and accepts/declines quote for inbound requests
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RequestPricingCard } from "@/components/inbound-request/request-pricing-card";
import type { InboundRequestDetails } from "@/types/inbound-request";

interface InboundQuoteReviewSectionProps {
    request: InboundRequestDetails;
    onApprove: (note?: string) => Promise<void>;
    onDecline: (note: string) => Promise<void>;
}

export function InboundQuoteReviewSection({
    request,
    onApprove,
    onDecline,
}: InboundQuoteReviewSectionProps) {
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
    const [approveNote, setApproveNote] = useState("");
    const [declineNote, setDeclineNote] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await onApprove(approveNote);
            toast.success("Quote accepted! Your request is confirmed.");
            setApproveDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        } finally {
            setIsApproving(false);
        }
    };

    const handleDecline = async () => {
        setIsDeclining(true);
        try {
            await onDecline(declineNote.trim());
            toast.success("Quote declined");
            setDeclineDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to decline quote");
        } finally {
            setIsDeclining(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Quote Expiry Notice */}
            <Card className="border-red-500/30 bg-red-50 mt-8">
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
            <RequestPricingCard pricingOverview={request.request_pricing} />

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
                            By accepting this quote, you confirm the total estimated cost of{" "}
                            <span className="font-bold font-mono text-lg">
                                {parseFloat(
                                    request.request_pricing.final_total || "0"
                                ).toLocaleString()}{" "}
                                AED
                            </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            We will proceed with processing your inbound request items.
                        </p>

                        <div>
                            <Label>Optional Note</Label>
                            <Textarea
                                value={approveNote}
                                onChange={(e) => setApproveNote(e.target.value)}
                                placeholder="Add any additional notes..."
                                rows={3}
                                className="mt-2"
                            />
                        </div>
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
                                value={declineNote}
                                onChange={(e) => setDeclineNote(e.target.value)}
                                placeholder="e.g., Price is higher than expected..."
                                rows={4}
                                className="mt-2"
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
                            disabled={
                                isDeclining || !declineNote.trim() || declineNote.trim().length < 10
                            }
                        >
                            {isDeclining ? "Declining..." : "Decline Quote"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
