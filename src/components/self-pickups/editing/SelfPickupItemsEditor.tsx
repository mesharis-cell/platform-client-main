"use client";

/**
 * Self-pickup item editor (order-editing Phase 4). Mirrors the order
 * OrderItemsQuantityEditor: each existing item gets a quantity stepper (min 1,
 * integers only) + a remove control, plus an "Add item" affordance that opens
 * the unified ClientAssetPicker (rich catalog-style cards, multi-select + qty,
 * ORANGE maintenance decision) to stage new assets. Controlled by the parent
 * SelfPickupEditPanel, which owns draft state and diffs it against the baseline.
 *
 * The parent translates the draft into the item-ops array:
 *   - existing item with changed quantity → { order_item_id, quantity }   (UPDATE)
 *   - existing item marked pending-removal → { op:"REMOVE", order_item_id }
 *   - staged add → { op:"ADD", asset_id, quantity, maintenance_decision? }
 * `order_item_id` is the self_pickup_items row id (item.id on the SP detail). On
 * save the server reconciles asset bookings (availability-checked: a shortfall
 * returns 409 with a message mentioning availability), merges duplicate assets,
 * and blocks removing the LAST item. A change on a QUOTED pickup bounces it to
 * PRICING_REVIEW. SP has no permit but DOES surface ORANGE assets, so an ORANGE
 * add rides a maintenance_decision (RED is blocked in the picker). The server is
 * authoritative; this editor performs no optimistic update.
 */

import { useState } from "react";
import { Minus, Plus, Trash2, RotateCcw, PackagePlus, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
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

// One editable EXISTING row. `id` is the self_pickup_items row id (item.id on the
// SP detail response, sent as `order_item_id`); `name` is the asset name.
export interface SelfPickupEditorItem {
    id: string;
    name: string;
}

// Draft is a map of self_pickup_item id → quantity (positive integer).
export type SelfPickupQuantitiesDraft = Record<string, number>;

// A staged ADD — a new asset chosen from the picker (not yet on the pickup).
// SP has no permit but DOES surface ORANGE assets, so an ORANGE add carries a
// maintenance_decision (FIX_IN_ORDER / USE_AS_IS) on the ADD op.
export interface SelfPickupStagedAdd {
    asset_id: string;
    name: string;
    quantity: number;
    maintenance_decision?: MaintenanceDecision;
}

const clampQty = (n: number): number => {
    if (!Number.isFinite(n)) return 1;
    const i = Math.floor(n);
    return i < 1 ? 1 : i;
};

// A quantity stepper used by both existing rows and staged-add rows.
function QtyStepper({
    qty,
    name,
    disabled,
    onChange,
}: {
    qty: number;
    name: string;
    disabled?: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(qty - 1)}
                disabled={disabled || qty <= 1}
                aria-label={`Decrease quantity of ${name}`}
                className="h-8 w-8 p-0 rounded-none border-r border-border hover:bg-muted"
            >
                <Minus className="h-3 w-3" />
            </Button>
            <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={qty}
                data-testid="sp-edit-item-qty"
                onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isNaN(parsed)) return;
                    onChange(parsed);
                }}
                onBlur={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onChange(Number.isNaN(parsed) ? 1 : parsed);
                }}
                disabled={disabled}
                aria-label={`Quantity of ${name}`}
                className="h-8 w-16 rounded-none border-0 text-center font-mono focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(qty + 1)}
                disabled={disabled}
                aria-label={`Increase quantity of ${name}`}
                className="h-8 w-8 p-0 rounded-none border-l border-border hover:bg-muted"
            >
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}

export function SelfPickupItemsEditor({
    items,
    value,
    onChange,
    removedIds,
    onToggleRemove,
    stagedAdds,
    onAddAssets,
    onChangeAddQty,
    onRemoveAdd,
    disabled,
}: {
    items: SelfPickupEditorItem[];
    value: SelfPickupQuantitiesDraft;
    onChange: (patch: SelfPickupQuantitiesDraft) => void;
    // Set of self_pickup_item ids marked for removal.
    removedIds: Set<string>;
    onToggleRemove: (id: string) => void;
    // Staged ADDs, keyed by asset_id (parent owns the array).
    stagedAdds: SelfPickupStagedAdd[];
    // Confirm a batch of picker selections — parent merges/dedupes into stagedAdds.
    onAddAssets: (adds: SelfPickupStagedAdd[]) => void;
    onChangeAddQty: (assetId: string, quantity: number) => void;
    onRemoveAdd: (assetId: string) => void;
    disabled?: boolean;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const setQty = (id: string, next: number) => {
        onChange({ [id]: clampQty(next) });
    };

    // How many existing items remain (not pending-removal). With no staged adds,
    // the last remaining existing item can't be removed (server also blocks it).
    const remainingExisting = items.filter((it) => !removedIds.has(it.id)).length;
    // Mark staged assets as "already added" in the picker (parent merges dupes).
    const stagedIds = stagedAdds.map((a) => a.asset_id);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Adjust quantities, remove items, or add new ones. Saving re-checks asset
                availability for your pickup window — if stock isn&apos;t available we&apos;ll let
                you know when you save.
            </p>

            {items.length === 0 && stagedAdds.length === 0 && (
                <p className="text-xs text-muted-foreground">This pickup has no editable items.</p>
            )}

            <div className="space-y-2">
                {items.map((item) => {
                    const qty = value[item.id] ?? 1;
                    const isRemoved = removedIds.has(item.id);
                    // Block removing the last item left, unless a new one is being
                    // added in the same edit (then the pickup won't be empty).
                    const blockRemove =
                        !isRemoved && remainingExisting <= 1 && stagedAdds.length === 0;
                    return (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors ${
                                isRemoved
                                    ? "border-destructive/40 bg-destructive/5"
                                    : "border-border/40 bg-background/50"
                            }`}
                            data-testid="sp-edit-item-row"
                        >
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
                                            ? "A pickup must keep at least one item"
                                            : isRemoved
                                              ? "Keep this item"
                                              : "Remove this item"
                                    }
                                    aria-label={
                                        isRemoved ? `Keep ${item.name}` : `Remove ${item.name}`
                                    }
                                    className="h-8 w-8 p-0"
                                    data-testid="sp-edit-item-remove"
                                >
                                    {isRemoved ? (
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {/* Staged adds — new assets not yet on the pickup. */}
                {stagedAdds.map((add) => (
                    <div
                        key={add.asset_id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 p-3"
                        data-testid="sp-edit-add-row"
                    >
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
                                    Fix before pickup
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
                                name={add.name}
                                disabled={disabled}
                                onChange={(next) => onChangeAddQty(add.asset_id, clampQty(next))}
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
                ))}
            </div>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 font-mono"
                        disabled={disabled}
                        data-testid="sp-edit-add-open"
                    >
                        <PackagePlus className="h-4 w-4" />
                        Add item
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b border-border px-6 py-4">
                        <DialogTitle className="font-mono text-sm uppercase tracking-wide">
                            Add an item to your pickup
                        </DialogTitle>
                        <DialogDescription>
                            Search your catalog and add assets. Availability is re-checked when you
                            save your changes. Items needing repair require a maintenance decision.
                        </DialogDescription>
                    </DialogHeader>
                    <ClientAssetPicker
                        alreadyOnEntity={stagedIds}
                        conditionDecision="require"
                        entityNoun="pickup"
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
