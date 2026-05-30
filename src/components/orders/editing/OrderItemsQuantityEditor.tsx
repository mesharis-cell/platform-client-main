"use client";

/**
 * Existing-item quantity editor (order-editing P3b). Lists each physical order
 * item with a quantity stepper (min 1, integers only). Controlled by the parent
 * OrderEditPanel, which owns the draft state and diffs it against the baseline.
 *
 * This edits the quantity of EXISTING items only — it does NOT add new assets or
 * remove items. On save the server reconciles asset bookings (availability-
 * checked: a shortfall returns 409 with a message mentioning availability) and
 * reprices the volume-based BASE_OPS line. A quantity change on a QUOTED order
 * bounces it to PRICING_REVIEW + QUOTE_REVISED. The server is authoritative on
 * availability; this editor performs no optimistic update.
 *
 * Drafts hold `Record<order_item_id, quantity>`. The panel sends only changed
 * items as `items: [{ order_item_id, quantity }]`, omitting the key entirely
 * when nothing changed.
 */

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// One editable row. `id` is the order_item UUID (item.order_item.id on the
// order detail response); `name` is the asset name; `quantity` is the current.
export interface QuantityEditorItem {
    id: string;
    name: string;
}

// Draft is a map of order_item_id → quantity (positive integer).
export type ItemQuantitiesDraft = Record<string, number>;

const clampQty = (n: number): number => {
    if (!Number.isFinite(n)) return 1;
    const i = Math.floor(n);
    return i < 1 ? 1 : i;
};

export function OrderItemsQuantityEditor({
    items,
    value,
    onChange,
    disabled,
}: {
    items: QuantityEditorItem[];
    value: ItemQuantitiesDraft;
    onChange: (patch: ItemQuantitiesDraft) => void;
    disabled?: boolean;
}) {
    if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">This order has no editable items.</p>;
    }

    const setQty = (id: string, next: number) => {
        onChange({ [id]: clampQty(next) });
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Adjust quantities for items already on your order. Saving re-checks asset
                availability for your event window — if stock isn&apos;t available we&apos;ll let
                you know when you save.
            </p>

            <div className="space-y-2">
                {items.map((item) => {
                    const qty = value[item.id] ?? 1;
                    return (
                        <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background/50 p-3"
                            data-testid="order-edit-item-row"
                        >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {item.name}
                            </span>

                            <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQty(item.id, qty - 1)}
                                    disabled={disabled || qty <= 1}
                                    aria-label={`Decrease quantity of ${item.name}`}
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
                                    data-testid="order-edit-item-qty"
                                    onChange={(e) => {
                                        const parsed = parseInt(e.target.value, 10);
                                        if (Number.isNaN(parsed)) return;
                                        setQty(item.id, parsed);
                                    }}
                                    onBlur={(e) => {
                                        const parsed = parseInt(e.target.value, 10);
                                        setQty(item.id, Number.isNaN(parsed) ? 1 : parsed);
                                    }}
                                    disabled={disabled}
                                    aria-label={`Quantity of ${item.name}`}
                                    className="h-8 w-16 rounded-none border-0 text-center font-mono focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQty(item.id, qty + 1)}
                                    disabled={disabled}
                                    aria-label={`Increase quantity of ${item.name}`}
                                    className="h-8 w-8 p-0 rounded-none border-l border-border hover:bg-muted"
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
