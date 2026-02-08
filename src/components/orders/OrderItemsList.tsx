"use client";

/**
 * Order Items List Component
 * Displays the list of order items with dimensions, totals, and reskin status
 */

import { Package, Paintbrush, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Condition } from "@/types";

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
  };
  asset?: {
    condition: Condition;
    id: string;
    name: string;
    refurbishment_days_estimate: number | null;
  };
}

interface CalculatedTotals {
  volume?: number;
  weight?: number;
}

interface OrderItemsListProps {
  items: OrderItem[];
  orderStatus: string;
  reskinList?: ReskinList[];
  calculatedTotals?: CalculatedTotals;
}

type ReskinStatus = "pending" | "completed" | "cancelled" | "none";

function getReskinStatus(item: OrderItem, reskinList?: ReskinList[]): { status: ReskinStatus; reskin?: ReskinList } {
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

function getReskinStyles(status: ReskinStatus): { containerClass: string; badgeClass: string; badgeText: string } {
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
  reskinList,
  calculatedTotals,
}: OrderItemsListProps) {
  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
      <div className="flex items-center gap-2 mb-6">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
          Items
        </h3>
        <Badge
          variant="secondary"
          className="ml-auto font-mono text-xs"
        >
          {items.length} {items.length === 1 ? "item" : "items"}
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <OrderItemCard key={item.id} orderStatus={orderStatus} item={item} reskinList={reskinList} index={index} />
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


const OrderItemCard = ({ item, orderStatus, reskinList, index }: { item: OrderItem, orderStatus: string, reskinList?: ReskinList[], index: number }) => {
  const { status, reskin } = getReskinStatus(item, reskinList);
  const styles = getReskinStyles(status);

  const statusForReskin = [
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "AWAITING_FABRICATION"
  ];

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${styles.containerClass}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-xl font-bold font-mono text-muted-foreground w-8 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="font-semibold">
              {item.order_item.asset_name}
            </div>
            {status !== "none" && statusForReskin.includes(orderStatus) && (
              <Badge className={`font-mono text-[10px] gap-1 ${styles.badgeClass}`}>
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
              <span className="font-semibold">Reason:</span> {reskin.cancellation_reason}
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
                {Number(
                  item.order_item.total_volume
                ).toFixed(2)}{" "}
                m³
              </span>
            </span>
            <span>•</span>
            <span>
              <span className="font-bold text-primary">
                {Number(
                  item.order_item.total_weight
                ).toFixed(1)}{" "}
                kg
              </span>
            </span>
          </div>

          {item.asset.condition !== 'GREEN' && statusForReskin.includes(orderStatus) && (
            <div className="mt-2 flex items-center gap-3 text-xs font-mono bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg p-2">
              <p>This assets is damaged. Estimated refurbishment {item.asset.refurbishment_days_estimate} days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};