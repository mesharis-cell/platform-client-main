"use client";

/**
 * SelfPickupEditPanel — order-editing feature, Phase 4 (self-pickup editing).
 *
 * Mirrors the order OrderEditPanel. View mode shows a single "Edit Details"
 * affordance; entering edit mode reveals controlled editors for the collector
 * contact, descriptive fields, the pickup window + expected return, and items.
 * On save it diffs the working draft against the original snapshot and sends
 * ONLY the changed keys to PATCH /client/v1/self-pickup/:id (one endpoint serves
 * owner AND company-manager scope). No optimistic mutation — a successful save
 * invalidates the detail query and the refetch drives the UI.
 *
 * The parent gates rendering on the editable band + scope; this panel assumes it
 * should only render when editing is permitted. `job_number` is admin-only and
 * is never touched.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, X, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUpdateSelfPickupDetails, type SelfPickupEditPayload } from "@/hooks/use-self-pickups";
import { CollectorEditor, type CollectorDraft } from "./CollectorEditor";
import {
    SelfPickupDescriptiveEditor,
    type SelfPickupDescriptiveDraft,
} from "./SelfPickupDescriptiveEditor";
import { PickupWindowEditor, type PickupWindowDraft } from "./PickupWindowEditor";
import {
    SelfPickupItemsEditor,
    type SelfPickupQuantitiesDraft,
    type SelfPickupEditorItem,
    type SelfPickupStagedAdd,
} from "./SelfPickupItemsEditor";

// Machine-readable error codes the API returns on edit-flow failures. When the
// thrown error carries one of these (or a 409/400 status), surface it inline in
// the band rather than only as a toast.
const EDIT_ERROR_CODES = new Set([
    "EDIT_NOT_EDITABLE",
    "INSUFFICIENT_AVAILABILITY",
    "LAST_ITEM",
    "MAINTENANCE_ASSET",
    "TRANSFORMED_ASSET",
    "CROSS_COMPANY",
]);

// One self-pickup item as returned by the SP detail response. Unlike orders
// (which nest under `order_item`), the SP item row is flat: `id` is the
// self_pickup_items PK (sent as `order_item_id`), with asset_name + quantity.
interface SelfPickupForEditItem {
    id: string;
    asset_name: string;
    quantity: number;
}

// Shape we read off the SP detail response (snake_case, as returned by the API).
interface SelfPickupForEdit {
    id: string;
    items?: SelfPickupForEditItem[] | null;
    collector_name?: string | null;
    collector_phone?: string | null;
    collector_email?: string | null;
    notes?: string | null;
    special_instructions?: string | null;
    is_permanent_placement?: boolean | null;
    po_number?: string | null;
    pickup_window?: { start?: string | null; end?: string | null } | null;
    // ISO datetime string or null.
    expected_return_at?: string | null;
}

interface Draft {
    collector: CollectorDraft;
    descriptive: SelfPickupDescriptiveDraft;
    pickupWindow: PickupWindowDraft;
    // Existing-item quantities keyed by self_pickup_item id.
    itemQuantities: SelfPickupQuantitiesDraft;
    // self_pickup_item ids marked for removal (REMOVE op on save).
    removedItemIds: string[];
    // New assets staged to add (ADD op on save), keyed by asset_id.
    stagedAdds: SelfPickupStagedAdd[];
}

const s = (v: string | null | undefined) => v ?? "";

// Normalise an ISO datetime string from the API to "YYYY-MM-DDTHH:mm" for the
// native datetime-local input (local time). Returns "" when absent/unparseable.
const toDateTimeLocal = (v: string | null | undefined): string => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${y}-${mo}-${da}T${h}:${mi}`;
};

// Convert a "YYYY-MM-DDTHH:mm" local-input value to a full ISO string. Returns
// "" when empty/unparseable so the caller can decide how to treat it.
const fromDateTimeLocal = (v: string): string => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
};

// Normalised list of editable items (self_pickup_item id + asset name),
// filtering any malformed rows that lack an id.
function buildItemRows(pickup: SelfPickupForEdit): SelfPickupEditorItem[] {
    return (pickup.items ?? [])
        .filter((it) => !!it?.id)
        .map((it) => ({ id: it.id, name: it.asset_name }));
}

function buildItemQuantities(pickup: SelfPickupForEdit): SelfPickupQuantitiesDraft {
    const map: SelfPickupQuantitiesDraft = {};
    for (const it of pickup.items ?? []) {
        if (it?.id) map[it.id] = Number(it.quantity) || 1;
    }
    return map;
}

function buildDraft(pickup: SelfPickupForEdit): Draft {
    return {
        collector: {
            collector_name: s(pickup.collector_name),
            collector_phone: s(pickup.collector_phone),
            collector_email: s(pickup.collector_email),
        },
        descriptive: {
            notes: s(pickup.notes),
            special_instructions: s(pickup.special_instructions),
            is_permanent_placement: !!pickup.is_permanent_placement,
            po_number: s(pickup.po_number),
        },
        pickupWindow: {
            pickup_start: toDateTimeLocal(pickup.pickup_window?.start),
            pickup_end: toDateTimeLocal(pickup.pickup_window?.end),
            expected_return_at: toDateTimeLocal(pickup.expected_return_at),
        },
        itemQuantities: buildItemQuantities(pickup),
        removedItemIds: [],
        stagedAdds: [],
    };
}

// Convert an editor string to the wire value: empty string → null for nullable
// fields so a cleared field is actually cleared server-side.
const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

/**
 * Diff the draft against the original and emit ONLY changed, allowlisted keys.
 */
function diffPayload(original: Draft, next: Draft): SelfPickupEditPayload {
    const body: SelfPickupEditPayload = {};

    // Collector (name + phone required server-side — send trimmed value; email nullable)
    if (next.collector.collector_name.trim() !== original.collector.collector_name.trim())
        body.collector_name = next.collector.collector_name.trim();
    if (next.collector.collector_phone.trim() !== original.collector.collector_phone.trim())
        body.collector_phone = next.collector.collector_phone.trim();
    if (next.collector.collector_email.trim() !== original.collector.collector_email.trim())
        body.collector_email = nullable(next.collector.collector_email);

    // Descriptive
    const d = next.descriptive;
    const o = original.descriptive;
    if (d.notes.trim() !== o.notes.trim()) body.notes = nullable(d.notes);
    if (d.special_instructions.trim() !== o.special_instructions.trim())
        body.special_instructions = nullable(d.special_instructions);
    if (d.is_permanent_placement !== o.is_permanent_placement)
        body.is_permanent_placement = d.is_permanent_placement;
    if (d.po_number.trim() !== o.po_number.trim()) body.po_number = nullable(d.po_number);

    // Pickup window: send the whole object if either bound changed. Compared as
    // the local-input string; sent as ISO so the server re-derives the booking
    // window. Only send when both bounds are present (the input requires both).
    const w = next.pickupWindow;
    const ow = original.pickupWindow;
    const windowChanged = w.pickup_start !== ow.pickup_start || w.pickup_end !== ow.pickup_end;
    if (windowChanged && w.pickup_start && w.pickup_end) {
        body.pickup_window = {
            start: fromDateTimeLocal(w.pickup_start),
            end: fromDateTimeLocal(w.pickup_end),
        };
    }

    // Expected return: clearable. Empty draft → null (clear it server-side).
    if (w.expected_return_at !== ow.expected_return_at) {
        body.expected_return_at = w.expected_return_at
            ? fromDateTimeLocal(w.expected_return_at)
            : null;
    }

    // Item ops: build a single mixed array of UPDATE / REMOVE / ADD entries.
    //   REMOVE — every self_pickup_item id marked for removal.
    //   UPDATE — existing items whose quantity changed AND that aren't being
    //            removed (a removed row never also emits an UPDATE).
    //   ADD    — every staged new asset.
    // Omit `items` entirely when there are none.
    const removed = new Set(next.removedItemIds);
    const itemOps: NonNullable<SelfPickupEditPayload["items"]> = [];

    for (const id of next.removedItemIds) {
        itemOps.push({ op: "REMOVE", order_item_id: id });
    }
    for (const [order_item_id, quantity] of Object.entries(next.itemQuantities)) {
        if (removed.has(order_item_id)) continue;
        if (original.itemQuantities[order_item_id] !== quantity) {
            itemOps.push({ order_item_id, quantity });
        }
    }
    for (const add of next.stagedAdds) {
        itemOps.push({
            op: "ADD",
            asset_id: add.asset_id,
            quantity: add.quantity,
            // ORANGE adds carry the client's in-picker maintenance decision.
            ...(add.maintenance_decision ? { maintenance_decision: add.maintenance_decision } : {}),
        });
    }
    if (itemOps.length > 0) body.items = itemOps;

    return body;
}

export function SelfPickupEditPanel({ pickup }: { pickup: SelfPickupForEdit }) {
    const [isEditing, setIsEditing] = useState(false);
    const [bandError, setBandError] = useState<string | null>(null);
    const updatePickup = useUpdateSelfPickupDetails(pickup.id);

    // Snapshot at the moment edit mode opens. Memoised on the pickup identity so
    // an external refetch reseeds the baseline in view mode.
    const baseline = useMemo(() => buildDraft(pickup), [pickup]);
    const itemRows = useMemo(() => buildItemRows(pickup), [pickup]);
    const [draft, setDraft] = useState<Draft>(baseline);

    const openEdit = () => {
        setDraft(buildDraft(pickup));
        setBandError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setBandError(null);
        setDraft(buildDraft(pickup));
    };

    const payload = useMemo(() => diffPayload(baseline, draft), [baseline, draft]);
    const hasChanges = Object.keys(payload).length > 0;
    const removedSet = useMemo(() => new Set(draft.removedItemIds), [draft.removedItemIds]);

    const handleSave = async () => {
        if (!hasChanges) {
            toast.info("No changes to save.");
            return;
        }
        setBandError(null);
        try {
            const result = await updatePickup.mutateAsync(payload);
            const count = result?.changed_fields?.length ?? Object.keys(payload).length;
            if (result?.status_reverted) {
                toast.success(
                    `Saved ${count} change${count === 1 ? "" : "s"}. The quote was withdrawn for re-review.`
                );
            } else {
                toast.success(`Saved ${count} change${count === 1 ? "" : "s"}.`);
            }
            setIsEditing(false);
        } catch (error) {
            const e = error as Error & { code?: string; status?: number };
            const message = e?.message || "Failed to save changes";
            // The API returns a descriptive 4xx with a machine-readable `code`
            // when the pickup has left the editable band, when the window /
            // quantities / a staged add lack availability, or when an item op is
            // invalid (last-item removal, cross-company asset add). Surface those
            // inline as well as via toast.
            if (EDIT_ERROR_CODES.has(e?.code ?? "") || e?.status === 409 || e?.status === 400) {
                setBandError(message);
            }
            toast.error(message);
        }
    };

    if (!isEditing) {
        return (
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        <div>
                            <h3 className="font-bold font-mono text-sm uppercase tracking-wide">
                                Pickup Details
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Update collector, pickup window, items and instructions before your
                                pickup is confirmed.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={openEdit}
                        variant="outline"
                        className="font-mono gap-2 shrink-0"
                        data-testid="sp-edit-open"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit Details
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card
                className="p-6 bg-card/50 backdrop-blur-sm border-primary/30"
                data-testid="sp-edit-panel"
            >
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        <h3 className="font-bold font-mono text-sm uppercase tracking-wide">
                            Edit Pickup Details
                        </h3>
                    </div>
                    <Button
                        onClick={cancelEdit}
                        variant="ghost"
                        size="icon"
                        disabled={updatePickup.isPending}
                        aria-label="Cancel editing"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {bandError && (
                    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{bandError}</span>
                    </div>
                )}

                <div className="space-y-8">
                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Collector
                        </h4>
                        <CollectorEditor
                            value={draft.collector}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    collector: { ...prev.collector, ...patch },
                                }))
                            }
                            disabled={updatePickup.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Details
                        </h4>
                        <SelfPickupDescriptiveEditor
                            value={draft.descriptive}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    descriptive: { ...prev.descriptive, ...patch },
                                }))
                            }
                            disabled={updatePickup.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Pickup Window
                        </h4>
                        <PickupWindowEditor
                            value={draft.pickupWindow}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    pickupWindow: { ...prev.pickupWindow, ...patch },
                                }))
                            }
                            disabled={updatePickup.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Items
                        </h4>
                        <SelfPickupItemsEditor
                            items={itemRows}
                            value={draft.itemQuantities}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    itemQuantities: { ...prev.itemQuantities, ...patch },
                                }))
                            }
                            removedIds={removedSet}
                            onToggleRemove={(id) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    removedItemIds: prev.removedItemIds.includes(id)
                                        ? prev.removedItemIds.filter((x) => x !== id)
                                        : [...prev.removedItemIds, id],
                                }))
                            }
                            stagedAdds={draft.stagedAdds}
                            onAddAssets={(adds) =>
                                setDraft((prev) => {
                                    const existing = new Map(
                                        prev.stagedAdds.map((a) => [a.asset_id, a])
                                    );
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
                                setDraft((prev) => ({
                                    ...prev,
                                    stagedAdds: prev.stagedAdds.map((a) =>
                                        a.asset_id === assetId ? { ...a, quantity } : a
                                    ),
                                }))
                            }
                            onRemoveAdd={(assetId) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    stagedAdds: prev.stagedAdds.filter(
                                        (a) => a.asset_id !== assetId
                                    ),
                                }))
                            }
                            disabled={updatePickup.isPending}
                        />
                    </section>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={updatePickup.isPending}
                        className="font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updatePickup.isPending || !hasChanges}
                        className="font-mono gap-2"
                        data-testid="sp-edit-save"
                    >
                        <Save className="w-4 h-4" />
                        {updatePickup.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}
