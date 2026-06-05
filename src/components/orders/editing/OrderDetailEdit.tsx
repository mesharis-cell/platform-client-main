"use client";

/**
 * OrderDetailEdit — PER-SECTION INLINE editing for the order detail page.
 *
 * Replaces the single monolithic "Edit Details" card (OrderEditPanel) with one
 * inline-editable card PER logical section: Contact, Venue Contact, Venue &
 * Logistics, Permit, Event Dates, and Items. Each section shows its current
 * values with an inline "Edit" affordance; clicking it flips THAT section into
 * its editor IN PLACE (reusing the SAME editor components verbatim), with its
 * own Save / Cancel. Items are edited directly in the items list (no view-mode).
 *
 * The save contract is UNCHANGED from OrderEditPanel:
 *   - One shared working `Draft` is built from the order snapshot (`baseline`).
 *   - `diffPayload(baseline, draft, …)` emits ONLY changed, allowlisted keys.
 *   - A per-section Save PATCHes that same diff to /client/v1/order/:id — because
 *     only one section is open at a time and the rest of the draft equals the
 *     baseline, the payload naturally contains just that section's changes.
 *   - The save-gate fix is preserved: a required permit with an UNKNOWN owner
 *     blocks save ONLY when the payload actually carries permit_requirements.
 *   - QUOTE_REVISED handling (status_reverted) preserved.
 *   - Band gating is enforced by the parent (this component only renders inside
 *     SUBMITTED/PRICING_REVIEW/PENDING_APPROVAL/QUOTED).
 *
 * Cross-cutting concerns wired here because they span sections:
 *   - Feasibility (useFeasibility/useFeasibilityConfig + interpret + helper +
 *     red alert), driven by the EDITED dates + items (existing rows + staged
 *     adds w/ maintenance_decision), exactly like checkout. Save is blocked when
 *     feasibility.userDateFeasible === false.
 *   - Event-date inputs respect enable_event_date_inputs per-company and apply
 *     the checkout calculateMinDate lead-time floor as the input min.
 *   - Per-row bounded quantities via a live availability preview over the edited
 *     window (max = available + that row's own booked qty for existing rows).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Pencil,
    X,
    Save,
    AlertTriangle,
    User,
    MapPin,
    Building2,
    FileText,
    Calendar,
    Package,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatform } from "@/contexts/platform-context";
import { useUpdateOrderDetails, type OrderEditPayload } from "@/hooks/use-order-editing";
import {
    useFeasibility,
    useFeasibilityConfig,
    interpretFeasibilityPreview,
} from "@/hooks/use-feasibility-check";
import { useAvailabilityPreview } from "@/hooks/use-availability-preview";
import {
    composeZonedISO,
    roundedFloorTimeInZone,
    shiftDateStr,
} from "@/lib/feasibility/compose-datetime";
import { FeasibilityHelper } from "@/components/checkout/FeasibilityHelper";
import { RedFeasibilityAlert } from "@/components/checkout/RedFeasibilityAlert";
import { PermitSection, type PermitSectionValue } from "@/components/permits/PermitSection";
import { ContactEditor, type ContactDraft } from "./ContactEditor";
import { VenueContactEditor, type VenueContactDraft } from "./VenueContactEditor";
import {
    DescriptiveFieldsEditor,
    type DescriptiveDraft,
    type PermitDraft,
} from "./DescriptiveFieldsEditor";
import {
    OrderItemsQuantityEditor,
    type ItemQuantitiesDraft,
    type QuantityEditorItem,
    type StagedAdd,
} from "./OrderItemsQuantityEditor";

// Machine-readable error codes the API returns on edit-flow failures.
const EDIT_ERROR_CODES = new Set([
    "EDIT_NOT_EDITABLE",
    "INSUFFICIENT_AVAILABILITY",
    "LAST_ITEM",
    "MAINTENANCE_ASSET",
    "TRANSFORMED_ASSET",
    "CROSS_COMPANY",
]);

// One physical order item as returned by the order detail response.
interface OrderForEditItem {
    id?: string;
    order_item: {
        id: string;
        asset_id?: string;
        asset_name: string;
        quantity: number;
    };
    asset?: {
        condition?: "GREEN" | "ORANGE" | "RED" | string;
    } | null;
}

interface OrderForEdit {
    id: string;
    items?: OrderForEditItem[] | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    venue_contact_name?: string | null;
    venue_contact_email?: string | null;
    venue_contact_phone?: string | null;
    venue_name?: string | null;
    venue_city?: string | null;
    venue_city_id?: string | null;
    venue_location?: {
        country?: string | null;
        city?: string | null;
        address?: string | null;
        access_notes?: string | null;
    } | null;
    special_instructions?: string | null;
    is_permanent_placement?: boolean | null;
    po_number?: string | null;
    event_start_date?: string | null;
    event_end_date?: string | null;
    permit_requirements?: {
        requires_permit?: boolean;
        permit_owner?: "CLIENT" | "PLATFORM" | "UNKNOWN";
        requires_vehicle_docs?: boolean;
        requires_staff_ids?: boolean;
        notes?: string;
    } | null;
}

interface Draft {
    contact: ContactDraft;
    venueContact: VenueContactDraft;
    descriptive: DescriptiveDraft;
    eventDates: EventDatesDraft;
    itemQuantities: ItemQuantitiesDraft;
    removedItemIds: string[];
    stagedAdds: StagedAdd[];
}

interface EventDatesDraft {
    event_start_date: string; // "YYYY-MM-DD" or ""
    event_end_date: string;
}

type SectionKey = "contact" | "venueContact" | "descriptive" | "permit" | "eventDates";

const s = (v: string | null | undefined) => v ?? "";

const toDateInput = (v: string | null | undefined): string => {
    if (!v) return "";
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
    if (m) return m[1];
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
};

function buildItemRows(order: OrderForEdit): QuantityEditorItem[] {
    return (order.items ?? [])
        .filter((it) => !!it?.order_item?.id)
        .map((it) => ({ id: it.order_item.id, name: it.order_item.asset_name }));
}

function buildItemQuantities(order: OrderForEdit): ItemQuantitiesDraft {
    const map: ItemQuantitiesDraft = {};
    for (const it of order.items ?? []) {
        if (it?.order_item?.id) map[it.order_item.id] = Number(it.order_item.quantity) || 1;
    }
    return map;
}

function buildDraft(order: OrderForEdit): Draft {
    const permit = order.permit_requirements ?? null;
    const permitDraft: PermitDraft = {
        requires_permit: !!permit?.requires_permit,
        permit_owner: permit?.permit_owner ?? "UNKNOWN",
        requires_vehicle_docs: !!permit?.requires_vehicle_docs,
        requires_staff_ids: !!permit?.requires_staff_ids,
        notes: s(permit?.notes),
    };
    return {
        contact: {
            contact_name: s(order.contact_name),
            contact_email: s(order.contact_email),
            contact_phone: s(order.contact_phone),
        },
        venueContact: {
            venue_contact_name: s(order.venue_contact_name),
            venue_contact_email: s(order.venue_contact_email),
            venue_contact_phone: s(order.venue_contact_phone),
        },
        descriptive: {
            venue_name: s(order.venue_name),
            venue_city_id: s(order.venue_city_id),
            venue_address: s(order.venue_location?.address),
            venue_access_notes: s(order.venue_location?.access_notes),
            special_instructions: s(order.special_instructions),
            is_permanent_placement: !!order.is_permanent_placement,
            po_number: s(order.po_number),
            permit: permitDraft,
        },
        eventDates: {
            event_start_date: toDateInput(order.event_start_date),
            event_end_date: toDateInput(order.event_end_date),
        },
        itemQuantities: buildItemQuantities(order),
        removedItemIds: [],
        stagedAdds: [],
    };
}

const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

/**
 * Diff the draft against the original and emit ONLY changed, allowlisted keys.
 * Identical contract to the former OrderEditPanel.diffPayload.
 */
function diffPayload(
    original: Draft,
    next: Draft,
    originalVenueLocation: OrderForEdit["venue_location"]
): OrderEditPayload {
    const body: OrderEditPayload = {};

    if (next.contact.contact_name.trim() !== original.contact.contact_name.trim())
        body.contact_name = next.contact.contact_name.trim();
    if (next.contact.contact_email.trim() !== original.contact.contact_email.trim())
        body.contact_email = next.contact.contact_email.trim();
    if (next.contact.contact_phone.trim() !== original.contact.contact_phone.trim())
        body.contact_phone = next.contact.contact_phone.trim();

    if (
        next.venueContact.venue_contact_name.trim() !==
        original.venueContact.venue_contact_name.trim()
    )
        body.venue_contact_name = nullable(next.venueContact.venue_contact_name);
    if (
        next.venueContact.venue_contact_email.trim() !==
        original.venueContact.venue_contact_email.trim()
    )
        body.venue_contact_email = nullable(next.venueContact.venue_contact_email);
    if (
        next.venueContact.venue_contact_phone.trim() !==
        original.venueContact.venue_contact_phone.trim()
    )
        body.venue_contact_phone = nullable(next.venueContact.venue_contact_phone);

    const d = next.descriptive;
    const o = original.descriptive;
    if (d.venue_name.trim() !== o.venue_name.trim()) body.venue_name = d.venue_name.trim();
    if (d.venue_city_id && d.venue_city_id !== o.venue_city_id)
        body.venue_city_id = d.venue_city_id;

    // venue_location: only send if address or access_notes changed. Spread the
    // ORIGINAL venue_location (preserving country + city) and overwrite only the
    // edited subfields — the server full-column-replaces this object.
    const addressChanged = d.venue_address.trim() !== o.venue_address.trim();
    const accessNotesChanged = d.venue_access_notes.trim() !== o.venue_access_notes.trim();
    if (addressChanged || accessNotesChanged) {
        body.venue_location = {
            ...(originalVenueLocation
                ? {
                      ...(originalVenueLocation.country != null
                          ? { country: originalVenueLocation.country }
                          : {}),
                      ...(originalVenueLocation.city != null
                          ? { city: originalVenueLocation.city }
                          : {}),
                  }
                : {}),
            address: d.venue_address.trim(),
            access_notes: d.venue_access_notes.trim(),
        };
    }

    if (d.special_instructions.trim() !== o.special_instructions.trim())
        body.special_instructions = nullable(d.special_instructions);

    if (d.is_permanent_placement !== o.is_permanent_placement)
        body.is_permanent_placement = d.is_permanent_placement;

    if (d.po_number.trim() !== o.po_number.trim()) body.po_number = nullable(d.po_number);

    const p = d.permit;
    const op = o.permit;
    const permitChanged =
        p.requires_permit !== op.requires_permit ||
        p.permit_owner !== op.permit_owner ||
        p.requires_vehicle_docs !== op.requires_vehicle_docs ||
        p.requires_staff_ids !== op.requires_staff_ids ||
        p.notes.trim() !== op.notes.trim();
    if (permitChanged) {
        if (!p.requires_permit) {
            body.permit_requirements = null;
        } else {
            body.permit_requirements = {
                requires_permit: true,
                permit_owner: p.permit_owner,
                requires_vehicle_docs: p.requires_vehicle_docs,
                requires_staff_ids: p.requires_staff_ids,
                ...(p.notes.trim() ? { notes: p.notes.trim() } : {}),
            };
        }
    }

    const ed = next.eventDates;
    const oed = original.eventDates;
    if (ed.event_start_date && ed.event_start_date !== oed.event_start_date)
        body.event_start_date = ed.event_start_date;
    if (ed.event_end_date && ed.event_end_date !== oed.event_end_date)
        body.event_end_date = ed.event_end_date;

    const removed = new Set(next.removedItemIds);
    const itemOps: NonNullable<OrderEditPayload["items"]> = [];

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
            ...(add.maintenance_decision ? { maintenance_decision: add.maintenance_decision } : {}),
        });
    }
    if (itemOps.length > 0) body.items = itemOps;

    return body;
}

/** Which payload keys belong to which section — used to scope per-section diffs. */
const SECTION_KEYS: Record<SectionKey, (keyof OrderEditPayload)[]> = {
    contact: ["contact_name", "contact_email", "contact_phone"],
    venueContact: ["venue_contact_name", "venue_contact_email", "venue_contact_phone"],
    descriptive: [
        "venue_name",
        "venue_city_id",
        "venue_location",
        "special_instructions",
        "is_permanent_placement",
        "po_number",
    ],
    permit: ["permit_requirements", "venue_location"],
    eventDates: ["event_start_date", "event_end_date"],
};

// ----- small view-mode primitives (match the existing detail sidebar look) -----

function ReadRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-sm font-medium break-words">
                {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
            </p>
        </div>
    );
}

function SectionCard({
    icon,
    title,
    editing,
    canEdit = true,
    onEdit,
    children,
    testId,
}: {
    icon: React.ReactNode;
    title: string;
    editing: boolean;
    canEdit?: boolean;
    onEdit: () => void;
    children: React.ReactNode;
    testId?: string;
}) {
    return (
        <Card
            className={`p-6 bg-card/50 backdrop-blur-sm ${
                editing ? "border-primary/30" : "border-border/40"
            }`}
            data-testid={testId}
        >
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-primary">{icon}</span>
                    <h3 className="font-bold font-mono text-sm uppercase tracking-wide">{title}</h3>
                </div>
                {!editing && canEdit && (
                    <Button
                        onClick={onEdit}
                        variant="ghost"
                        size="sm"
                        className="font-mono gap-2 shrink-0 text-xs"
                        data-testid={testId ? `${testId}-edit` : undefined}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                )}
            </div>
            {children}
        </Card>
    );
}

function SectionFooter({
    onCancel,
    onSave,
    saving,
    canSave,
    testId,
}: {
    onCancel: () => void;
    onSave: () => void;
    saving: boolean;
    canSave: boolean;
    testId?: string;
}) {
    return (
        <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={saving} className="font-mono">
                <X className="w-4 h-4 mr-1" />
                Cancel
            </Button>
            <Button
                onClick={onSave}
                disabled={saving || !canSave}
                className="font-mono gap-2"
                data-testid={testId}
            >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
            </Button>
        </div>
    );
}

export function OrderDetailEdit({ order }: { order: OrderForEdit }) {
    const updateOrder = useUpdateOrderDetails(order.id);
    const { platform } = usePlatform();
    const companyName = platform?.company_name ?? null;

    // Per-company gate (mirrors checkout). When OFF, event dates are read-only
    // here too (no inline edit affordance on the dates section).
    const eventDateInputsEnabled =
        (platform?.features as Record<string, boolean> | undefined)?.enable_event_date_inputs ===
        true;
    const feasibilityHelperEnabled =
        (platform?.features as Record<string, boolean> | undefined)?.enable_feasibility_helper !==
        false;

    // Shared working draft + baseline snapshot (memoised on order identity so an
    // external refetch reseeds the baseline once a section collapses).
    const baseline = useMemo(() => buildDraft(order), [order]);
    const itemRows = useMemo(() => buildItemRows(order), [order]);
    const [draft, setDraft] = useState<Draft>(baseline);

    // Only one section is open at a time. Items are ALWAYS inline (never in this
    // set). When `open` flips, we reseed the draft from the order baseline so a
    // section opens clean and the diff only ever carries that section's changes.
    const [open, setOpen] = useState<SectionKey | null>(null);
    const [bandError, setBandError] = useState<string | null>(null);

    const removedSet = useMemo(() => new Set(draft.removedItemIds), [draft.removedItemIds]);

    const payload = useMemo(
        () => diffPayload(baseline, draft, order.venue_location),
        [baseline, draft, order.venue_location]
    );

    // Condition map for existing rows so we can attach maintenance decisions to
    // the feasibility probe (existing rows already carry their decision server-
    // side; for the probe we only need the asset_id, but ORANGE rows should ride
    // with their committed decision to mirror the server's view).
    const itemAssetIdByOrderItemId = useMemo(() => {
        const map = new Map<string, string>();
        for (const it of order.items ?? []) {
            if (it?.order_item?.id && it.order_item.asset_id) {
                map.set(it.order_item.id, it.order_item.asset_id);
            }
        }
        return map;
    }, [order.items]);

    // -------- feasibility (mirror checkout) --------

    const { data: feasibilityConfig } = useFeasibilityConfig();

    // Effective edited event start: the draft date when the flag is on, else the
    // order's existing start. Feasibility uses the START date + a default time so
    // the floor comparison matches the server. We don't capture a time input on
    // this surface, so use a neutral midday wall-clock to avoid a same-day floor
    // tripping purely on time-of-day.
    const effectiveEventStart = eventDateInputsEnabled
        ? draft.eventDates.event_start_date
        : toDateInput(order.event_start_date);

    const effectiveEventStartDatetime = useMemo(() => {
        return composeZonedISO({
            date: effectiveEventStart,
            time: "12:00",
            timezone: feasibilityConfig?.timezone,
        });
    }, [effectiveEventStart, feasibilityConfig?.timezone]);

    // The feasibility item set = surviving existing rows (not pending-removal) +
    // staged adds (with their picker maintenance decision). Mirrors checkout's
    // cart-as-items shape.
    const feasibilityItems = useMemo(() => {
        const out: Array<{
            asset_id: string;
            maintenance_decision?: "FIX_IN_ORDER" | "USE_AS_IS";
        }> = [];
        for (const it of order.items ?? []) {
            const oid = it?.order_item?.id;
            if (!oid || draft.removedItemIds.includes(oid)) continue;
            const assetId = itemAssetIdByOrderItemId.get(oid);
            if (assetId) out.push({ asset_id: assetId });
        }
        for (const add of draft.stagedAdds) {
            out.push({
                asset_id: add.asset_id,
                ...(add.maintenance_decision
                    ? { maintenance_decision: add.maintenance_decision }
                    : {}),
            });
        }
        return out;
    }, [order.items, draft.removedItemIds, draft.stagedAdds, itemAssetIdByOrderItemId]);

    const feasibilityPreview = useFeasibility({
        items: feasibilityItems,
        eventStartDatetime: effectiveEventStartDatetime,
        enabled: feasibilityItems.length > 0,
    });
    const feasibility = interpretFeasibilityPreview(
        feasibilityPreview.data,
        effectiveEventStart,
        effectiveEventStartDatetime
    );

    // -------- availability bounds (live, over the edited window) --------

    const availabilityItems = useMemo(() => {
        const map = new Map<string, number>();
        for (const it of order.items ?? []) {
            const oid = it?.order_item?.id;
            if (!oid || draft.removedItemIds.includes(oid)) continue;
            const assetId = itemAssetIdByOrderItemId.get(oid);
            if (!assetId) continue;
            map.set(assetId, (map.get(assetId) ?? 0) + (draft.itemQuantities[oid] ?? 1));
        }
        for (const add of draft.stagedAdds) {
            map.set(add.asset_id, (map.get(add.asset_id) ?? 0) + add.quantity);
        }
        return Array.from(map.entries()).map(([asset_id, quantity]) => ({ asset_id, quantity }));
    }, [
        order.items,
        draft.removedItemIds,
        draft.itemQuantities,
        draft.stagedAdds,
        itemAssetIdByOrderItemId,
    ]);

    const availabilityWindow = useMemo(() => {
        const start = effectiveEventStart;
        const end = eventDateInputsEnabled
            ? draft.eventDates.event_end_date
            : toDateInput(order.event_end_date);
        if (!start || !end) return null;
        return {
            start: new Date(`${start}T00:00:00.000Z`).toISOString(),
            end: new Date(`${end}T23:59:59.999Z`).toISOString(),
        };
    }, [
        effectiveEventStart,
        eventDateInputsEnabled,
        draft.eventDates.event_end_date,
        order.event_end_date,
    ]);

    const availabilityPreview = useAvailabilityPreview({
        items: availabilityItems,
        window: availabilityWindow,
        enabled: availabilityItems.length > 0,
    });

    // available_quantity is net of ALL active bookings INCLUDING this order's.
    // So for an existing row, max = available + that row's own booked qty (the
    // ORIGINAL committed quantity for the asset), so a decrease / no-op isn't
    // falsely flagged. For a staged add, max = available (no own booking yet).
    const availByAssetId = useMemo(() => {
        const map = new Map<string, number>();
        for (const i of availabilityPreview.data?.items ?? []) {
            map.set(i.asset_id, Number(i.available_quantity) || 0);
        }
        return map;
    }, [availabilityPreview.data]);

    // Sum of each asset's ORIGINAL committed quantity across the order's rows.
    const originalBookedByAssetId = useMemo(() => {
        const map = new Map<string, number>();
        for (const it of order.items ?? []) {
            const assetId = it?.order_item?.asset_id;
            if (!assetId) continue;
            map.set(assetId, (map.get(assetId) ?? 0) + (Number(it.order_item.quantity) || 0));
        }
        return map;
    }, [order.items]);

    const maxByItemId = useMemo(() => {
        const out: Record<string, number> = {};
        for (const it of order.items ?? []) {
            const oid = it?.order_item?.id;
            const assetId = it?.order_item?.asset_id;
            if (!oid || !assetId) continue;
            if (!availByAssetId.has(assetId)) continue; // unknown → unbounded
            out[oid] =
                (availByAssetId.get(assetId) ?? 0) + (originalBookedByAssetId.get(assetId) ?? 0);
        }
        return out;
    }, [order.items, availByAssetId, originalBookedByAssetId]);

    const maxByAssetId = useMemo(() => {
        const out: Record<string, number> = {};
        for (const add of draft.stagedAdds) {
            if (availByAssetId.has(add.asset_id))
                out[add.asset_id] = availByAssetId.get(add.asset_id) ?? 0;
        }
        return out;
    }, [draft.stagedAdds, availByAssetId]);

    // Lead-time floor for the date input min (checkout's calculateMinDate).
    const calculateMinDate = (): string | undefined => {
        if (!feasibilityConfig) return undefined;
        const leadHours = feasibilityConfig.minimum_lead_hours ?? 24;
        const date = new Date();
        date.setTime(date.getTime() + leadHours * 60 * 60 * 1000);
        if (feasibilityConfig.exclude_weekends) {
            const weekendDays = new Set(feasibilityConfig.weekend_days ?? [0, 6]);
            while (weekendDays.has(date.getDay())) {
                date.setDate(date.getDate() + 1);
            }
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // ---- open / cancel / save plumbing ----

    const openSection = (key: SectionKey) => {
        setDraft(buildDraft(order));
        setBandError(null);
        setOpen(key);
    };

    const cancelSection = () => {
        setOpen(null);
        setBandError(null);
        setDraft(buildDraft(order));
    };

    // Mirror checkout's hard rule: a required permit with UNKNOWN owner is
    // ambiguous and must be resolved before saving — but ONLY when the payload
    // actually carries permit_requirements (the save-gate fix). Preserved.
    const permitInvalid =
        "permit_requirements" in payload &&
        draft.descriptive.permit.requires_permit &&
        draft.descriptive.permit.permit_owner === "UNKNOWN";

    // Block save when the edited dates/items aren't feasible (checkout's Next gate).
    const feasibilityBlocks = feasibility.userDateFeasible === false;

    const hasChanges = Object.keys(payload).length > 0;

    const saveSection = async (section: SectionKey | "items") => {
        if (!hasChanges) {
            toast.info("No changes to save.");
            return;
        }
        if (permitInvalid) {
            const msg = "Please choose who arranges the permit before saving.";
            setBandError(msg);
            toast.error(msg);
            return;
        }
        if (feasibilityBlocks) {
            const msg = "This event date is too soon for the selected items. Pick a later date.";
            setBandError(msg);
            toast.error(msg);
            return;
        }
        setBandError(null);
        try {
            const result = await updateOrder.mutateAsync(payload);
            const count = result?.changed_fields?.length ?? Object.keys(payload).length;
            if (result?.status_reverted) {
                toast.success(
                    `Saved ${count} change${count === 1 ? "" : "s"}. The quote was withdrawn for re-review.`
                );
            } else {
                toast.success(`Saved ${count} change${count === 1 ? "" : "s"}.`);
            }
            if (section !== "items") setOpen(null);
        } catch (error) {
            const e = error as Error & { code?: string; status?: number };
            const message = e?.message || "Failed to save changes";
            if (EDIT_ERROR_CODES.has(e?.code ?? "") || e?.status === 409 || e?.status === 400) {
                setBandError(message);
            }
            toast.error(message);
        }
    };

    const saving = updateOrder.isPending;

    // PermitSection (checkout-identical) <-> PermitDraft bridge. The draft owns
    // the canonical permit state; PermitSection works in its own value shape, so
    // we adapt both directions. `permit_decision` is derived from requires_permit
    // (a pre-existing order has a concrete yes/no, never null) and venue access
    // notes are co-located with the permit block here (as in checkout).
    const permitSectionValue: PermitSectionValue = {
        permit_decision: draft.descriptive.permit.requires_permit ? "yes" : "no",
        requires_permit: draft.descriptive.permit.requires_permit,
        permit_owner: draft.descriptive.permit.permit_owner,
        requires_vehicle_docs: draft.descriptive.permit.requires_vehicle_docs,
        requires_staff_ids: draft.descriptive.permit.requires_staff_ids,
        permit_notes: draft.descriptive.permit.notes,
        venue_access_notes: draft.descriptive.venue_access_notes,
    };

    const applyPermitPatch = (patch: Partial<PermitSectionValue>) => {
        setDraft((prev) => {
            const next = { ...prev, descriptive: { ...prev.descriptive } };
            const permit = { ...prev.descriptive.permit };
            if (patch.requires_permit !== undefined) permit.requires_permit = patch.requires_permit;
            if (patch.permit_owner !== undefined) permit.permit_owner = patch.permit_owner;
            if (patch.requires_vehicle_docs !== undefined)
                permit.requires_vehicle_docs = patch.requires_vehicle_docs;
            if (patch.requires_staff_ids !== undefined)
                permit.requires_staff_ids = patch.requires_staff_ids;
            if (patch.permit_notes !== undefined) permit.notes = patch.permit_notes;
            next.descriptive.permit = permit;
            if (patch.venue_access_notes !== undefined)
                next.descriptive.venue_access_notes = patch.venue_access_notes;
            return next;
        });
    };

    // --- read-mode resolved values from the order (source-of-truth view) ---
    const cityName = order.venue_city || order.venue_location?.city || "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {bandError && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{bandError}</span>
                </div>
            )}

            {/* Contact */}
            <SectionCard
                icon={<User className="w-4 h-4" />}
                title="Contact"
                editing={open === "contact"}
                onEdit={() => openSection("contact")}
                testId="order-section-contact"
            >
                {open === "contact" ? (
                    <>
                        <ContactEditor
                            value={draft.contact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    contact: { ...prev.contact, ...patch },
                                }))
                            }
                            disabled={saving}
                        />
                        <SectionFooter
                            onCancel={cancelSection}
                            onSave={() => saveSection("contact")}
                            saving={saving}
                            canSave={SECTION_KEYS.contact.some((k) => k in payload)}
                            testId="order-section-contact-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <ReadRow label="Name" value={order.contact_name} />
                        <ReadRow label="Email" value={order.contact_email} />
                        <ReadRow label="Phone" value={order.contact_phone} />
                    </div>
                )}
            </SectionCard>

            {/* Venue contact */}
            <SectionCard
                icon={<MapPin className="w-4 h-4" />}
                title="Venue Contact"
                editing={open === "venueContact"}
                onEdit={() => openSection("venueContact")}
                testId="order-section-venue-contact"
            >
                {open === "venueContact" ? (
                    <>
                        <VenueContactEditor
                            value={draft.venueContact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    venueContact: { ...prev.venueContact, ...patch },
                                }))
                            }
                            disabled={saving}
                        />
                        <SectionFooter
                            onCancel={cancelSection}
                            onSave={() => saveSection("venueContact")}
                            saving={saving}
                            canSave={SECTION_KEYS.venueContact.some((k) => k in payload)}
                            testId="order-section-venue-contact-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <ReadRow label="Name" value={order.venue_contact_name} />
                        <ReadRow label="Email" value={order.venue_contact_email} />
                        <ReadRow label="Phone" value={order.venue_contact_phone} />
                    </div>
                )}
            </SectionCard>

            {/* Venue & Logistics */}
            <SectionCard
                icon={<Building2 className="w-4 h-4" />}
                title="Venue & Logistics"
                editing={open === "descriptive"}
                onEdit={() => openSection("descriptive")}
                testId="order-section-descriptive"
            >
                {open === "descriptive" ? (
                    <>
                        <DescriptiveFieldsEditor
                            value={draft.descriptive}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    descriptive: { ...prev.descriptive, ...patch },
                                }))
                            }
                            disabled={saving}
                        />
                        <SectionFooter
                            onCancel={cancelSection}
                            onSave={() => saveSection("descriptive")}
                            saving={saving}
                            canSave={SECTION_KEYS.descriptive.some((k) => k in payload)}
                            testId="order-section-descriptive-save"
                        />
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ReadRow label="Venue Name" value={order.venue_name} />
                            <ReadRow label="City" value={cityName} />
                        </div>
                        <ReadRow label="Full Address" value={order.venue_location?.address} />
                        <ReadRow label="Special Instructions" value={order.special_instructions} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ReadRow
                                label="Permanent Placement"
                                value={order.is_permanent_placement ? "Yes" : "No"}
                            />
                            <ReadRow label="PO Number" value={order.po_number} />
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* Permit — renders the shared <PermitSection> (1:1 with checkout) */}
            <SectionCard
                icon={<FileText className="w-4 h-4" />}
                title="Permit / Access Coordination"
                editing={open === "permit"}
                onEdit={() => openSection("permit")}
                testId="order-section-permit"
            >
                {open === "permit" ? (
                    <>
                        <PermitSection
                            value={permitSectionValue}
                            onChange={applyPermitPatch}
                            companyName={companyName}
                            disabled={saving}
                        />
                        {draft.descriptive.permit.requires_permit &&
                            draft.descriptive.permit.permit_owner === "UNKNOWN" && (
                                <p
                                    role="alert"
                                    className="mt-3 text-xs font-medium text-destructive"
                                >
                                    Please choose who arranges the permit before saving.
                                </p>
                            )}
                        <SectionFooter
                            onCancel={cancelSection}
                            onSave={() => saveSection("permit")}
                            saving={saving}
                            canSave={
                                SECTION_KEYS.permit.some((k) => k in payload) && !permitInvalid
                            }
                            testId="order-section-permit-save"
                        />
                    </>
                ) : (
                    <div className="space-y-3">
                        <ReadRow
                            label="Permit Required"
                            value={order.permit_requirements?.requires_permit ? "Yes" : "No"}
                        />
                        {order.permit_requirements?.requires_permit && (
                            <ReadRow
                                label="Who Arranges"
                                value={
                                    order.permit_requirements.permit_owner === "CLIENT"
                                        ? `${companyName || "We"} will arrange it`
                                        : order.permit_requirements.permit_owner === "PLATFORM"
                                          ? "Ops will arrange it"
                                          : "Not decided yet"
                                }
                            />
                        )}
                        {order.permit_requirements?.notes && (
                            <ReadRow label="Permit Notes" value={order.permit_requirements.notes} />
                        )}
                        <ReadRow label="Access Notes" value={order.venue_location?.access_notes} />
                    </div>
                )}
            </SectionCard>

            {/* Event dates — gated by enable_event_date_inputs */}
            <SectionCard
                icon={<Calendar className="w-4 h-4" />}
                title="Event Dates"
                editing={open === "eventDates"}
                canEdit={eventDateInputsEnabled}
                onEdit={() => openSection("eventDates")}
                testId="order-section-event-dates"
            >
                {open === "eventDates" ? (
                    <>
                        <EventDatesInline
                            value={draft.eventDates}
                            minDate={calculateMinDate()}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    eventDates: { ...prev.eventDates, ...patch },
                                }))
                            }
                            disabled={saving}
                        />

                        {/* Feasibility helper + red alert — driven by edited dates +
                            items, exactly like checkout. */}
                        <div className="mt-4 space-y-3">
                            <FeasibilityHelper
                                helperEnabled={feasibilityHelperEnabled}
                                isLoading={feasibilityPreview.isLoading}
                                floorDate={feasibility.floorDate}
                                floorDatetime={feasibility.floorDatetime}
                                userEventDate={draft.eventDates.event_start_date}
                                userDateFeasible={feasibility.userDateFeasible}
                                blockingItems={feasibility.blockingItems}
                                config={feasibilityPreview.data?.config ?? null}
                                onUseFloorDate={() => {
                                    if (!feasibility.floorDate) return;
                                    const rounded = roundedFloorTimeInZone(
                                        feasibility.floorDatetime,
                                        feasibilityConfig?.timezone
                                    );
                                    const targetDate = rounded
                                        ? shiftDateStr(feasibility.floorDate, rounded.dayOffset)
                                        : feasibility.floorDate;
                                    setDraft((prev) => ({
                                        ...prev,
                                        eventDates: {
                                            ...prev.eventDates,
                                            event_start_date: targetDate,
                                        },
                                    }));
                                }}
                            />
                            <RedFeasibilityAlert
                                issues={feasibilityPreview.data?.issues ?? []}
                                hasChecked={
                                    !!feasibilityPreview.data && feasibilityItems.length > 0
                                }
                                isChecking={feasibilityPreview.isLoading}
                            />
                        </div>

                        <SectionFooter
                            onCancel={cancelSection}
                            onSave={() => saveSection("eventDates")}
                            saving={saving}
                            canSave={
                                SECTION_KEYS.eventDates.some((k) => k in payload) &&
                                !feasibilityBlocks
                            }
                            testId="order-section-event-dates-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ReadRow
                            label="Start"
                            value={
                                order.event_start_date
                                    ? new Date(order.event_start_date).toLocaleDateString()
                                    : ""
                            }
                        />
                        <ReadRow
                            label="End"
                            value={
                                order.event_end_date
                                    ? new Date(order.event_end_date).toLocaleDateString()
                                    : ""
                            }
                        />
                        {!eventDateInputsEnabled && (
                            <p className="sm:col-span-2 text-xs text-muted-foreground">
                                Event dates are managed by our team for this account.
                            </p>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* Items — ALWAYS inline (edited directly in the list). */}
            <SectionCard
                icon={<Package className="w-4 h-4" />}
                title="Items"
                editing={false}
                canEdit={false}
                onEdit={() => {}}
                testId="order-section-items"
            >
                <OrderItemsQuantityEditor
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
                            stagedAdds: prev.stagedAdds.filter((a) => a.asset_id !== assetId),
                        }))
                    }
                    maxByItemId={maxByItemId}
                    maxByAssetId={maxByAssetId}
                    disabled={saving}
                />

                {/* Save bar for item ops — only shown when there are item changes. */}
                {(draft.removedItemIds.length > 0 ||
                    draft.stagedAdds.length > 0 ||
                    Object.entries(draft.itemQuantities).some(
                        ([id, q]) => baseline.itemQuantities[id] !== q
                    )) && (
                    <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/40 pt-4">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    itemQuantities: baseline.itemQuantities,
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
                            onClick={() => saveSection("items")}
                            disabled={saving || !("items" in payload)}
                            className="font-mono gap-2"
                            data-testid="order-section-items-save"
                        >
                            <Check className="w-4 h-4" />
                            {saving ? "Saving..." : "Save item changes"}
                        </Button>
                    </div>
                )}
            </SectionCard>
        </motion.div>
    );
}

/**
 * Inline event-date inputs. Distinct from EventDatesEditor only in that it
 * threads the lead-time `minDate` onto the START input (checkout parity), since
 * EventDatesEditor doesn't take a min for start. End still floors at start.
 */
function EventDatesInline({
    value,
    minDate,
    onChange,
    disabled,
}: {
    value: EventDatesDraft;
    minDate?: string;
    onChange: (patch: Partial<EventDatesDraft>) => void;
    disabled?: boolean;
}) {
    const endBeforeStart =
        !!value.event_start_date &&
        !!value.event_end_date &&
        value.event_end_date < value.event_start_date;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Changing these re-checks asset availability for the new window. If stock isn&apos;t
                available for the dates you pick, we&apos;ll let you know when you save.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label
                        htmlFor="edit-event-start-date"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Event Start Date
                    </Label>
                    <Input
                        id="edit-event-start-date"
                        type="date"
                        data-testid="order-edit-event-start"
                        value={value.event_start_date}
                        onChange={(e) => onChange({ event_start_date: e.target.value })}
                        disabled={disabled}
                        min={minDate}
                        className="h-12 font-mono"
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="edit-event-end-date"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Event End Date
                    </Label>
                    <Input
                        id="edit-event-end-date"
                        type="date"
                        data-testid="order-edit-event-end"
                        value={value.event_end_date}
                        onChange={(e) => onChange({ event_end_date: e.target.value })}
                        disabled={disabled}
                        min={value.event_start_date || minDate}
                        className="h-12 font-mono"
                    />
                </div>
            </div>

            {endBeforeStart && (
                <p className="text-xs font-medium text-destructive">
                    The end date can&apos;t be before the start date.
                </p>
            )}
        </div>
    );
}
