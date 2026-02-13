"use client";

/**
 * Order Confirmation Page
 * Industrial-refined aesthetic matching catalog/checkout
 */

import { use, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Package,
    Calendar,
    MapPin,
    User,
    FileText,
    Download,
    ArrowLeft,
    Clock,
    AlertCircle,
    DollarSign,
    XCircle,
    Cuboid,
    Truck,
    BoxIcon,
    Loader,
    PartyPopper,
    Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useClientApproveQuote, useClientDeclineQuote } from "@/hooks/use-orders";
import {
    useClientOrderDetail,
    useDownloadCostEstimate,
    useDownloadInvoice,
} from "@/hooks/use-client-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ClientNav } from "@/components/client-nav";
import { usePlatform } from "@/contexts/platform-context";
import { OrderStatusBanner } from "@/components/orders/OrderStatusBanner";
import { QuoteReviewSection } from "@/components/orders/QuoteReviewSection";
import { PricingBreakdown } from "@/components/orders/PricingBreakdown";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { getOrderPrice } from "@/lib/utils/helper";

const costEstimatedStatus = [
    "QUOTED",
    "DECLINED",
    "CONFIRMED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "AWAITING_RETURN",
    "CLOSED",
];

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    const router = useRouter();
    const { data: orderData, isLoading } = useClientOrderDetail(orderId);
    const order = orderData?.data;
    const approveQuote = useClientApproveQuote();
    const declineQuote = useClientDeclineQuote();
    const downloadInvoice = useDownloadInvoice();
    const downloadCostEstimate = useDownloadCostEstimate();
    const { platform } = usePlatform();

    const handleDownloadCostEstimate = async () => {
        try {
            const pdfBlob = await downloadCostEstimate.mutateAsync({
                orderId: orderData?.data?.order_id,
                platformId: platform.platform_id,
            });

            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${order?.order_id || "download"}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to download cost estimate");
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order?.invoice?.invoice_id) return;

        try {
            const pdfBlob = await downloadInvoice.mutateAsync({
                invoiceNumber: order?.invoice?.invoice_id,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${order?.order_id || "download"}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to download Invoice");
        }
    };

    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background">
                    <div className="max-w-7xl mx-auto px-8 py-10">
                        <Skeleton className="h-40 w-full mb-8" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </ClientNav>
        );
    }

    if (!order) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background flex items-center justify-center p-8">
                    <Card className="max-w-md w-full p-10 text-center border-border/50 bg-card/50">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Order Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            Order {orderId} does not exist or you don't have access to it.
                        </p>
                        <Button
                            onClick={() => router.push("/my-orders")}
                            variant="outline"
                            className="gap-2 font-mono"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Orders
                        </Button>
                    </Card>
                </div>
            </ClientNav>
        );
    }

    const statusColors: Record<string, string> = {
        DRAFT: "bg-muted text-muted-foreground border-muted",
        SUBMITTED: "bg-primary/10 text-primary border-primary/30",
        PRICING_REVIEW: "text-secondary border-secondary/30",
        PENDING_APPROVAL: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        QUOTED: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        APPROVED: "bg-green-500/10 text-green-600 border-green-500/30",
        DECLINED: "bg-destructive/10 text-destructive border-destructive/30",
        INVOICED: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
        PAID: "bg-green-500/10 text-green-600 border-green-500/30",
        CONFIRMED: "bg-teal-500/10 text-teal-600 border-teal-500/30",
        IN_PREPARATION: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
        AWAITING_FABRICATION: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        READY_FOR_DELIVERY: "bg-sky-500/10 text-sky-600 border-sky-500/30",
        IN_TRANSIT: "bg-violet-500/10 text-violet-600 border-violet-500/30",
        DELIVERED: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30",
        IN_USE: "bg-pink-500/10 text-pink-600 border-pink-500/30",
        AWAITING_RETURN: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        CLOSED: "bg-slate-600/10 text-slate-700 border-slate-600/20",
    };

    // Individual state checks for precise UI control
    const isSubmitted = order.order_status === "SUBMITTED";
    const isPricingReview = order.order_status === "PRICING_REVIEW";
    const isPendingApproval = order.order_status === "PENDING_APPROVAL";
    const isQuoted = order.order_status === "QUOTED";
    const isApproved = order.order_status === "APPROVED";
    const isDeclined = order.order_status === "DECLINED";
    const isInvoiced = order.order_status === "INVOICED";
    const isPaid = order.order_status === "PAID";
    const isConfirmed = order.order_status === "CONFIRMED";
    const isInPreparation = order.order_status === "IN_PREPARATION";
    const isReadyForDelivery = order.order_status === "READY_FOR_DELIVERY";
    const isInTransit = order.order_status === "IN_TRANSIT";
    const isDelivered = order.order_status === "DELIVERED";
    const isInUse = order.order_status === "IN_USE";
    const isAwaitingReturn = order.order_status === "AWAITING_RETURN";
    const isClosed = order.order_status === "CLOSED";
    const isAwaitingFabrication = order.order_status === "AWAITING_FABRICATION";
    const isCancelled = order.order_status === "CANCELLED";

    // Grouped checks for sections
    const showQuoteSection = isQuoted || isApproved || isDeclined;
    const showInvoiceSection =
        isInvoiced ||
        isPaid ||
        isConfirmed ||
        isInPreparation ||
        isReadyForDelivery ||
        isInTransit ||
        isDelivered ||
        isInUse ||
        isAwaitingReturn ||
        isClosed;
    const isFulfillmentStage =
        isConfirmed ||
        isInPreparation ||
        isReadyForDelivery ||
        isInTransit ||
        isDelivered ||
        isInUse ||
        isAwaitingReturn ||
        isClosed;

    const cancelledReskinRequests = order?.reskin_requests?.filter(
        (reskinRequest) => reskinRequest.cancelled_at !== null
    );

    const { total } = getOrderPrice(order?.order_pricing);

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/10 to-background relative">
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
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground mb-8 font-mono"
                    >
                        <button
                            onClick={() => router.push("/orders")}
                            className="hover:text-foreground transition-colors"
                        >
                            Orders
                        </button>
                        <span>/</span>
                        <span className="text-foreground">{order?.order_id}</span>
                    </motion.div>

                    {/* Status Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Badge
                                            className={`font-mono text-xs border ${statusColors[order?.order_status] || "bg-muted border-muted"}`}
                                        >
                                            {order?.order_status.replace(/_/g, " ")}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {order.quote_sent_at
                                                ? `Quote sent ${new Date(order.quote_sent_at).toLocaleDateString()}`
                                                : `Submitted ${new Date(order.created_at).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                    <h1 className="text-4xl font-bold mb-2">
                                        {isSubmitted && "Order Submitted"}
                                        {isPricingReview && "Under Review"}
                                        {isPendingApproval && "Pricing Under Review"}
                                        {isQuoted && "Quote Ready"}
                                        {isApproved && "Quote Approved"}
                                        {isDeclined && "Quote Declined"}
                                        {isInvoiced && "Invoice Ready"}
                                        {isPaid && "Payment Confirmed"}
                                        {isConfirmed && "Order Confirmed"}
                                        {isInPreparation && "Preparing Your Order"}
                                        {isReadyForDelivery && "Ready to Ship"}
                                        {isInTransit && "On The Way"}
                                        {isDelivered && "Delivered"}
                                        {isInUse && "Enjoy Your Event!"}
                                        {isAwaitingReturn && "Pickup Scheduled"}
                                        {isClosed && "Order Complete"}
                                    </h1>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {isSubmitted &&
                                            "Thank you for your order. Our team is reviewing your requirements."}
                                        {isPricingReview &&
                                            "We are calculating pricing based on your event details and logistics requirements."}
                                        {isPendingApproval &&
                                            "Our management team is reviewing the pricing. You will receive your quote shortly."}
                                        {isQuoted && (
                                            <>
                                                <p>
                                                    Your quote is ready! Review the pricing below
                                                    and approve or decline.
                                                </p>

                                                {cancelledReskinRequests?.length > 0 && (
                                                    <p className="font-semibold text-red-500">
                                                        {cancelledReskinRequests?.length} Reskin
                                                        requests have been cancelled. Review the new
                                                        quote below.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                        {isApproved &&
                                            "Your order is proceeding to invoicing. We will begin fulfillment preparations."}
                                        {isDeclined &&
                                            "Your feedback has been received. Our team may reach out to discuss alternatives."}
                                        {isInvoiced &&
                                            "Your invoice is ready for payment. Download it below and proceed with payment."}
                                        {isPaid &&
                                            "Payment confirmed! We are setting up delivery schedules."}
                                        {isConfirmed &&
                                            "Your order has been confirmed. Items are being prepared for your event."}
                                        {isInPreparation &&
                                            "Our warehouse team is gathering your items."}
                                        {isReadyForDelivery &&
                                            "All items are packed and ready for dispatch."}
                                        {isInTransit && "Your items are on their way to the venue."}
                                        {isDelivered &&
                                            "Items delivered successfully. Enjoy your event!"}
                                        {isInUse &&
                                            "Your event is in progress. We hope everything goes wonderfully!"}
                                        {isAwaitingReturn &&
                                            "Your event is complete. Items will be picked up during the scheduled window."}
                                        {isClosed &&
                                            "All items returned. Thank you for choosing us!"}
                                        {isAwaitingFabrication &&
                                            "Your order is awaiting fabrication. We are working on it!"}
                                    </p>
                                </div>
                                <div
                                    className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${
                                        isApproved || isPaid || isDelivered || isClosed
                                            ? "bg-green-500"
                                            : isDeclined
                                              ? "bg-destructive"
                                              : isQuoted || isInvoiced
                                                ? "bg-amber-500"
                                                : isPendingApproval
                                                  ? "bg-orange-500"
                                                  : isInTransit
                                                    ? "bg-violet-500"
                                                    : isInPreparation
                                                      ? "bg-cyan-500"
                                                      : isAwaitingReturn
                                                        ? "bg-rose-500"
                                                        : "bg-primary"
                                    }`}
                                >
                                    {(isSubmitted || isPricingReview) && (
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    )}
                                    {isPendingApproval && (
                                        <Clock className="w-10 h-10 text-white" />
                                    )}
                                    {isQuoted && <DollarSign className="w-10 h-10 text-white" />}
                                    {isApproved && (
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    )}
                                    {isDeclined && <XCircle className="w-10 h-10 text-white" />}
                                    {isInvoiced && <FileText className="w-10 h-10 text-white" />}
                                    {isPaid && <CheckCircle2 className="w-10 h-10 text-white" />}
                                    {isConfirmed && (
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    )}
                                    {isInPreparation && (
                                        <BoxIcon className="w-10 h-10 text-white" />
                                    )}
                                    {isReadyForDelivery && (
                                        <Package className="w-10 h-10 text-white" />
                                    )}
                                    {isInTransit && <Truck className="w-10 h-10 text-white" />}
                                    {isDelivered && (
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    )}
                                    {isInUse && <PartyPopper className="w-10 h-10 text-white" />}
                                    {isAwaitingReturn && <Clock className="w-10 h-10 text-white" />}
                                    {isClosed && <Archive className="w-10 h-10 text-white" />}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Order ID Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                    >
                        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                        Order ID
                                    </p>
                                    <p className="text-2xl font-bold font-mono tracking-wider">
                                        {order.order_id}
                                    </p>
                                </div>
                                <Cuboid className="h-12 w-12 text-primary/20" />
                            </div>
                        </Card>
                    </motion.div>

                    {/* Status Banner for special states */}
                    {(isAwaitingFabrication || isCancelled) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="mb-6"
                        >
                            <OrderStatusBanner
                                status={order.order_status}
                                cancellationReason={order.cancellation_reason}
                                cancellationNotes={order.cancellation_notes}
                                cancelledAt={order.cancelled_at}
                                pendingReskinCount={
                                    order.reskin_requests?.filter(
                                        (r: any) => !r.completed_at && !r.cancelled_at
                                    ).length || 0
                                }
                            />
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* NEW: Hybrid Pricing Quote Section */}
                            {isQuoted && order?.order_pricing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <QuoteReviewSection
                                        order={order}
                                        pricing={order.order_pricing}
                                        lineItems={order.line_items || []}
                                        hasReskinRequests={
                                            order.reskin_requests?.some(
                                                (r: any) => !r.cancelled_at
                                            ) || false
                                        }
                                        onApprove={async () => {
                                            await approveQuote.mutateAsync({ orderId: order.id });
                                        }}
                                        onDecline={async (reason: string) => {
                                            await declineQuote.mutateAsync({
                                                orderId: order.id,
                                                declineReason: reason,
                                            });
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Quote Summary for Approved/Declined/Confirmed States */}
                            {(isApproved || isDeclined || isConfirmed) && order?.pricing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className="bg-card/50 backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <DollarSign className="h-5 w-5" />
                                                Quote Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <PricingBreakdown
                                                order={order}
                                                pricing={order.pricing}
                                                lineItems={order.line_items || []}
                                                showTitle={false}
                                            />
                                            {isApproved && (
                                                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                                    <p className="text-sm font-mono text-green-700 dark:text-green-400">
                                                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                                        Quote approved{" "}
                                                        {new Date(
                                                            order.updated_at
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                            {isDeclined && order.decline_reason && (
                                                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                                    <p className="text-sm font-mono text-destructive mb-2">
                                                        <XCircle className="w-4 h-4 inline mr-1" />
                                                        Quote declined{" "}
                                                        {new Date(
                                                            order.updated_at
                                                        ).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Reason: {order.decline_reason}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Invoice Section */}
                            {showInvoiceSection && order?.invoice?.invoice_id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                    Invoice
                                                </h3>
                                            </div>
                                            <Badge
                                                className={`font-mono text-xs ${order?.invoice?.invoice_paid_at ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}
                                            >
                                                {order?.invoice?.invoice_paid_at
                                                    ? "PAID"
                                                    : "PENDING"}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="flex justify-between text-sm font-mono">
                                                <span className="text-muted-foreground">
                                                    Invoice Number
                                                </span>
                                                <span className="font-bold">
                                                    {order?.invoice?.invoice_id}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-mono">
                                                <span className="text-muted-foreground">Date</span>
                                                <span className="font-bold">
                                                    {new Date(
                                                        order?.invoice?.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    Total Amount
                                                </span>
                                                <span className="text-2xl font-bold font-mono text-primary">
                                                    AED {total}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleDownloadInvoice}
                                            disabled={downloadInvoice.isPending}
                                            className="w-full font-mono gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            {downloadInvoice.isPending
                                                ? "Downloading..."
                                                : "Download Invoice"}
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Order Status Timeline */}
                            {order.order_status_history &&
                                order.order_status_history.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35 }}
                                    >
                                        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                            <div className="flex items-center gap-2 mb-6">
                                                <Clock className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                    Order Timeline
                                                </h3>
                                            </div>

                                            <div className="space-y-1 relative">
                                                {(() => {
                                                    const sortedHistory = [
                                                        ...order.order_status_history,
                                                    ].sort(
                                                        (a: any, b: any) =>
                                                            new Date(b.timestamp).getTime() -
                                                            new Date(a.timestamp).getTime()
                                                    );
                                                    const currentStatusIndex =
                                                        sortedHistory.findIndex(
                                                            (entry: any) =>
                                                                entry.status === order.order_status
                                                        );
                                                    const activeIndex =
                                                        currentStatusIndex >= 0
                                                            ? currentStatusIndex
                                                            : 0;

                                                    return sortedHistory.map(
                                                        (entry: any, index: number) => {
                                                            const isFirst = index === activeIndex;
                                                            const label =
                                                                entry.status_label || entry.status;
                                                            const ts = new Date(entry.timestamp);

                                                            return (
                                                                <div
                                                                    key={entry.id || index}
                                                                    className="flex gap-3 py-2"
                                                                >
                                                                    <div className="flex flex-col items-center">
                                                                        <div
                                                                            className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
                                                                                isFirst
                                                                                    ? "bg-primary ring-4 ring-primary/20"
                                                                                    : "bg-muted-foreground/40"
                                                                            }`}
                                                                        />
                                                                        {index <
                                                                            sortedHistory.length -
                                                                                1 && (
                                                                            <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 pb-2">
                                                                        <p
                                                                            className={`text-sm font-semibold font-mono ${isFirst ? "text-primary" : "text-muted-foreground"}`}
                                                                        >
                                                                            {label}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {ts.toLocaleDateString()}{" "}
                                                                            {ts.toLocaleTimeString(
                                                                                [],
                                                                                {
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit",
                                                                                }
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    );
                                                })()}
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}

                            {/* Order Items */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <OrderItemsList
                                    items={order.items}
                                    orderStatus={order.order_status}
                                    reskinList={order.reskin_requests}
                                    calculatedTotals={order.calculated_totals}
                                />
                            </motion.div>

                            {/* What's Next Section - State-specific guidance */}
                            {(isSubmitted || isPricingReview || isPendingApproval) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
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
                                                    <p className="font-semibold mb-1">
                                                        Order Review
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Our team reviews your requirements and
                                                        calculates logistics pricing.
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
                                                        Quote sent via email. Return here to approve
                                                        or decline.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    3
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">
                                                        Invoice & Fulfillment
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        After approval, receive invoice and we begin
                                                        fulfillment.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {isApproved && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-green-500/5 border-green-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Your invoice is being generated and will be emailed to
                                            you shortly. Once received, please process payment to
                                            proceed with fulfillment.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isInvoiced && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-amber-500/5 border-amber-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Action Required
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Please process payment for the invoice above. Once
                                            payment is confirmed, we will schedule delivery and
                                            begin fulfillment.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isPaid && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-green-500/5 border-green-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Payment confirmed! Our operations team is coordinating
                                            delivery schedules. You will receive delivery window
                                            details shortly.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {(isConfirmed || isInPreparation) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-cyan-500/5 border-cyan-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <BoxIcon className="w-4 h-4" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Your items are being prepared. Once all items are ready,
                                            they will be dispatched to your venue according to the
                                            delivery schedule.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isReadyForDelivery && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-sky-500/5 border-sky-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            All items are packed and ready! Delivery will begin
                                            shortly. Please ensure someone is available to receive
                                            items during the scheduled window.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isDelivered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-fuchsia-500/5 border-fuchsia-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <PartyPopper className="w-4 h-4" />
                                            What's Next
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Items delivered! Enjoy your event. After the event,
                                            please prepare items for return during the scheduled
                                            pickup window.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isAwaitingReturn && order.pickup_window?.start && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-rose-500/5 border-rose-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Pickup Reminder
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Please ensure all items are ready for pickup on{" "}
                                            <strong>
                                                {new Date(
                                                    order.pickup_window.start
                                                ).toLocaleDateString()}
                                            </strong>{" "}
                                            at{" "}
                                            <strong>
                                                {new Date(
                                                    order.pickup_window.start
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </strong>
                                            .
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Our team will inspect items upon return and update their
                                            condition status.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isClosed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-slate-500/5 border-slate-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Thank You!
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            All items have been returned and inspected. Your order
                                            is now complete.
                                        </p>
                                        <Button
                                            onClick={() => router.push("/catalog")}
                                            variant="outline"
                                            className="font-mono gap-2"
                                        >
                                            <Package className="w-4 h-4" />
                                            Browse Catalog for Next Event
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {costEstimatedStatus.includes(order?.order_status || "") && (
                                <Button
                                    onClick={handleDownloadCostEstimate}
                                    disabled={downloadCostEstimate.isPending}
                                    className="w-full"
                                >
                                    {downloadCostEstimate.isPending
                                        ? "Downloading..."
                                        : "Download Cost Estimate"}
                                </Button>
                            )}

                            {/* Event Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                            Event
                                        </h4>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Start
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {order.event_start_date
                                                    ? new Date(
                                                          order.event_start_date
                                                      ).toLocaleDateString()
                                                    : "N/A"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                End
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {order.event_end_date
                                                    ? new Date(
                                                          order.event_end_date
                                                      ).toLocaleDateString()
                                                    : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Venue */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                            Venue
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <span className="font-semibold">{order.venue_name}</span>,
                                        <span className="text-xs text-muted-foreground leading-relaxed">
                                            {order.venue_location?.address}
                                        </span>
                                        ,
                                        <span className="text-xs text-muted-foreground leading-relaxed">
                                            {order.venue_city}
                                        </span>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Contact */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <User className="w-4 h-4 text-primary" />
                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                            Contact
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Name
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {order.contact_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Email
                                            </p>
                                            <p className="font-mono font-semibold text-xs">
                                                {order.contact_email}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Phone
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {order.contact_phone}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Special Instructions */}
                            {order.special_instructions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                                Instructions
                                            </h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {order.special_instructions}
                                        </p>
                                    </Card>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mt-8 flex gap-3"
                    >
                        <Button
                            variant="outline"
                            onClick={() => router.push("/my-orders")}
                            className="font-mono gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            All Orders
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/catalog")}
                            className="font-mono gap-2"
                        >
                            <Package className="w-4 h-4" />
                            Browse Catalog
                        </Button>
                    </motion.div>
                </div>
            </div>
        </ClientNav>
    );
}
