"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    useClientSelfPickupDetail,
    useClientApproveSelfPickupQuote,
    useClientDeclineSelfPickupQuote,
    useTriggerSelfPickupReturn,
} from "@/hooks/use-self-pickups";
import { usePlatform } from "@/contexts/platform-context";
import { ClientNav } from "@/components/client-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Clock,
    Package,
    Cuboid,
    Calendar,
    CheckCircle2,
    XCircle,
    DollarSign,
    PackageCheck,
    Truck,
    Archive,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { SelfPickupQuoteReviewSection } from "@/components/self-pickups/QuoteReviewSection";
import { SelfPickupStatusBanner } from "@/components/self-pickups/SelfPickupStatusBanner";
import { StartReturnDialog } from "@/components/self-pickups/StartReturnDialog";

const PICKUP_STATUS_CONFIG: Record<
    string,
    {
        label: string;
        color: string;
        hero: string;
        subtitle: string;
        bg: string;
        icon: React.ComponentType<{ className?: string }>;
    }
> = {
    SUBMITTED: {
        label: "Submitted",
        color: "bg-blue-100 text-blue-700 border-blue-300",
        hero: "Pickup Submitted",
        subtitle: "Thank you for your pickup request. Our team is reviewing the details.",
        bg: "bg-primary",
        icon: CheckCircle2,
    },
    PRICING_REVIEW: {
        label: "In Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        hero: "Under Review",
        subtitle: "Our team is calculating pricing based on your pickup details.",
        bg: "bg-primary",
        icon: Clock,
    },
    PENDING_APPROVAL: {
        label: "Pending",
        color: "bg-orange-100 text-orange-700 border-orange-300",
        hero: "Pricing Under Review",
        subtitle: "Management is finalizing your quote. You'll receive it shortly.",
        bg: "bg-orange-500",
        icon: Clock,
    },
    QUOTED: {
        label: "Quote Ready",
        color: "bg-indigo-100 text-indigo-700 border-indigo-300",
        hero: "Your Quote is Ready",
        subtitle: "Review the pricing below and approve or decline.",
        bg: "bg-amber-500",
        icon: DollarSign,
    },
    DECLINED: {
        label: "Declined",
        color: "bg-red-100 text-red-700 border-red-300",
        hero: "Quote Declined",
        subtitle: "You declined this quote. Our team may reach out with alternatives.",
        bg: "bg-destructive",
        icon: XCircle,
    },
    CONFIRMED: {
        label: "Confirmed",
        color: "bg-green-100 text-green-700 border-green-300",
        hero: "Pickup Confirmed",
        subtitle: "Your items are being prepared for collection during your pickup window.",
        bg: "bg-green-500",
        icon: CheckCircle2,
    },
    READY_FOR_PICKUP: {
        label: "Ready for Collection",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
        hero: "Items Ready for Collection",
        subtitle:
            "Your items are ready at our warehouse. Please collect during your pickup window.",
        bg: "bg-emerald-500",
        icon: PackageCheck,
    },
    PICKED_UP: {
        label: "Collected",
        color: "bg-teal-100 text-teal-700 border-teal-300",
        hero: "Items Collected",
        subtitle: "Items have been collected. Please return them by the expected date.",
        bg: "bg-teal-500",
        icon: Package,
    },
    AWAITING_RETURN: {
        label: "Return Pending",
        color: "bg-amber-100 text-amber-700 border-amber-300",
        hero: "Awaiting Return",
        subtitle: "We're expecting your return. Please contact our team if you need more time.",
        bg: "bg-amber-500",
        icon: Truck,
    },
    CLOSED: {
        label: "Closed",
        color: "bg-gray-100 text-gray-700 border-gray-300",
        hero: "Pickup Complete",
        subtitle: "Thank you! Return scan complete and your pickup is fully closed.",
        bg: "bg-green-500",
        icon: Archive,
    },
    CANCELLED: {
        label: "Cancelled",
        color: "bg-red-50 text-red-600 border-red-200",
        hero: "Pickup Cancelled",
        subtitle: "This pickup was cancelled.",
        bg: "bg-destructive",
        icon: XCircle,
    },
};

export default function ClientSelfPickupDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            toast.error("Self-pickup is not enabled for this platform.");
            router.replace("/catalog");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const { data: pickupData, isLoading } = useClientSelfPickupDetail(id);
    const approveQuote = useClientApproveSelfPickupQuote();
    const declineQuote = useClientDeclineSelfPickupQuote();
    const triggerReturn = useTriggerSelfPickupReturn();

    const [returnDialogOpen, setReturnDialogOpen] = useState(false);

    const pickup = pickupData?.data;

    if (platformLoading || !selfPickupEnabled) return null;

    if (isLoading) {
        return (
            <ClientNav>
                <div className="mx-auto max-w-7xl px-4 sm:px-8 py-12 space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </ClientNav>
        );
    }

    if (!pickup) {
        return (
            <ClientNav>
                <div className="text-center py-16 text-muted-foreground">Self-pickup not found</div>
            </ClientNav>
        );
    }

    const statusConfig = PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
        label: pickup.self_pickup_status,
        color: "bg-gray-100 text-gray-700 border-gray-300",
        hero: pickup.self_pickup_status,
        subtitle: "",
        bg: "bg-primary",
        icon: Package,
    };
    const HeroIcon = statusConfig.icon;

    const pickupWindow = pickup.pickup_window as { start?: string; end?: string } | undefined;
    const items = pickup.items || [];
    const lineItems = pickup.line_items || [];
    const pricing = pickup.self_pickup_pricing || null;
    const isQuoted = pickup.self_pickup_status === "QUOTED";
    const isNoCost = pickup.pricing_mode === "NO_COST";
    const isNoCostConfirmed = isNoCost && pickup.self_pickup_status === "CONFIRMED";
    const statusHistory: any[] = pickup.self_pickup_status_history || [];

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/10 to-background relative">
                {/* Subtle grid pattern — matches order detail backdrop */}
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

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground mb-6 sm:mb-8 font-mono"
                    >
                        <Link
                            href="/self-pickups"
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            My Pickups
                        </Link>
                        <span>/</span>
                        <span className="text-foreground truncate">{pickup.self_pickup_id}</span>
                    </motion.div>

                    {/* Status Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6"
                    >
                        <Card className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <Badge
                                            className={`font-mono text-xs border ${statusConfig.color}`}
                                        >
                                            {statusConfig.label.toUpperCase()}
                                        </Badge>
                                        {isNoCost && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-neutral-500/10 text-neutral-700 border-neutral-400/60 font-mono text-xs"
                                            >
                                                NO COST
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Submitted{" "}
                                            {pickup.created_at
                                                ? new Date(pickup.created_at).toLocaleDateString()
                                                : "—"}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                                        {isNoCostConfirmed
                                            ? "Pickup Approved — No Cost"
                                            : statusConfig.hero}
                                    </h1>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {isNoCostConfirmed
                                            ? "Your pickup has been approved at no cost. Items will be ready for collection during your pickup window."
                                            : statusConfig.subtitle}
                                    </p>
                                </div>
                                <div
                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shrink-0 ${statusConfig.bg}`}
                                >
                                    <HeroIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Pickup ID Card */}
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
                                        Pickup ID
                                    </p>
                                    <p className="text-xl sm:text-2xl font-bold font-mono tracking-wider">
                                        {pickup.self_pickup_id}
                                    </p>
                                    {pickup.po_number && (
                                        <p className="mt-2 text-sm font-mono text-muted-foreground">
                                            PO: {pickup.po_number}
                                        </p>
                                    )}
                                </div>
                                <Cuboid className="h-10 w-10 sm:h-12 sm:w-12 text-primary/20" />
                            </div>
                        </Card>
                    </motion.div>

                    {/* Status banner — supplementary contextual messaging */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="mb-6"
                    >
                        <SelfPickupStatusBanner pickup={pickup} />
                    </motion.div>

                    {/* Two-column grid: main content + sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* MAIN content (left, 2 cols) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quote Review — QUOTED only, and never when NO_COST */}
                            {isQuoted && !isNoCost && pricing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <SelfPickupQuoteReviewSection
                                        pickup={pickup}
                                        pricing={pricing}
                                        lineItems={lineItems}
                                        onApprove={async (poNumber: string) => {
                                            await approveQuote.mutateAsync({
                                                id: pickup.id,
                                                po_number: poNumber,
                                            });
                                        }}
                                        onDecline={async (reason: string) => {
                                            await declineQuote.mutateAsync({
                                                id: pickup.id,
                                                decline_reason: reason,
                                            });
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Status Timeline */}
                            {statusHistory.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Clock className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                Pickup Timeline
                                            </h3>
                                        </div>
                                        <div className="space-y-1 relative">
                                            {(() => {
                                                const sorted = [...statusHistory].sort(
                                                    (a, b) =>
                                                        new Date(b.timestamp).getTime() -
                                                        new Date(a.timestamp).getTime()
                                                );
                                                const activeIndex = Math.max(
                                                    0,
                                                    sorted.findIndex(
                                                        (e) =>
                                                            e.status === pickup.self_pickup_status
                                                    )
                                                );
                                                return sorted.map((entry, index) => {
                                                    const isFirst = index === activeIndex;
                                                    const ts = new Date(entry.timestamp);
                                                    const label = (
                                                        entry.status_label || entry.status
                                                    ).replace(/_/g, " ");
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
                                                                {index < sorted.length - 1 && (
                                                                    <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 pb-2">
                                                                <p
                                                                    className={`text-sm font-semibold font-mono ${
                                                                        isFirst
                                                                            ? "text-primary"
                                                                            : "text-muted-foreground"
                                                                    }`}
                                                                >
                                                                    {label}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {ts.toLocaleDateString()}{" "}
                                                                    {ts.toLocaleTimeString([], {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Items */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2 font-mono uppercase tracking-wide">
                                            <Package className="h-5 w-5 text-primary" />
                                            Items ({items.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {items.map((item: any, idx: number) => {
                                                const firstImg =
                                                    (Array.isArray(item.asset?.images) &&
                                                        item.asset.images[0]?.url) ||
                                                    (Array.isArray(item.images) &&
                                                        item.images[0]?.url) ||
                                                    null;
                                                const scanned = item.scanned_quantity;
                                                const hasScannedQty =
                                                    scanned !== null && scanned !== undefined;
                                                const isSkipped = item.skipped === true;
                                                const isPartial =
                                                    hasScannedQty &&
                                                    scanned > 0 &&
                                                    scanned < item.quantity;
                                                const isMidflow = item.added_midflow === true;
                                                return (
                                                    <div
                                                        key={item.id || idx}
                                                        className="flex items-center gap-4 p-3 border border-border/40 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                                                    >
                                                        <div className="shrink-0 w-16 h-16 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                                                            {firstImg ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={firstImg}
                                                                    alt={item.asset_name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Package className="h-6 w-6 text-muted-foreground/60" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate flex items-center gap-2">
                                                                <span className="truncate">
                                                                    {item.asset_name}
                                                                </span>
                                                                {isMidflow && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] font-mono shrink-0"
                                                                    >
                                                                        ADDED
                                                                    </Badge>
                                                                )}
                                                                {isSkipped && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] font-mono bg-red-50 border-red-300 text-red-700 shrink-0"
                                                                    >
                                                                        NOT COLLECTED
                                                                    </Badge>
                                                                )}
                                                                {isPartial && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] font-mono bg-amber-50 border-amber-300 text-amber-700 shrink-0"
                                                                    >
                                                                        PARTIAL
                                                                    </Badge>
                                                                )}
                                                            </p>
                                                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-3 mt-1">
                                                                <span>
                                                                    {hasScannedQty ? (
                                                                        <>
                                                                            Ordered{" "}
                                                                            <span className="text-foreground">
                                                                                {item.quantity}
                                                                            </span>{" "}
                                                                            · Collected{" "}
                                                                            <span
                                                                                className={
                                                                                    isSkipped ||
                                                                                    isPartial
                                                                                        ? "text-amber-700 font-semibold"
                                                                                        : "text-foreground"
                                                                                }
                                                                            >
                                                                                {scanned}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Qty:{" "}
                                                                            <span className="text-foreground">
                                                                                {item.quantity}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                                {item.total_volume && (
                                                                    <span>
                                                                        Vol:{" "}
                                                                        <span className="text-foreground">
                                                                            {item.total_volume} m³
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-xs shrink-0"
                                                        >
                                                            {hasScannedQty
                                                                ? `${scanned}/${item.quantity}`
                                                                : `× ${item.quantity}`}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Notes */}
                            {pickup.notes && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45 }}
                                >
                                    <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2 font-mono uppercase tracking-wide">
                                                <FileText className="h-5 w-5 text-primary" />
                                                Notes
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {pickup.notes}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Start Return CTA (PICKED_UP only) */}
                            {pickup.self_pickup_status === "PICKED_UP" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                            <div>
                                                <p className="font-semibold">Ready to return?</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Let us know the items are on their way back.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setReturnDialogOpen(true)}
                                                disabled={triggerReturn.isPending}
                                            >
                                                Start Return
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* What's Next guidance — status-specific copy that
                                tells the client what will happen and what they
                                need to do. Mirrors the orders page pattern
                                (orders/[orderId]/page.tsx:885-1085) but scoped
                                to the NO_COST-reachable statuses. */}
                            <WhatsNextCard
                                status={pickup.self_pickup_status}
                                pickupWindow={pickupWindow}
                                collectorName={pickup.collector_name}
                            />
                        </div>

                        {/* SIDEBAR (right, 1 col) */}
                        <div className="space-y-6">
                            {/* Pickup Window */}
                            {pickupWindow && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                        <CardHeader>
                                            <CardTitle className="text-sm flex items-center gap-2 font-mono uppercase tracking-wide">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                Pickup Window
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Start
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {pickupWindow.start
                                                        ? new Date(
                                                              pickupWindow.start
                                                          ).toLocaleString()
                                                        : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    End
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {pickupWindow.end
                                                        ? new Date(
                                                              pickupWindow.end
                                                          ).toLocaleString()
                                                        : "—"}
                                                </p>
                                            </div>
                                            {pickup.expected_return_at && (
                                                <div className="pt-3 border-t border-border/40">
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Expected Return
                                                    </p>
                                                    <p className="text-sm font-semibold">
                                                        {new Date(
                                                            pickup.expected_return_at
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Collector */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                            >
                                <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2 font-mono uppercase tracking-wide">
                                            <User className="h-4 w-4 text-primary" />
                                            Collector
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm font-semibold">
                                            {pickup.collector_name || "—"}
                                        </p>
                                        {pickup.collector_phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                <span>{pickup.collector_phone}</span>
                                            </div>
                                        )}
                                        {pickup.collector_email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                                <span>{pickup.collector_email}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <StartReturnDialog
                open={returnDialogOpen}
                onOpenChange={setReturnDialogOpen}
                onConfirm={async () => {
                    await triggerReturn.mutateAsync(pickup.id);
                    toast.success("Return initiated");
                }}
            />
        </ClientNav>
    );
}

// Per-status "what happens next" guidance. Mirrors the orders detail
// pattern but scoped to SP lifecycle — only the statuses clients will
// reasonably see (no PENDING_APPROVAL / QUOTED since those are STANDARD-
// mode only and we're polishing NO_COST first).
function WhatsNextCard({
    status,
    pickupWindow,
    collectorName,
}: {
    status: string;
    pickupWindow: { start?: string; end?: string } | undefined;
    collectorName?: string | null;
}) {
    const [title, body] = (() => {
        const windowStr =
            pickupWindow?.start && pickupWindow?.end
                ? `${new Date(pickupWindow.start).toLocaleString()} – ${new Date(pickupWindow.end).toLocaleString()}`
                : "your pickup window";
        switch (status) {
            case "SUBMITTED":
            case "PRICING_REVIEW":
                return [
                    "What happens next",
                    "Our team is reviewing your pickup details. We'll confirm shortly and prepare your items for collection.",
                ];
            case "CONFIRMED":
                return [
                    "What happens next",
                    `Your pickup is confirmed. We're preparing your items for collection during ${windowStr}.`,
                ];
            case "READY_FOR_PICKUP":
                return [
                    "Ready for collection",
                    `${collectorName ? collectorName + ", your" : "Your"} items are ready at our warehouse. Please come during ${windowStr}.`,
                ];
            case "PICKED_UP":
                return [
                    "Items collected",
                    "When you're ready to return the items, click 'Start Return' above so our team can prepare to receive them.",
                ];
            case "AWAITING_RETURN":
                return [
                    "We're expecting your return",
                    "Bring the items to our warehouse during your expected return window. Contact our team if you need more time.",
                ];
            case "CLOSED":
                return [
                    "All done",
                    "Return scan complete and your pickup is fully closed. Thank you — we hope everything went smoothly.",
                ];
            case "CANCELLED":
                return [
                    "Pickup cancelled",
                    "This pickup has been cancelled. If this was unexpected, please contact our team.",
                ];
            case "DECLINED":
                return [
                    "Quote declined",
                    "You declined this quote. Our team may reach out with alternatives.",
                ];
            default:
                return [null, null];
        }
    })();

    if (!title) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
        >
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                <h3 className="text-sm font-mono uppercase tracking-wide text-muted-foreground mb-2">
                    {title}
                </h3>
                <p className="text-sm text-foreground leading-relaxed">{body}</p>
            </Card>
        </motion.div>
    );
}
