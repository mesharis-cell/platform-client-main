"use client";

/**
 * order-edit-contract — the LOGIC-ONLY save contract for client order editing.
 *
 * Lifted VERBATIM out of OrderDetailEdit.tsx (Phase 0 extraction). Nothing here
 * is rebuilt — `buildDraft`, `diffPayload`, `SECTION_KEYS`, and `EDIT_ERROR_CODES`
 * are byte-for-byte the same functions/values that lived inline in the monolith,
 * so the existing save behavior is preserved exactly:
 *
 *   - One shared working `Draft` is built from the order snapshot (the baseline).
 *   - `diffPayload(baseline, draft, originalVenueLocation)` emits ONLY changed,
 *     allowlisted keys. The 3rd arg is `order.venue_location` (NOT the whole
 *     entity) — see the design doc §1.1.
 *   - `SECTION_KEYS` scopes which payload keys belong to which section, so the
 *     single-open invariant yields a clean per-section diff.
 *   - `EDIT_ERROR_CODES` is the machine-readable set of edit-flow error codes the
 *     API returns; the controller maps these onto the inline band error.
 *
 * The controller hook (`use-editable-entity`) and the companion feasibility /
 * availability hooks consume these; `OrderDetailEdit` re-imports them so it keeps
 * compiling + rendering identically until Phase 1 rewires the page.
 */

import type { OrderEditPayload } from "@/hooks/use-order-editing";
import type { ContactDraft } from "./ContactEditor";
import type { VenueContactDraft } from "./VenueContactEditor";
import type { DescriptiveDraft, PermitDraft } from "./DescriptiveFieldsEditor";
import type {
    ItemQuantitiesDraft,
    QuantityEditorItem,
    StagedAdd,
} from "./OrderItemsQuantityEditor";

// Re-export the payload type so consumers can import the whole contract from one
// place (the controller config is generic over TPayload = OrderEditPayload).
export type { OrderEditPayload } from "@/hooks/use-order-editing";

// Machine-readable error codes the API returns on edit-flow failures.
export const EDIT_ERROR_CODES = new Set([
    "EDIT_NOT_EDITABLE",
    "INSUFFICIENT_AVAILABILITY",
    "LAST_ITEM",
    "MAINTENANCE_ASSET",
    "TRANSFORMED_ASSET",
    "CROSS_COMPANY",
]);

// One physical order item as returned by the order detail response.
export interface OrderForEditItem {
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

export interface OrderForEdit {
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

export interface EventDatesDraft {
    event_start_date: string; // "YYYY-MM-DD" or ""
    event_end_date: string;
}

export interface Draft {
    contact: ContactDraft;
    venueContact: VenueContactDraft;
    descriptive: DescriptiveDraft;
    eventDates: EventDatesDraft;
    itemQuantities: ItemQuantitiesDraft;
    removedItemIds: string[];
    stagedAdds: StagedAdd[];
}

export type SectionKey = "contact" | "venueContact" | "descriptive" | "permit" | "eventDates";

const s = (v: string | null | undefined) => v ?? "";

export const toDateInput = (v: string | null | undefined): string => {
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

export function buildItemRows(order: OrderForEdit): QuantityEditorItem[] {
    return (order.items ?? [])
        .filter((it) => !!it?.order_item?.id)
        .map((it) => ({ id: it.order_item.id, name: it.order_item.asset_name }));
}

export function buildItemQuantities(order: OrderForEdit): ItemQuantitiesDraft {
    const map: ItemQuantitiesDraft = {};
    for (const it of order.items ?? []) {
        if (it?.order_item?.id) map[it.order_item.id] = Number(it.order_item.quantity) || 1;
    }
    return map;
}

export function buildDraft(order: OrderForEdit): Draft {
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
 *
 * Signature is (baseline, next, diffCtx=originalVenueLocation) — the 3rd arg is
 * the entity-supplied extra (`order.venue_location`), forwarded by the controller
 * as `diffCtx` so this lift stays byte-identical (design doc §1.1).
 */
export function diffPayload(
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
export const SECTION_KEYS: Record<SectionKey, (keyof OrderEditPayload)[]> = {
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
