"use client";

/**
 * Order item editor (order-editing P3b quantity + P3c add/remove "swap"). Lists
 * each physical order item with a quantity stepper (min 1, integers only) and a
 * remove control, plus an "Add item" affordance that opens the unified
 * ClientAssetPicker (rich catalog-style cards, multi-select + qty, and the ORANGE
 * maintenance decision in-flow) to stage new assets. Controlled by the parent
 * OrderEditPanel, which owns the draft state and diffs it against the baseline.
 *
 * The parent translates the draft into the item-ops array:
 *   - existing item with changed quantity → { order_item_id, quantity }   (UPDATE)
 *   - existing item marked pending-removal → { op:"REMOVE", order_item_id }
 *   - staged add → { op:"ADD", asset_id, quantity, maintenance_decision? }
 * A removed row never also emits an UPDATE. On save the server reconciles asset
 * bookings (availability-checked: a shortfall returns 409 with a message
 * mentioning availability), rejects RED assets on ADD (the picker blocks RED up
 * front), honors the per-ORANGE maintenance_decision (FIX_IN_ORDER / USE_AS_IS),
 * merges duplicate assets, and blocks removing the LAST item. A change on a
 * QUOTED order bounces it to PRICING_REVIEW + QUOTE_REVISED. The server is
 * authoritative; this editor performs no optimistic update.
 */

import { useState } from "react";
import { Trash2, RotateCcw, PackagePlus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ClientAssetPicker,
    type MaintenanceDecision,
    type NamedAssetSelection,
} from "@/components/assets/asset-picker";
// Shared, bounded quantity stepper (the EXACT control used inside the asset
// picker cards). Bounding it by availableQuantity keeps the order-edit rows
// 1:1 with the picker so the two surfaces never diverge.
import {
    QtyStepper,
    clampQty as clampQtyBounded,
} from "@/components/assets/asset-picker/QtyStepper";

// One editable EXISTING row. `id` is the order_item UUID (item.order_item.id on
// the order detail response); `name` is the asset name.
export interface QuantityEditorItem {
    id: string;
    name: string;
}

// Draft is a map of order_item_id → quantity (positive integer).
export type ItemQuantitiesDraft = Record<string, number>;

// A staged ADD — a new asset chosen from the picker (not yet on the order).
// `maintenance_decision` is carried for ORANGE adds (FIX_IN_ORDER / USE_AS_IS),
// chosen in the picker and sent on the ADD op so the server honors it.
export interface StagedAdd {
    asset_id: string;
    name: string;
    quantity: number;
    maintenance_decision?: MaintenanceDecision;
}

export function OrderItemsQuantityEditor({
    items,
    value,
    onChange,
    removedIds,
    onToggleRemove,
    stagedAdds,
    onAddAssets,
    onChangeAddQty,
    onRemoveAdd,
    maxByItemId,
    maxByAssetId,
    disabled,
}: {
    items: QuantityEditorItem[];
    value: ItemQuantitiesDraft;
    onChange: (patch: ItemQuantitiesDraft) => void;
    // Set of order_item_ids marked for removal.
    removedIds: Set<string>;
    onToggleRemove: (id: string) => void;
    // Staged ADDs, keyed by asset_id (parent owns the array).
    stagedAdds: StagedAdd[];
    // Confirm a batch of picker selections — parent merges/dedupes into stagedAdds.
    onAddAssets: (adds: StagedAdd[]) => void;
    onChangeAddQty: (assetId: string, quantity: number) => void;
    onRemoveAdd: (assetId: string) => void;
    // Per-EXISTING-row upper bound, keyed by order_item_id. For an already-booked
    // row this is (live available_quantity + this row's own booked qty), so a
    // decrease / no-op is never falsely blocked. Missing entry = unbounded.
    maxByItemId?: Record<string, number>;
    // Per-STAGED-ADD upper bound, keyed by asset_id (the picker's
    // availableQuantity for the edited window). Missing entry = unbounded.
    maxByAssetId?: Record<string, number>;
    disabled?: boolean;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const setQty = (id: string, next: number) => {
        onChange({ [id]: clampQtyBounded(next, maxByItemId?.[id] ?? 0) });
    };

    // How many existing items remain (not pending-removal). With no staged adds,
    // the last remaining existing item can't be removed (server also blocks it).
    const remainingExisting = items.filter((it) => !removedIds.has(it.id)).length;
    // Mark assets already staged as "already added" in the picker so a second
    // selection of the same asset is blocked (the parent merges duplicates anyway).
    const stagedIds = stagedAdds.map((a) => a.asset_id);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Adjust quantities, remove items, or add new ones. Saving re-checks asset
                availability for your event window — if stock isn&apos;t available we&apos;ll let
                you know when you save.
            </p>

            {items.length === 0 && stagedAdds.length === 0 && (
                <p className="text-xs text-muted-foreground">This order has no editable items.</p>
            )}

            <div className="space-y-2">
                {items.map((item) => {
                    const qty = value[item.id] ?? 1;
                    const isRemoved = removedIds.has(item.id);
                    const max = maxByItemId?.[item.id] ?? 0;
                    // Inline feedback only — the server is authoritative and 409s on
                    // a real shortfall. `max <= 0` means "unbounded / unknown" so we
                    // never flag in that mode.
                    const exceeds = !isRemoved && max > 0 && qty > max;
                    // Block removing the last item left, unless a new one is being
                    // added in the same edit (then the order won't be empty).
                    const blockRemove =
                        !isRemoved && remainingExisting <= 1 && stagedAdds.length === 0;
                    return (
                        <div
                            key={item.id}
                            className={`rounded-lg border p-3 transition-colors ${
                                isRemoved
                                    ? "border-destructive/40 bg-destructive/5"
                                    : exceeds
                                      ? "border-amber-500/40 bg-amber-500/5"
                                      : "border-border/40 bg-background/50"
                            }`}
                            data-testid="order-edit-item-row"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <span
                                    className={`min-w-0 flex-1 truncate text-sm font-medium ${
                                        isRemoved ? "text-muted-foreground line-through" : ""
                                    }`}
                                >
                                    {item.name}
                                    {isRemoved && (
                                        <Badge
                                            variant="outline"
                                            className="ml-2 border-destructive/40 text-[10px] text-destructive"
                                        >
                                            Removing
                                        </Badge>
                                    )}
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                    {!isRemoved && (
                                        <QtyStepper
                                            qty={qty}
                                            max={max}
                                            name={item.name}
                                            disabled={disabled}
                                            onChange={(next) => setQty(item.id, next)}
                                        />
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onToggleRemove(item.id)}
                                        disabled={disabled || blockRemove}
                                        title={
                                            blockRemove
                                                ? "An order must keep at least one item"
                                                : isRemoved
                                                  ? "Keep this item"
                                                  : "Remove this item"
                                        }
                                        aria-label={
                                            isRemoved ? `Keep ${item.name}` : `Remove ${item.name}`
                                        }
                                        className="h-8 w-8 p-0"
                                        data-testid="order-edit-item-remove"
                                    >
                                        {isRemoved ? (
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {exceeds && (
                                <p
                                    className="mt-2 text-xs font-medium text-amber-700"
                                    data-testid="order-edit-item-exceeds"
                                >
                                    Exceeds available ({max}). We&apos;ll re-check stock when you
                                    save.
                                </p>
                            )}
                        </div>
                    );
                })}

                {/* Staged adds — new assets not yet on the order. */}
                {stagedAdds.map((add) => {
                    const addMax = maxByAssetId?.[add.asset_id] ?? 0;
                    const addExceeds = addMax > 0 && add.quantity > addMax;
                    return (
                        <div
                            key={add.asset_id}
                            className={`rounded-lg border p-3 ${
                                addExceeds
                                    ? "border-amber-500/40 bg-amber-500/5"
                                    : "border-primary/40 bg-primary/5"
                            }`}
                            data-testid="order-edit-add-row"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {add.name}
                                    <Badge
                                        variant="outline"
                                        className="ml-2 border-primary/40 text-[10px] text-primary"
                                    >
                                        New
                                    </Badge>
                                    {add.maintenance_decision === "FIX_IN_ORDER" && (
                                        <Badge
                                            variant="outline"
                                            className="ml-2 gap-1 border-amber-300 text-[10px] text-amber-700"
                                        >
                                            <Wrench className="h-2.5 w-2.5" />
                                            Fix before event
                                        </Badge>
                                    )}
                                    {add.maintenance_decision === "USE_AS_IS" && (
                                        <Badge
                                            variant="outline"
                                            className="ml-2 border-amber-300 text-[10px] text-amber-700"
                                        >
                                            Use as-is
                                        </Badge>
                                    )}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <QtyStepper
                                        qty={add.quantity}
                                        max={addMax}
                                        name={add.name}
                                        disabled={disabled}
                                        onChange={(next) =>
                                            onChangeAddQty(
                                                add.asset_id,
                                                clampQtyBounded(next, addMax)
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemoveAdd(add.asset_id)}
                                        disabled={disabled}
                                        aria-label={`Remove staged ${add.name}`}
                                        title="Don't add this item"
                                        className="h-8 w-8 p-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                            {addExceeds && (
                                <p
                                    className="mt-2 text-xs font-medium text-amber-700"
                                    data-testid="order-edit-add-exceeds"
                                >
                                    Exceeds available ({addMax}). We&apos;ll re-check stock when you
                                    save.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 font-mono"
                        disabled={disabled}
                        data-testid="order-edit-add-open"
                    >
                        <PackagePlus className="h-4 w-4" />
                        Add item
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b border-border px-6 py-4">
                        <DialogTitle className="font-mono text-sm uppercase tracking-wide">
                            Add an item to your order
                        </DialogTitle>
                        <DialogDescription>
                            Search your catalog and add assets. Availability is re-checked when you
                            save your changes. Items needing repair require a maintenance decision.
                        </DialogDescription>
                    </DialogHeader>
                    <ClientAssetPicker
                        alreadyOnEntity={stagedIds}
                        conditionDecision="require"
                        entityNoun="order"
                        onConfirm={(selections: NamedAssetSelection[]) => {
                            onAddAssets(
                                selections.map((s) => ({
                                    asset_id: s.assetId,
                                    name: s.name,
                                    quantity: s.quantity,
                                    ...(s.maintenanceDecision
                                        ? { maintenance_decision: s.maintenanceDecision }
                                        : {}),
                                }))
                            );
                            setPickerOpen(false);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
