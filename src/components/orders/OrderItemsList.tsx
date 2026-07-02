"use client";

/**
 * Order Items List Component
 * Displays the list of order items with dimensions, totals, and reskin status
 */

import { useState } from "react";
import { Package, Paintbrush, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { catalogueThumbUrl } from "@/lib/utils/catalogue-image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Condition } from "@/types";
import type { AssetImage } from "@/types/asset";
import {
    useCancelMaintenanceDecisionChangeRequest,
    useCreateMaintenanceDecisionChangeRequest,
} from "@/hooks/use-client-orders";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface ReskinList {
    id: string;
    platform_id: string;
    order_id: string;
    order_item_id: string;
    original_asset_id: string;
    original_asset_name: string;
    target_brand_id: string;
    target_brand_custom: string | null;
    client_notes: string;
    admin_notes: string | null;
    new_asset_id: string | null;
    new_asset_name: string | null;
    completed_at: string | null;
    completed_by: string | null;
    completion_notes: string | null;
    completion_photos: string[];
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
}

interface OrderItem {
    id: string;
    order_item: {
        id: string;
        asset_id: string;
        asset_name: string;
        quantity: number;
        weight_per_unit: number;
        volume_per_unit: number;
        total_volume: number;
        total_weight: number;
        maintenance_decision?: "FIX_IN_ORDER" | "USE_AS_IS" | null;
        maintenance_decision_label?: string | null;
        accepted_current_condition?: boolean;
        repair_status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | null;
        repair_status_label?: string | null;
        maintenance_decision_change_request?: {
            id: string;
            requested_decision_label?: string | null;
            status: string;
            rejection_reason?: string | null;
        } | null;
    };
    asset?: {
        condition: Condition;
        condition_notes?: string | null;
        id: string;
        name: string;
        refurbishment_days_estimate: number | null;
        images?: AssetImage[];
    };
}

interface CalculatedTotals {
    volume?: number;
    weight?: number;
}

interface OrderItemsListProps {
    items: OrderItem[];
    orderStatus: string;
    orderId?: string;
    reskinList?: ReskinList[];
    calculatedTotals?: CalculatedTotals;
}

type ReskinStatus = "pending" | "completed" | "cancelled" | "none";

function getReskinStatus(
    item: OrderItem,
    reskinList?: ReskinList[]
): { status: ReskinStatus; reskin?: ReskinList } {
    // Match by order_item_id since the asset_id changes after reskin completion
    const reskin = reskinList?.find((r) => r.order_item_id === item.order_item.id);

    if (!reskin) {
        return { status: "none" };
    }

    if (reskin.cancelled_at) {
        return { status: "cancelled", reskin };
    }

    if (reskin.completed_at) {
        return { status: "completed", reskin };
    }

    return { status: "pending", reskin };
}

function getReskinStyles(status: ReskinStatus): {
    containerClass: string;
    badgeClass: string;
    badgeText: string;
} {
    switch (status) {
        case "pending":
            return {
                containerClass: "bg-primary/10 border-primary/50 hover:border-primary",
                badgeClass: "bg-primary/20 text-primary border-primary/30",
                badgeText: "Reskin Pending",
            };
        case "completed":
            return {
                containerClass: "bg-green-500/10 border-green-500/50 hover:border-green-500",
                badgeClass: "bg-green-500/20 text-green-600 border-green-500/30",
                badgeText: "Reskin Complete",
            };
        case "cancelled":
            return {
                containerClass: "bg-destructive/10 border-destructive/50 hover:border-destructive",
                badgeClass: "bg-destructive/20 text-destructive border-destructive/30",
                badgeText: "Reskin Cancelled",
            };
        default:
            return {
                containerClass: "bg-background/50 border-border/40 hover:border-primary/20",
                badgeClass: "",
                badgeText: "",
            };
    }
}

export function OrderItemsList({
    items,
    orderStatus,
    orderId,
    reskinList,
    calculatedTotals,
}: OrderItemsListProps) {
    return (
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
            <div className="flex items-center gap-2 mb-6">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">Items</h3>
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                    {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <OrderItemCard
                        key={
                            item.id || item.order_item.id || `${item.order_item.asset_id}-${index}`
                        }
                        orderStatus={orderStatus}
                        orderId={orderId}
                        item={item}
                        reskinList={reskinList}
                        index={index}
                    />
                ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">
                        Total Volume
                    </p>
                    <p className="text-xl font-bold font-mono text-primary">
                        {Number(calculatedTotals?.volume || 0).toFixed(2)} m³
                    </p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">
                        Total Weight
                    </p>
                    <p className="text-xl font-bold font-mono">
                        {Number(calculatedTotals?.weight || 0).toFixed(1)} kg
                    </p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">
                        Items
                    </p>
                    <p className="text-xl font-bold font-mono">{items.length}</p>
                </div>
            </div>
        </Card>
    );
}

const OrderItemCard = ({
    item,
    orderStatus,
    orderId,
    reskinList,
    index,
}: {
    item: OrderItem;
    orderStatus: string;
    orderId?: string;
    reskinList?: ReskinList[];
    index: number;
}) => {
    const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
    const [requestedDecision, setRequestedDecision] = useState<"FIX_IN_ORDER" | "USE_AS_IS" | null>(
        null
    );
    const createDecisionRequest = useCreateMaintenanceDecisionChangeRequest();
    const cancelDecisionRequest = useCancelMaintenanceDecisionChangeRequest();
    const { status, reskin } = getReskinStatus(item, reskinList);
    const styles = getReskinStyles(status);

    const statusForReskin = ["PRICING_REVIEW", "PENDING_APPROVAL", "QUOTED", "CONFIRMED"];
    const currentDecision = item.order_item.maintenance_decision;
    const activeDecisionRequest = item.order_item.maintenance_decision_change_request;
    const pendingDecisionRequest = activeDecisionRequest?.status === "PENDING";
    const canRequestDecisionChange =
        !!orderId &&
        item.asset?.condition === "ORANGE" &&
        ["SUBMITTED", "PRICING_REVIEW", "PENDING_APPROVAL", "QUOTED"].includes(orderStatus) &&
        (currentDecision === "FIX_IN_ORDER" || currentDecision === "USE_AS_IS") &&
        !pendingDecisionRequest;
    const alternateDecision =
        currentDecision === "FIX_IN_ORDER"
            ? ("USE_AS_IS" as const)
            : currentDecision === "USE_AS_IS"
              ? ("FIX_IN_ORDER" as const)
              : null;
    const alternateDecisionLabel =
        alternateDecision === "FIX_IN_ORDER"
            ? "Repair before event"
            : alternateDecision === "USE_AS_IS"
              ? "Accept current condition"
              : "";

    const handleOpenDecisionRequest = () => {
        if (!alternateDecision) return;
        setRequestedDecision(alternateDecision);
        setDecisionDialogOpen(true);
    };

    const handleCreateDecisionRequest = async () => {
        if (!orderId || !requestedDecision) return;
        try {
            await createDecisionRequest.mutateAsync({
                orderId,
                orderItemId: item.order_item.id,
                requestedDecision,
            });
            toast.success("Decision change request sent");
            setDecisionDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to request decision change");
        }
    };

    const handleCancelDecisionRequest = async () => {
        if (!orderId || !activeDecisionRequest?.id) return;
        try {
            await cancelDecisionRequest.mutateAsync({
                orderId,
                requestId: activeDecisionRequest.id,
            });
            toast.success("Decision change request cancelled");
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel request");
        }
    };

    // Catalogue thumbnail only — never leak SCAN/return imagery to the client.
    const thumbUrl = catalogueThumbUrl(item.asset?.images);

    return (
        <>
            <div
                className={`p-4 border rounded-lg transition-colors hover:border-primary/50 ${styles.containerClass}`}
            >
                <div className="flex items-start gap-4">
                    <div className="text-xl font-bold font-mono text-muted-foreground w-8 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                    </div>
                    {/* Thumbnail — catalogue photo only; never leak SCAN/return imagery */}
                    {thumbUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                            <Image
                                src={thumbUrl}
                                alt={item.order_item.asset_name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Link
                                href={`/catalog/assets/${item.asset.id}`}
                                className="font-semibold hover:underline"
                            >
                                {item.order_item.asset_name}
                            </Link>
                            {status !== "none" && statusForReskin.includes(orderStatus) && (
                                <Badge
                                    className={`font-mono text-[10px] gap-1 ${styles.badgeClass}`}
                                >
                                    {status === "pending" && <Paintbrush className="w-3 h-3" />}
                                    {status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                                    {status === "cancelled" && <XCircle className="w-3 h-3" />}
                                    {styles.badgeText}
                                </Badge>
                            )}
                        </div>

                        {/* Cancellation reason */}
                        {status === "cancelled" && reskin?.cancellation_reason && (
                            <div className="mb-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs text-destructive">
                                <span className="font-semibold">Reason:</span>{" "}
                                {reskin.cancellation_reason}
                            </div>
                        )}

                        {/* Compact dimensions */}
                        {/* <div className="grid grid-cols-5 gap-2 mb-2">
            {item.asset?.dimension_length && (
              <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">
                  L
                </div>
                <div className="text-xs font-bold font-mono">
                  {Number(
                    item.asset.dimension_length
                  ).toFixed(0)}
                </div>
                <div className="text-[8px] text-muted-foreground">
                  cm
                </div>
              </div>
            )}
            {item.asset?.dimension_width && (
              <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">
                  W
                </div>
                <div className="text-xs font-bold font-mono">
                  {Number(
                    item.asset.dimension_width
                  ).toFixed(0)}
                </div>
                <div className="text-[8px] text-muted-foreground">
                  cm
                </div>
              </div>
            )}
            {item.asset?.dimension_height && (
              <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">
                  H
                </div>
                <div className="text-xs font-bold font-mono">
                  {Number(
                    item.asset.dimension_height
                  ).toFixed(0)}
                </div>
                <div className="text-[8px] text-muted-foreground">
                  cm
                </div>
              </div>
            )}
            <div className="text-center p-1.5 bg-primary/10 rounded border border-primary/20">
              <div className="text-[9px] text-muted-foreground font-mono uppercase">
                WT
              </div>
              <div className="text-xs font-bold font-mono text-primary">
                {Number(
                  item.order_item.weight_per_unit || 0
                ).toFixed(1)}
              </div>
              <div className="text-[8px] text-primary/70">
                kg
              </div>
            </div>
            <div className="text-center p-1.5 bg-secondary/10 rounded border border-secondary/20">
              <div className="text-[9px] text-muted-foreground font-mono uppercase">
                VOL
              </div>
              <div className="text-xs font-bold font-mono">
                {Number(
                  item.order_item.volume_per_unit || 0
                ).toFixed(2)}
              </div>
              <div className="text-[8px] text-muted-foreground/70">
                m³
              </div>
            </div>
          </div> */}

                        {/* Quantity line */}
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                            <span>
                                Qty:{" "}
                                <span className="font-bold text-foreground">
                                    {item.order_item.quantity}
                                </span>
                            </span>
                            <span>•</span>
                            <span>
                                Total:{" "}
                                <span className="font-bold">
                                    {Number(item.order_item.total_volume).toFixed(2)} m³
                                </span>
                            </span>
                            <span>•</span>
                            <span>
                                <span className="font-bold text-primary">
                                    {Number(item.order_item.total_weight).toFixed(1)} kg
                                </span>
                            </span>
                        </div>

                        {/* Condition section */}
                        {item.asset &&
                            (item.asset.condition !== "GREEN" ||
                                item.order_item.maintenance_decision) && (
                                <div
                                    className={`mt-2 rounded-lg p-3 border ${
                                        item.asset.condition === "RED"
                                            ? "bg-destructive/10 border-destructive/30"
                                            : item.asset.condition === "ORANGE"
                                              ? "bg-orange-500/10 border-orange-500/30"
                                              : "bg-orange-500/10 border-orange-500/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {item.asset.condition !== "GREEN" && (
                                            <Badge
                                                className={`font-mono text-xs ${
                                                    item.asset.condition === "RED"
                                                        ? "bg-destructive"
                                                        : "bg-orange-500"
                                                }`}
                                            >
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                {item.asset.condition === "RED" ? "RED" : "ORANGE"}
                                            </Badge>
                                        )}
                                        {item.asset.refurbishment_days_estimate && (
                                            <span className="text-xs font-mono text-muted-foreground">
                                                Est. {item.asset.refurbishment_days_estimate} days
                                                refurb
                                            </span>
                                        )}
                                        {item.order_item.maintenance_decision_label && (
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {item.order_item.maintenance_decision_label}
                                            </Badge>
                                        )}
                                        {item.order_item.repair_status_label && (
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-xs"
                                            >
                                                Repair {item.order_item.repair_status_label}
                                            </Badge>
                                        )}
                                    </div>
                                    {item.asset.condition_notes && (
                                        <p className="text-xs text-muted-foreground">
                                            {item.asset.condition_notes}
                                        </p>
                                    )}
                                    {item.order_item.maintenance_decision_change_request && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                Request{" "}
                                                {item.order_item.maintenance_decision_change_request.status.replace(
                                                    /_/g,
                                                    " "
                                                )}
                                            </Badge>
                                            {item.order_item.maintenance_decision_change_request
                                                .requested_decision_label && (
                                                <span className="text-xs text-muted-foreground">
                                                    Requested:{" "}
                                                    {
                                                        item.order_item
                                                            .maintenance_decision_change_request
                                                            .requested_decision_label
                                                    }
                                                </span>
                                            )}
                                            {pendingDecisionRequest && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-xs"
                                                    disabled={cancelDecisionRequest.isPending}
                                                    onClick={handleCancelDecisionRequest}
                                                >
                                                    Cancel request
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {canRequestDecisionChange && alternateDecision && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 h-8 text-xs"
                                            onClick={handleOpenDecisionRequest}
                                        >
                                            Request {alternateDecisionLabel}
                                        </Button>
                                    )}
                                    {activeDecisionRequest?.status === "REJECTED" &&
                                        activeDecisionRequest.rejection_reason && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Rejection reason:{" "}
                                                {activeDecisionRequest.rejection_reason}
                                            </p>
                                        )}
                                </div>
                            )}
                    </div>
                </div>
            </div>
            <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Decision Change</DialogTitle>
                        <DialogDescription>
                            This sends an internal review request. Your current order decision stays
                            active until the request is approved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">{item.order_item.asset_name}</p>
                        <p className="mt-1 text-muted-foreground">
                            Requested decision: {alternateDecisionLabel}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDecisionDialogOpen(false)}
                            disabled={createDecisionRequest.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateDecisionRequest}
                            disabled={createDecisionRequest.isPending || !requestedDecision}
                        >
                            {createDecisionRequest.isPending ? "Sending..." : "Send request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
