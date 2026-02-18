"use client";

/**
 * Inbound Request Details Page
 * Displays full details of a single inbound request with items
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import {
    useInboundRequest,
    inboundRequestKeys,
    useApproveOrDeclineQuote,
    useDownloadInboundCostEstimate,
    useDownloadInboundInvoice,
} from "@/hooks/use-inbound-requests";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ClientNav } from "@/components/client-nav";
import { usePlatform } from "@/contexts/platform-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle, Download } from "lucide-react";
import { RequestHeader } from "@/components/inbound-request/request-header";
import { RequestInfoCard } from "@/components/inbound-request/request-info-card";
import { RequestItemsList } from "@/components/inbound-request/request-items-list";
import { RequestPricingCard } from "@/components/inbound-request/request-pricing-card";
import type { InboundRequestStatus } from "@/types/inbound-request";
import { InboundQuoteReviewSection } from "@/components/inbound-request/inbound-quote-review-section";
import { motion } from "framer-motion";
import { AssetsFromInbound } from "@/components/inbound-request/assets-from-inbound";

export default function InboundRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data, isLoading } = useInboundRequest(id);
    const approveOrDecline = useApproveOrDeclineQuote();

    const request = data?.data;

    function handleRefresh() {
        queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
    }

    const { platform } = usePlatform();
    const downloadCostEstimate = useDownloadInboundCostEstimate();
    const downloadInvoice = useDownloadInboundInvoice();

    const handleDownloadCostEstimate = async () => {
        try {
            const blob = await downloadCostEstimate.mutateAsync({
                id: request?.inbound_request_id,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${request?.inbound_request_id || "download"}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to download cost estimate");
        }
    };

    const handleDownloadInvoice = async () => {
        if (!request?.invoice?.invoice_id) return;
        try {
            const blob = await downloadInvoice.mutateAsync({
                invoiceId: request.invoice.invoice_id,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${request.invoice.invoice_id}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to download invoice");
        }
    };

    const showCostEstimate =
        request &&
        ["CONFIRMED", "DECLINED", "COMPLETED", "CANCELLED"].includes(request.request_status);
    const showInvoice = request && request.request_status === "COMPLETED";

    console.log("request", request);
    console.log("showCostEstimate", showCostEstimate);

    // Loading State
    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
                    <div className="max-w-7xl mx-auto px-8 py-10">
                        {/* Breadcrumb Skeleton */}
                        <Skeleton className="h-4 w-48 mb-8" />

                        {/* Hero Skeleton */}
                        <Skeleton className="h-40 w-full mb-8 rounded-xl" />

                        {/* Pricing Skeleton */}
                        <Skeleton className="h-24 w-full mb-6 rounded-xl" />

                        {/* Content Grid Skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <Skeleton className="h-64 w-full rounded-xl" />
                                <Skeleton className="h-64 w-full rounded-xl" />
                            </div>
                            <div>
                                <Skeleton className="h-96 w-full rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </ClientNav>
        );
    }

    // Error/Not Found State
    if (!request) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-8">
                    <Card className="max-w-md w-full p-10 text-center border-border/50 bg-card/50">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Request Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            The new stock request you&apos;re looking for doesn&apos;t exist or has
                            been removed.
                        </p>
                        <Button
                            onClick={() => router.push("/assets-inbound")}
                            variant="outline"
                            className="gap-2 font-mono"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Requests
                        </Button>
                    </Card>
                </div>
            </ClientNav>
        );
    }

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background relative">
                {/* Subtle grid pattern */}
                <div
                    className="fixed inset-0 opacity-[0.015] pointer-events-none"
                    style={{
                        backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
                    {/* Header with Status and Actions */}
                    <RequestHeader
                        requestId={request.id}
                        status={request.request_status as InboundRequestStatus}
                        createdAt={request.created_at}
                        request={request}
                        onRefresh={handleRefresh}
                    />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Items */}
                        <div className="lg:col-span-2">
                            <RequestItemsList items={request.items} />
                            {request.request_status === "COMPLETED" && (
                                <AssetsFromInbound items={request.items} />
                            )}

                            {/* Pricing Card or Quote Review */}
                            {request.request_status === "QUOTED" ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <InboundQuoteReviewSection
                                        request={request}
                                        onApprove={async (note) => {
                                            await approveOrDecline.mutateAsync({
                                                id: request.id,
                                                status: "CONFIRMED",
                                                note,
                                            });
                                        }}
                                        onDecline={async (note) => {
                                            await approveOrDecline.mutateAsync({
                                                id: request.id,
                                                status: "DECLINED",
                                                note,
                                            });
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <>
                                    <RequestPricingCard pricingOverview={request.request_pricing} />

                                    {request.request_status === "CONFIRMED" && (
                                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                            <p className="text-sm font-mono text-green-700 dark:text-green-400">
                                                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                                Quote accepted. We are processing your request.
                                            </p>
                                        </div>
                                    )}
                                    {request.request_status === "DECLINED" && (
                                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                            <p className="text-sm font-mono text-destructive mb-2">
                                                <XCircle className="w-4 h-4 inline mr-1" />
                                                Quote declined.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Right Column - Request Info */}
                        <div>
                            <RequestInfoCard
                                company={request.company}
                                requester={request.requester}
                                incomingAt={request.incoming_at}
                                note={request.note}
                                createdAt={request.created_at}
                                updatedAt={request.updated_at}
                            />

                            {/* Downloads */}
                            <div className="space-y-3 mt-6">
                                {showCostEstimate && (
                                    <Button
                                        onClick={handleDownloadCostEstimate}
                                        disabled={downloadCostEstimate.isPending}
                                        variant="outline"
                                        className="w-full justify-start gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        {downloadCostEstimate.isPending
                                            ? "Downloading..."
                                            : "Download Cost Estimate"}
                                    </Button>
                                )}

                                {showInvoice && (
                                    <Button
                                        onClick={handleDownloadInvoice}
                                        disabled={downloadInvoice.isPending}
                                        variant="outline"
                                        className="w-full justify-start gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        {downloadInvoice.isPending
                                            ? "Downloading..."
                                            : "Download Invoice"}
                                    </Button>
                                )}
                            </div>

                            {/* What's Next Section */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-6"
                            >
                                {/* PRICING REVIEW / PENDING APPROVAL */}
                                {(request.request_status === "PRICING_REVIEW" ||
                                    request.request_status === "PENDING_APPROVAL") && (
                                    <Card className="p-6 bg-secondary/5 border-secondary/20">
                                        <h3 className="font-bold font-mono mb-4 uppercase tracking-wide text-sm">
                                            What's Next
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    1
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">Review</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Our team reviews your items and calculates
                                                        pricing.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    2
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">
                                                        Receive Quote
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        You will receive a quote to approve or
                                                        decline.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    3
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">Processing</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        After approval, we process your inbound
                                                        items.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* QUOTED */}
                                {request.request_status === "QUOTED" && (
                                    <Card className="p-6 bg-amber-500/5 border-amber-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Action Required
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Please review the quote and approve or decline to
                                            proceed.
                                        </p>
                                    </Card>
                                )}

                                {/* CONFIRMED */}
                                {request.request_status === "CONFIRMED" && (
                                    <Card className="p-6 bg-green-500/5 border-green-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Quote accepted! We are now processing your request and
                                            preparing for item intake.
                                        </p>
                                    </Card>
                                )}

                                {/* COMPLETED */}
                                {request.request_status === "COMPLETED" && (
                                    <Card className="p-6 bg-slate-500/5 border-slate-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Completed
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            All items have been successfully processed and added to
                                            inventory.
                                        </p>
                                    </Card>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </ClientNav>
    );
}
