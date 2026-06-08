"use client";

/**
 * Order Confirmation Page
 * Industrial-refined aesthetic matching catalog/checkout
 */

import { use, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CheckCircle2,
    Package,
    Calendar,
    MapPin,
    User,
    FileText,
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
import { useClientApproveQuote, useClientDeclineQuote } from "@/hooks/use-orders";
import { useClientOrderDetail, useDownloadCostEstimate } from "@/hooks/use-client-orders";
import { useCompanyApproveOrderQuote, useCompanyDeclineOrderQuote } from "@/hooks/use-company";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ClientNav } from "@/components/client-nav";
import { usePlatform } from "@/contexts/platform-context";
import { OrderStatusBanner } from "@/components/orders/OrderStatusBanner";
import { QuoteReviewSection } from "@/components/orders/QuoteReviewSection";
import { PricingBreakdown } from "@/components/orders/PricingBreakdown";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { ScanActivityTimeline } from "@/components/scanning/scan-activity-timeline";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { ClientWorkflowRequestsCard } from "@/components/workflows/workflow-requests-card";
import { canEditOrderDetails } from "@/lib/order-helpers";
import { useChangePulse } from "@/hooks/use-change-pulse";
import { useUpdateOrderDetails } from "@/hooks/use-order-editing";
import { useEditableEntity } from "@/hooks/use-editable-entity";
import { useOrderEditFeasibility } from "@/hooks/use-order-edit-feasibility";
import { useOrderEditAvailability } from "@/hooks/use-order-edit-availability";
import {
    buildDraft,
    diffPayload,
    EDIT_ERROR_CODES,
    SECTION_KEYS,
    type Draft,
    type OrderForEdit,
    type OrderEditPayload,
    type SectionKey,
} from "@/components/orders/editing/order-edit-contract";
import {
    EditableEntityProvider,
    EditAffordance,
    SectionEditModal,
} from "@/components/orders/editing/editable-primitives";
import { ContactEditor } from "@/components/orders/editing/ContactEditor";
import { VenueContactEditor } from "@/components/orders/editing/VenueContactEditor";
import { DescriptiveFieldsEditor } from "@/components/orders/editing/DescriptiveFieldsEditor";
import { OrderEventDatesSection } from "@/components/orders/editing/OrderEventDatesSection";
import { OrderItemsEditableCard } from "@/components/orders/editing/OrderItemsEditableCard";
import { permitSectionValue, applyPermitPatch } from "@/components/orders/editing/permit-bridge";
import { PermitSection } from "@/components/permits/PermitSection";

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
    "RETURN_IN_TRANSIT",
    "CLOSED",
];

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    // Company Back Office: a manager opening a colleague's order arrives with
    // ?company=1. The page fetches from the company endpoint, gates the
    // approve/decline actions on company:manage_quotes, and shows attribution.
    const isCompanyView = searchParams.get("company") === "1";
    const { user } = useToken();
    const canManageCompanyQuotes = hasPermission(user, "company:manage_quotes");
    // Order-editing (P1): CLIENT users have orders:edit_details by default.
    const canEditDetailsPermission = hasPermission(user, "orders:edit_details");
    const { data: orderData, isLoading } = useClientOrderDetail(orderId, {
        company: isCompanyView,
    });
    const order = orderData?.data;
    const approveQuote = useClientApproveQuote();
    const declineQuote = useClientDeclineQuote();
    const companyApproveQuote = useCompanyApproveOrderQuote();
    const companyDeclineQuote = useCompanyDeclineOrderQuote();
    const ordersBackHref = isCompanyView ? "/company/orders" : "/my-orders";
    const downloadCostEstimate = useDownloadCostEstimate();
    const { platform } = usePlatform();
    const invoicingEnabled = platform?.features?.enable_kadence_invoicing === true;

    // PULSE (#12): purely client-side "new activity" dot on the change-history
    // (Order Timeline) surface. The latest change is the most-recent
    // order_status_history timestamp; the pulse shows when it's newer than what
    // this browser last saw, and clears on view. Hooks run before the early
    // returns below, so this stays unconditional.
    const latestChangeAt = useMemo(() => {
        const history = (order?.order_status_history ?? []) as Array<{ timestamp?: string }>;
        let latest: number | null = null;
        let latestIso: string | null = null;
        for (const entry of history) {
            if (!entry?.timestamp) continue;
            const t = new Date(entry.timestamp).getTime();
            if (Number.isNaN(t)) continue;
            if (latest === null || t > latest) {
                latest = t;
                latestIso = entry.timestamp;
            }
        }
        return latestIso;
    }, [order?.order_status_history]);
    const { showPulse: showChangePulse, markSeen: markChangeSeen } = useChangePulse(
        order?.id,
        latestChangeAt
    );

    // ---- Order-editing (P1): in-place inline-edit controller ----
    // Hooks must run UNCONDITIONALLY (before the early returns below), so the
    // controller is built from a normalized order — a safe empty shell until the
    // real order lands. The feasibility/availability companions are internally
    // `enabled`-gated (only fire when items exist), and the per-card `canEdit` is
    // false until the order resolves, so nothing edit-related renders early.
    const orderForEdit = (order ?? { id: "" }) as unknown as OrderForEdit;
    const companyName = platform?.company_name ?? null;
    const eventDateInputsEnabled =
        (platform?.features as Record<string, boolean> | undefined)?.enable_event_date_inputs ===
        true;
    const feasibilityHelperEnabled =
        (platform?.features as Record<string, boolean> | undefined)?.enable_feasibility_helper !==
        false;
    const editFlags = useMemo(
        () => ({ eventDateInputsEnabled, feasibilityHelperEnabled }),
        [eventDateInputsEnabled, feasibilityHelperEnabled]
    );

    const updateOrderDetails = useUpdateOrderDetails(order?.id ?? "");
    const orderEditController = useEditableEntity<
        OrderForEdit,
        Draft,
        OrderEditPayload,
        SectionKey,
        OrderForEdit["venue_location"]
    >({
        entity: orderForEdit,
        entityUuid: order?.id ?? "",
        buildDraft,
        diffPayload,
        diffCtx: orderForEdit.venue_location,
        sectionKeys: SECTION_KEYS,
        update: updateOrderDetails,
        permitGuard: (_payload, draft) =>
            "permit_requirements" in (_payload as object) &&
            draft.descriptive.permit.requires_permit &&
            draft.descriptive.permit.permit_owner === "UNKNOWN"
                ? "Please choose who arranges the permit before saving."
                : null,
        editErrorCodes: EDIT_ERROR_CODES,
    });
    const editFeasibility = useOrderEditFeasibility(
        orderEditController.draft,
        orderForEdit,
        editFlags
    );
    const editAvailability = useOrderEditAvailability(
        orderEditController.draft,
        orderForEdit,
        editFlags
    );
    // Feed the companion verdicts BACK into the controller (the inverted data-flow
    // from design §1.1 — closes the circular dep on the controller's own draft).
    // Depend on the STABLE `setWiring` callback (a useCallback([]) on the
    // controller), NOT the whole controller object — the controller is a fresh
    // object every render, so depending on it would re-run this effect every render.
    // `editFeasibility`/`editAvailability` are now memoized by their companion
    // hooks, so this effect fires only when a verdict actually changes; the
    // controller's setWiring guard then bails when the value is unchanged.
    const setWiring = orderEditController.setWiring;
    useEffect(() => {
        setWiring({
            feasibility: editFeasibility,
            availability: editAvailability,
        });
    }, [setWiring, editFeasibility, editAvailability]);

    const handleDownloadCostEstimate = async () => {
        if (!order?.id || !platform?.platform_id) {
            toast.error("Order context is missing. Please refresh and try again.");
            return;
        }

        try {
            const pdfBlob = await downloadCostEstimate.mutateAsync({
                orderId: order.id,
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
                            onClick={() => router.push(ordersBackHref)}
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
        CONFIRMED: "bg-teal-500/10 text-teal-600 border-teal-500/30",
        IN_PREPARATION: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
        READY_FOR_DELIVERY: "bg-sky-500/10 text-sky-600 border-sky-500/30",
        IN_TRANSIT: "bg-violet-500/10 text-violet-600 border-violet-500/30",
        DELIVERED: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30",
        IN_USE: "bg-pink-500/10 text-pink-600 border-pink-500/30",
        DERIG: "bg-purple-500/10 text-purple-600 border-purple-500/30",
        AWAITING_RETURN: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        RETURN_IN_TRANSIT: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        CLOSED: "bg-muted/50 text-foreground border-border",
    };

    // Individual state checks for precise UI control
    const isSubmitted = order.order_status === "SUBMITTED";
    const isPricingReview = order.order_status === "PRICING_REVIEW";
    const isPendingApproval = order.order_status === "PENDING_APPROVAL";
    const isQuoted = order.order_status === "QUOTED";
    const isApproved = order.order_status === "APPROVED";
    const isDeclined = order.order_status === "DECLINED";
    const isConfirmed = order.order_status === "CONFIRMED";
    const isInPreparation = order.order_status === "IN_PREPARATION";
    const isReadyForDelivery = order.order_status === "READY_FOR_DELIVERY";
    const isInTransit = order.order_status === "IN_TRANSIT";
    const isDelivered = order.order_status === "DELIVERED";
    const isInUse = order.order_status === "IN_USE";
    const isAwaitingReturn = order.order_status === "AWAITING_RETURN";
    const isReturnInTransit = order.order_status === "RETURN_IN_TRANSIT";
    const isClosed = order.order_status === "CLOSED";
    const isCancelled = order.order_status === "CANCELLED";

    // Grouped checks for sections
    const showQuoteSection = isQuoted || isApproved || isDeclined;
    const isDerig = order?.order_status === "DERIG";
    const isFulfillmentStage =
        isConfirmed ||
        isInPreparation ||
        isReadyForDelivery ||
        isInTransit ||
        isDelivered ||
        isInUse ||
        isDerig ||
        isAwaitingReturn ||
        isReturnInTransit ||
        isClosed;

    // Order-editing (P1): show the edit panel only inside the pre-CONFIRMED band
    // AND only to someone allowed to edit this order — its creator (owner view),
    // or a company manager viewing a colleague's order via ?company=1. At
    // CONFIRMED+ the order is frozen, so no edit affordance renders at all.
    const isPreConfirmed = canEditOrderDetails(order.order_status);
    const isOwnOrder = !!user?.id && order.created_by === user.id;
    const isCompanyManagerViewingCompanyOrder = isCompanyView && canManageCompanyQuotes;
    const canEditOrder =
        isPreConfirmed &&
        canEditDetailsPermission &&
        (isOwnOrder || isCompanyManagerViewingCompanyOrder);

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background relative">
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
                            onClick={() => router.push(ordersBackHref)}
                            className="hover:text-foreground transition-colors"
                        >
                            {isCompanyView ? "Company Orders" : "Orders"}
                        </button>
                        <span>/</span>
                        <span className="text-foreground">{order?.order_id}</span>
                    </motion.div>

                    {/* Company Back Office attribution banner — only when a
                    manager is viewing a colleague's order. */}
                    {isCompanyView && (
                        <div className="mb-6 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-xs uppercase tracking-wide text-foreground/80 flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Viewing as company manager
                            {order?.user?.name ? ` · created by ${order.user.name}` : ""}
                        </div>
                    )}

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
                                            {order?.order_status === "IN_USE"
                                                ? "ON SITE"
                                                : order?.order_status.replace(/_/g, " ")}
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
                                        {isConfirmed && "Order Confirmed"}
                                        {isInPreparation && "Preparing Your Order"}
                                        {isReadyForDelivery && "Ready to Ship"}
                                        {isInTransit && "On The Way"}
                                        {isDelivered && "Delivered"}
                                        {isInUse && "On Site"}
                                        {isAwaitingReturn && "Pickup Scheduled"}
                                        {isReturnInTransit && "Items Returning"}
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
                                            <span>
                                                Your quote is ready! Review the pricing below and
                                                approve or decline.
                                            </span>
                                        )}
                                        {isApproved &&
                                            "Your order is proceeding to invoicing. We will begin fulfillment preparations."}
                                        {isDeclined &&
                                            "Your feedback has been received. Our team may reach out to discuss alternatives."}
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
                                            "Your assets are currently on site and in use at the venue."}
                                        {isAwaitingReturn &&
                                            "Your event is complete. Items will be picked up during the scheduled window."}
                                        {isReturnInTransit &&
                                            "Your items are currently in transit back to our warehouse."}
                                        {isClosed &&
                                            "All items returned. Thank you for choosing us!"}
                                    </p>
                                </div>
                                <div
                                    className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${
                                        isApproved || isDelivered || isClosed
                                            ? "bg-green-500"
                                            : isDeclined
                                              ? "bg-destructive"
                                              : isQuoted
                                                ? "bg-amber-500"
                                                : isPendingApproval
                                                  ? "bg-orange-500"
                                                  : isInTransit
                                                    ? "bg-violet-500"
                                                    : isInPreparation
                                                      ? "bg-cyan-500"
                                                      : isAwaitingReturn
                                                        ? "bg-rose-500"
                                                        : isReturnInTransit
                                                          ? "bg-orange-500"
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
                                    {isReturnInTransit && (
                                        <Truck className="w-10 h-10 text-white" />
                                    )}
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
                        data-testid="client-order-hero"
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
                                    {order.po_number && (
                                        <p
                                            className="mt-2 text-sm font-mono text-muted-foreground"
                                            data-testid="client-order-po-number"
                                        >
                                            PO: {order.po_number}
                                        </p>
                                    )}
                                </div>
                                <Cuboid className="h-12 w-12 text-primary/20" />
                            </div>
                        </Card>
                    </motion.div>

                    {/* Status Banner for special states */}
                    {isCancelled && (
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
                            />
                        </motion.div>
                    )}

                    <EditableEntityProvider controller={orderEditController}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Order-editing (P2): the order was edited after a quote
                            was sent, so it bounced back for re-pricing. Informational
                            notice — display-only, no action for the client. */}
                                {order.financial_status === "QUOTE_REVISED" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.28 }}
                                    >
                                        <Card className="p-6 bg-secondary/5 border-secondary/20">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                                                <div>
                                                    <h3 className="font-bold font-mono mb-1 uppercase tracking-wide text-sm">
                                                        Quote Being Revised
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Your order was updated and your quote is
                                                        being revised. You'll receive an updated
                                                        quote shortly.
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* NEW: Hybrid Pricing Quote Section */}
                                {/* Actionable quote review. In company view it renders only for a
                            manager with company:manage_quotes; otherwise (read-only manager)
                            the quote shows as a non-actionable breakdown below. */}
                                {isQuoted &&
                                    order?.order_pricing &&
                                    (!isCompanyView || canManageCompanyQuotes) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            data-testid="client-order-quote-review"
                                        >
                                            <QuoteReviewSection
                                                order={order}
                                                pricing={order.order_pricing}
                                                lineItems={order.line_items || []}
                                                onApprove={async (poNumber: string) => {
                                                    if (isCompanyView) {
                                                        await companyApproveQuote.mutateAsync({
                                                            id: order.id,
                                                            po_number: poNumber,
                                                        });
                                                    } else {
                                                        await approveQuote.mutateAsync({
                                                            orderId: order.id,
                                                            poNumber,
                                                        });
                                                    }
                                                }}
                                                onDecline={async (reason: string) => {
                                                    if (isCompanyView) {
                                                        await companyDeclineQuote.mutateAsync({
                                                            id: order.id,
                                                            decline_reason: reason,
                                                        });
                                                    } else {
                                                        await declineQuote.mutateAsync({
                                                            orderId: order.id,
                                                            declineReason: reason,
                                                        });
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    )}

                                {/* Read-only quote for a company manager without
                            manage_quotes — they can see the quote but not act. */}
                                {isQuoted &&
                                    order?.order_pricing &&
                                    isCompanyView &&
                                    !canManageCompanyQuotes && (
                                        <PricingBreakdown
                                            order={order}
                                            pricing={order.order_pricing}
                                            lineItems={order.line_items || []}
                                        />
                                    )}

                                {/* Quote Summary for Approved/Declined/Confirmed States */}
                                {(isApproved || isDeclined || isConfirmed) &&
                                    order?.order_pricing && (
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
                                                        pricing={order.order_pricing}
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

                                {/* Order Status Timeline */}
                                {order.order_status_history &&
                                    order.order_status_history.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35 }}
                                        >
                                            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                                <button
                                                    type="button"
                                                    onClick={markChangeSeen}
                                                    className="flex items-center gap-2 mb-6 text-left"
                                                    data-testid="order-timeline-header"
                                                >
                                                    <Clock className="w-5 h-5 text-primary" />
                                                    <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                        Order Timeline
                                                    </h3>
                                                    {showChangePulse && (
                                                        <span
                                                            className="relative ml-1 flex h-2.5 w-2.5"
                                                            title="New activity since you last viewed"
                                                            data-testid="order-change-pulse"
                                                        >
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                                        </span>
                                                    )}
                                                </button>

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
                                                                    entry.status ===
                                                                    order.order_status
                                                            );
                                                        const activeIndex =
                                                            currentStatusIndex >= 0
                                                                ? currentStatusIndex
                                                                : 0;

                                                        return sortedHistory.map(
                                                            (entry: any, index: number) => {
                                                                const isFirst =
                                                                    index === activeIndex;
                                                                const rawLabel =
                                                                    entry.status_label ||
                                                                    entry.status;
                                                                const label =
                                                                    rawLabel === "In Use" ||
                                                                    rawLabel === "IN_USE"
                                                                        ? "On Site"
                                                                        : rawLabel;
                                                                const ts = new Date(
                                                                    entry.timestamp
                                                                );

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
                                {Array.isArray((order as any)?.linked_service_requests) &&
                                    (order as any).linked_service_requests.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35 }}
                                        >
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                                <CardHeader>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        Linked Service Requests
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {(order as any).linked_service_requests.map(
                                                        (sr: any) => (
                                                            <div
                                                                key={sr.id}
                                                                className="border rounded-lg p-3 bg-muted/10"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <button
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/service-requests/${sr.id}`
                                                                            )
                                                                        }
                                                                        className="text-sm font-mono text-primary hover:underline"
                                                                    >
                                                                        {sr.service_request_id}
                                                                    </button>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant={
                                                                                sr.request_status ===
                                                                                "COMPLETED"
                                                                                    ? "default"
                                                                                    : "outline"
                                                                            }
                                                                            className="font-mono text-[10px] border"
                                                                        >
                                                                            {sr.request_status}
                                                                        </Badge>
                                                                        {/* <Badge className="font-mono text-[10px] border">
                                                                        {sr.commercial_status}
                                                                    </Badge> */}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                                    {sr.request_type} |{" "}
                                                                    {typeof sr.total === "string"
                                                                        ? `AED ${Number(sr.total).toFixed(2)}`
                                                                        : "Total hidden"}
                                                                </p>
                                                            </div>
                                                        )
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}

                                {/* Items — read-only list, or the in-place editable card
                            (same shell) when this order is editable. Items are always
                            inline (their own controller binding), so the editable card
                            renders the bounded quantity editor + 2-step picker adds. */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {canEditOrder ? (
                                        <OrderItemsEditableCard
                                            order={order as unknown as OrderForEdit}
                                        />
                                    ) : (
                                        <OrderItemsList
                                            items={order.items}
                                            orderId={order.id}
                                            orderStatus={order.order_status}
                                            calculatedTotals={order.calculated_totals}
                                        />
                                    )}
                                </motion.div>

                                {/* Permit / Access — ALWAYS-render host when editable
                            (so a no-permit order can still go no→yes); otherwise
                            collapses to main's data-presence behavior (renders only
                            when a permit is required) to stay pixel-identical to main.
                            Venue contact is NO LONGER read here — it's its own card. */}
                                {(canEditOrder || order.permit_requirements?.requires_permit) &&
                                    (() => {
                                        const permitBinding = orderEditController.bind(
                                            "permit",
                                            canEditOrder
                                        );
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.42 }}
                                            >
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                                    <CardHeader>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <CardTitle className="flex items-center gap-2">
                                                                <FileText className="h-5 w-5 text-primary" />
                                                                Permit / Access Coordination
                                                            </CardTitle>
                                                            <EditAffordance
                                                                binding={permitBinding}
                                                                variant="client"
                                                                mode="modal"
                                                            />
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3 text-sm">
                                                        <SectionEditModal
                                                            binding={permitBinding}
                                                            title="Permit / Access Coordination"
                                                            contentClassName="sm:max-w-2xl"
                                                            editor={(b) => (
                                                                <PermitSection
                                                                    value={permitSectionValue(
                                                                        b.draft
                                                                    )}
                                                                    onChange={(patch) =>
                                                                        b.patch((prev) =>
                                                                            applyPermitPatch(
                                                                                prev,
                                                                                patch
                                                                            )
                                                                        )
                                                                    }
                                                                    companyName={companyName}
                                                                    disabled={b.saving}
                                                                />
                                                            )}
                                                        />
                                                        {order.permit_requirements
                                                            ?.requires_permit ? (
                                                            <>
                                                                <div>
                                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                        Ownership
                                                                    </p>
                                                                    <p className="font-medium">
                                                                        {order.permit_requirements
                                                                            .permit_owner ===
                                                                            "CLIENT" &&
                                                                            "Client will arrange permits"}
                                                                        {order.permit_requirements
                                                                            .permit_owner ===
                                                                            "PLATFORM" &&
                                                                            "Platform will coordinate permits"}
                                                                        {order.permit_requirements
                                                                            .permit_owner ===
                                                                            "UNKNOWN" &&
                                                                            "Permit ownership still to be confirmed"}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 text-xs font-mono">
                                                                    {order.permit_requirements
                                                                        .requires_vehicle_docs && (
                                                                        <span className="rounded-full border px-2 py-1">
                                                                            Vehicle documents
                                                                            required
                                                                        </span>
                                                                    )}
                                                                    {order.permit_requirements
                                                                        .requires_staff_ids && (
                                                                        <span className="rounded-full border px-2 py-1">
                                                                            Staff IDs required
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {order.permit_requirements
                                                                    .notes && (
                                                                    <div>
                                                                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                            Notes
                                                                        </p>
                                                                        <p className="leading-relaxed">
                                                                            {
                                                                                order
                                                                                    .permit_requirements
                                                                                    .notes
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-muted-foreground font-mono">
                                                                    Additional charges may apply
                                                                    depending on venue permit
                                                                    requirements.
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="font-medium">
                                                                No permit required
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        );
                                    })()}

                                {/* Item 4: client-facing workflows surface — surfaces any workflow
                                where CLIENT is in viewer_roles or actor_roles. Most common
                                case is the auto-opened PERMIT_HANDLING workflow when the
                                client picked "I'll handle the permit" at checkout. */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.42 }}
                                >
                                    <ClientWorkflowRequestsCard
                                        entityType="ORDER"
                                        entityId={order.id}
                                    />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.43 }}
                                >
                                    <EntityAttachmentsCard
                                        entityType="ORDER"
                                        entityId={order.id}
                                        title="Supporting Documents"
                                    />
                                </motion.div>

                                {isFulfillmentStage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.45 }}
                                    >
                                        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Clock className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                    Scan Activity
                                                </h3>
                                            </div>
                                            <ScanActivityTimeline orderId={order.order_id} />
                                        </Card>
                                    </motion.div>
                                )}

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
                                                            Quote sent via email. Return here to
                                                            approve or decline.
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
                                                            After approval, receive invoice and we
                                                            begin fulfillment.
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
                                                Order Confirmed
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Great news! Your order is confirmed and our team
                                                will be in touch with delivery schedule details
                                                shortly.
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
                                                Your items are being prepared. Once all items are
                                                ready, they will be dispatched to your venue
                                                according to the delivery schedule.
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
                                                shortly. Please ensure someone is available to
                                                receive items during the scheduled window.
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
                                                Our team will inspect items upon return and update
                                                their condition status.
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
                                        <Card className="p-6 bg-muted/50 border-border">
                                            <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Thank You!
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                All items have been returned and inspected. Your
                                                order is now complete.
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
                                {/* Estimate Download UX (#15): when the order was edited
                            after a quote was sent it bounces to QUOTE_REVISED and the
                            estimate PDF is stale (the API would 409). In that state we
                            HIDE the download wherever it would otherwise appear and show
                            the revising notice instead. This message is independent of
                            the cost-estimate status gate because a QUOTE_REVISED order
                            usually sits in PRICING_REVIEW (not an estimate-eligible
                            status), and the client still needs to know why no download
                            is offered. */}
                                {order.financial_status === "QUOTE_REVISED" ? (
                                    <div
                                        className="rounded-md border border-secondary/30 bg-secondary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed"
                                        data-testid="client-estimate-revising"
                                    >
                                        <span className="font-mono font-semibold text-secondary uppercase tracking-wide block mb-1">
                                            Estimate unavailable
                                        </span>
                                        Quote is being revised — a new estimate will be available
                                        once re-approved.
                                    </div>
                                ) : (
                                    costEstimatedStatus.includes(order?.order_status || "") && (
                                        <Button
                                            onClick={handleDownloadCostEstimate}
                                            disabled={downloadCostEstimate.isPending}
                                            className="w-full"
                                        >
                                            {downloadCostEstimate.isPending
                                                ? "Downloading..."
                                                : "Download Cost Estimate"}
                                        </Button>
                                    )
                                )}

                                {/* Event / Venue / Contact sidebar cards — now edit
                            IN PLACE. Each card ALWAYS renders (the grid never
                            collapses); an inline Edit affordance flips that card into
                            its editor in place via the shared controller. */}
                                {(() => {
                                    const eventDatesBinding = orderEditController.bind(
                                        "eventDates",
                                        canEditOrder && eventDateInputsEnabled
                                    );
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                                            Event
                                                        </h4>
                                                    </div>
                                                    <EditAffordance
                                                        binding={eventDatesBinding}
                                                        variant="client"
                                                        mode="modal"
                                                    />
                                                </div>
                                                <SectionEditModal
                                                    binding={eventDatesBinding}
                                                    title="Event Dates"
                                                    contentClassName="sm:max-w-2xl"
                                                    editor={(b) => (
                                                        <OrderEventDatesSection
                                                            value={b.draft.eventDates}
                                                            minDate={editFeasibility.minDate}
                                                            onChange={(patch) =>
                                                                b.patch((prev) => ({
                                                                    ...prev,
                                                                    eventDates: {
                                                                        ...prev.eventDates,
                                                                        ...patch,
                                                                    },
                                                                }))
                                                            }
                                                            disabled={b.saving}
                                                            helperProps={
                                                                editFeasibility.helperProps
                                                            }
                                                        />
                                                    )}
                                                />
                                                <div className="space-y-3 text-sm">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase">
                                                            Start
                                                        </p>
                                                        <p className="font-mono font-semibold">
                                                            {order.event_start_date
                                                                ? new Date(
                                                                      order.event_start_date
                                                                  ).toLocaleString([], {
                                                                      year: "numeric",
                                                                      month: "short",
                                                                      day: "numeric",
                                                                      hour: "2-digit",
                                                                      minute: "2-digit",
                                                                  })
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
                                                                  ).toLocaleString([], {
                                                                      year: "numeric",
                                                                      month: "short",
                                                                      day: "numeric",
                                                                      hour: "2-digit",
                                                                      minute: "2-digit",
                                                                  })
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })()}

                                {/* Venue & Logistics — edits the FULL descriptive group
                            (venue name/city/address + special instructions + PO +
                            permanent-placement) so exactly one card owns each field.
                            Read body is clean stacked rows (fixed the stray-comma
                            run-together markup). */}
                                {(() => {
                                    const descriptiveBinding = orderEditController.bind(
                                        "descriptive",
                                        canEditOrder
                                    );
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-primary" />
                                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                                            Venue & Logistics
                                                        </h4>
                                                    </div>
                                                    <EditAffordance
                                                        binding={descriptiveBinding}
                                                        variant="client"
                                                        mode="modal"
                                                    />
                                                </div>
                                                <SectionEditModal
                                                    binding={descriptiveBinding}
                                                    title="Venue & Logistics"
                                                    contentClassName="sm:max-w-2xl"
                                                    editor={(b) => (
                                                        <DescriptiveFieldsEditor
                                                            value={b.draft.descriptive}
                                                            onChange={(patch) =>
                                                                b.patch((prev) => ({
                                                                    ...prev,
                                                                    descriptive: {
                                                                        ...prev.descriptive,
                                                                        ...patch,
                                                                    },
                                                                }))
                                                            }
                                                            disabled={b.saving}
                                                        />
                                                    )}
                                                />
                                                <div className="space-y-3 text-sm">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase">
                                                            Venue Name
                                                        </p>
                                                        <p className="font-semibold break-words">
                                                            {order.venue_name || "—"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase">
                                                            City
                                                        </p>
                                                        <p className="font-medium break-words">
                                                            {order.venue_city ||
                                                                order.venue_location?.city ||
                                                                "—"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase">
                                                            Address
                                                        </p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                                            {order.venue_location?.address || "—"}
                                                        </p>
                                                    </div>
                                                    {order.po_number && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                                PO Number
                                                            </p>
                                                            <p className="font-mono font-medium break-words">
                                                                {order.po_number}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })()}

                                {/* Contact — execution contact (distinct from venue
                            contact). Edits in place via the `contact` binding. */}
                                {(() => {
                                    const contactBinding = orderEditController.bind(
                                        "contact",
                                        canEditOrder
                                    );
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-primary" />
                                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                                            Contact
                                                        </h4>
                                                    </div>
                                                    <EditAffordance
                                                        binding={contactBinding}
                                                        variant="client"
                                                        mode="modal"
                                                    />
                                                </div>
                                                <SectionEditModal
                                                    binding={contactBinding}
                                                    title="Contact"
                                                    editor={(b) => (
                                                        <ContactEditor
                                                            value={b.draft.contact}
                                                            onChange={(patch) =>
                                                                b.patch((prev) => ({
                                                                    ...prev,
                                                                    contact: {
                                                                        ...prev.contact,
                                                                        ...patch,
                                                                    },
                                                                }))
                                                            }
                                                            disabled={b.saving}
                                                        />
                                                    )}
                                                />
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
                                    );
                                })()}

                                {/* Venue Contact — NEW first-class host (design HIGH-3).
                            Reads TOP-LEVEL venue_contact_* columns (gotcha #40), NOT
                            the stale nested permit fields. Renders when editable, or
                            when there is a venue contact to show. */}
                                {(canEditOrder ||
                                    order.venue_contact_name ||
                                    order.venue_contact_email ||
                                    order.venue_contact_phone) &&
                                    (() => {
                                        const venueContactBinding = orderEditController.bind(
                                            "venueContact",
                                            canEditOrder
                                        );
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.55 }}
                                            >
                                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                                    <div className="flex items-center justify-between gap-2 mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-primary" />
                                                            <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                                                Venue Contact
                                                            </h4>
                                                        </div>
                                                        <EditAffordance
                                                            binding={venueContactBinding}
                                                            variant="client"
                                                            mode="modal"
                                                        />
                                                    </div>
                                                    <SectionEditModal
                                                        binding={venueContactBinding}
                                                        title="Venue Contact"
                                                        editor={(b) => (
                                                            <VenueContactEditor
                                                                value={b.draft.venueContact}
                                                                onChange={(patch) =>
                                                                    b.patch((prev) => ({
                                                                        ...prev,
                                                                        venueContact: {
                                                                            ...prev.venueContact,
                                                                            ...patch,
                                                                        },
                                                                    }))
                                                                }
                                                                disabled={b.saving}
                                                            />
                                                        )}
                                                    />
                                                    <div className="space-y-2 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                                Name
                                                            </p>
                                                            <p className="font-mono font-semibold">
                                                                {order.venue_contact_name || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                                Email
                                                            </p>
                                                            <p className="font-mono font-semibold text-xs">
                                                                {order.venue_contact_email || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                                Phone
                                                            </p>
                                                            <p className="font-mono font-semibold">
                                                                {order.venue_contact_phone || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })()}

                                {/* Special Instructions — read-only mirror. Editing now
                            lives in the Venue & Logistics modal (DescriptiveFieldsEditor
                            exposes it), so this read card shows whenever there's content,
                            editable or not — the modal is the single edit surface. */}
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
                    </EditableEntityProvider>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mt-8 flex gap-3"
                    >
                        <Button
                            variant="outline"
                            onClick={() => router.push(ordersBackHref)}
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
