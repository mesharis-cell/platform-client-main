"use client";

/**
 * OrderItemsEditableCard — the in-place EDITABLE items card for the client order
 * detail page. Renders the SAME card shell as the read-only <OrderItemsList>
 * (`p-6 bg-card/50 backdrop-blur-sm border-border/40`, Package + "ITEMS" header)
 * so swapping read↔edit keeps the page layout identical, and hosts the bounded
 * <OrderItemsQuantityEditor> (QtyStepper / clampQty / ClientAssetPicker adds).
 *
 * Items are ALWAYS inline (their own binding, never part of the single-open set).
 * This card reads `useEditableItems()` for the live draft + bounds + save, and
 * wires every draft handler via `binding.patch` — the body is lifted VERBATIM from
 * the Items branch of OrderDetailEdit.tsx (quantity / toggle-remove / staged-add
 * merge / change-add-qty / remove-add + the item save bar), nothing rebuilt.
 *
 * LIGHT MODE ONLY.
 */

import { useMemo } from "react";
import { Package, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditableItems } from "./editable-primitives";
import { OrderItemsQuantityEditor } from "./OrderItemsQuantityEditor";
import { buildItemRows, type Draft, type OrderForEdit } from "./order-edit-contract";
import { FeasibilityHelper } from "@/components/checkout/FeasibilityHelper";
import { RedFeasibilityAlert } from "@/components/checkout/RedFeasibilityAlert";
import { roundedFloorTimeInZone, shiftDateStr } from "@/lib/feasibility/compose-datetime";
import type { FeasibilityHelperProps } from "@/hooks/use-order-edit-feasibility";

export function OrderItemsEditableCard({
    order,
    helperProps,
}: {
    order: OrderForEdit;
    // Feasibility verdict for the CURRENT draft (existing rows + staged adds),
    // surfaced inline so an infeasible add is visible BEFORE the user hits save.
    // Same cluster the Event-Dates editor renders; omitted → no feasibility UI.
    helperProps?: FeasibilityHelperProps;
}) {
    const items = useEditableItems<Draft>();
    const { draft, patch, maxByItemId, maxByAssetId, canSave, saving, save } = items;

    const itemRows = useMemo(() => buildItemRows(order), [order]);
    const baselineQuantities = useMemo(() => {
        const map: Record<string, number> = {};
        for (const it of order.items ?? []) {
            if (it?.order_item?.id) map[it.order_item.id] = Number(it.order_item.quantity) || 1;
        }
        return map;
    }, [order.items]);

    const removedSet = useMemo(() => new Set(draft.removedItemIds), [draft.removedItemIds]);

    const hasItemChanges =
        draft.removedItemIds.length > 0 ||
        draft.stagedAdds.length > 0 ||
        Object.entries(draft.itemQuantities).some(([id, q]) => baselineQuantities[id] !== q);

    return (
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
            <div className="flex items-center gap-2 mb-6">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">Items</h3>
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                    {itemRows.length} {itemRows.length === 1 ? "item" : "items"}
                </Badge>
            </div>

            <OrderItemsQuantityEditor
                items={itemRows}
                value={draft.itemQuantities}
                onChange={(p) =>
                    patch((prev) => ({
                        ...prev,
                        itemQuantities: { ...prev.itemQuantities, ...p },
                    }))
                }
                removedIds={removedSet}
                onToggleRemove={(id) =>
                    patch((prev) => ({
                        ...prev,
                        removedItemIds: prev.removedItemIds.includes(id)
                            ? prev.removedItemIds.filter((x) => x !== id)
                            : [...prev.removedItemIds, id],
                    }))
                }
                stagedAdds={draft.stagedAdds}
                onAddAssets={(adds) =>
                    patch((prev) => {
                        const existing = new Map(prev.stagedAdds.map((a) => [a.asset_id, a]));
                        for (const add of adds) {
                            const prior = existing.get(add.asset_id);
                            existing.set(
                                add.asset_id,
                                prior
                                    ? {
                                          ...prior,
                                          quantity: prior.quantity + add.quantity,
                                          maintenance_decision:
                                              add.maintenance_decision ??
                                              prior.maintenance_decision,
                                      }
                                    : add
                            );
                        }
                        return { ...prev, stagedAdds: Array.from(existing.values()) };
                    })
                }
                onChangeAddQty={(assetId, quantity) =>
                    patch((prev) => ({
                        ...prev,
                        stagedAdds: prev.stagedAdds.map((a) =>
                            a.asset_id === assetId ? { ...a, quantity } : a
                        ),
                    }))
                }
                onRemoveAdd={(assetId) =>
                    patch((prev) => ({
                        ...prev,
                        stagedAdds: prev.stagedAdds.filter((a) => a.asset_id !== assetId),
                    }))
                }
                maxByItemId={maxByItemId}
                maxByAssetId={maxByAssetId}
                disabled={saving}
            />

            {/* Feasibility for the edited item set — shown alongside pending item
                changes so an infeasible add (e.g. an ORANGE that can't be refurbed
                in time, or a date too soon for lead time) surfaces BEFORE save. The
                verdict already folds staged adds in via the feasibility companion;
                when it blocks, the controller also disables the save button below. */}
            {hasItemChanges && helperProps && (
                <div className="mt-4 space-y-3">
                    <FeasibilityHelper
                        helperEnabled={helperProps.helperEnabled}
                        isLoading={helperProps.isLoading}
                        floorDate={helperProps.floorDate}
                        floorDatetime={helperProps.floorDatetime}
                        userEventDate={helperProps.userEventDate}
                        userDateFeasible={helperProps.userDateFeasible}
                        blockingItems={helperProps.blockingItems}
                        config={helperProps.config}
                        onUseFloorDate={() => {
                            if (!helperProps.floorDate) return;
                            const rounded = roundedFloorTimeInZone(
                                helperProps.floorDatetime,
                                helperProps.timezone
                            );
                            const targetDate = rounded
                                ? shiftDateStr(helperProps.floorDate, rounded.dayOffset)
                                : helperProps.floorDate;
                            patch((prev) => ({
                                ...prev,
                                eventDates: {
                                    ...prev.eventDates,
                                    event_start_date: targetDate,
                                },
                            }));
                        }}
                    />
                    <RedFeasibilityAlert
                        issues={helperProps.issues}
                        hasChecked={helperProps.hasChecked}
                        isChecking={helperProps.isChecking}
                    />
                </div>
            )}

            {/* Save bar for item ops — only shown when there are item changes. */}
            {hasItemChanges && (
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/40 pt-4">
                    <Button
                        variant="outline"
                        onClick={() =>
                            patch((prev) => ({
                                ...prev,
                                itemQuantities: baselineQuantities,
                                removedItemIds: [],
                                stagedAdds: [],
                            }))
                        }
                        disabled={saving}
                        className="font-mono"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Discard item changes
                    </Button>
                    <Button
                        onClick={save}
                        disabled={saving || !canSave}
                        className="font-mono gap-2"
                        data-testid="order-section-items-save"
                    >
                        <Check className="w-4 h-4" />
                        {saving ? "Saving..." : "Save item changes"}
                    </Button>
                </div>
            )}
        </Card>
    );
}
