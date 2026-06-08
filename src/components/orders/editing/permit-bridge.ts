"use client";

/**
 * permit-bridge — PermitSection <-> Draft adapter for order editing.
 *
 * Lifted VERBATIM out of OrderDetailEdit.tsx (Phase 1 extraction; design doc §6).
 * The draft owns the canonical permit state (`draft.descriptive.permit` +
 * `draft.descriptive.venue_access_notes`), but the shared <PermitSection> works in
 * its own value shape, so these two functions adapt both directions:
 *
 *   - `permitSectionValue(draft)` projects the draft into a PermitSectionValue.
 *     `permit_decision` is derived from `requires_permit` (a pre-existing order has
 *     a concrete yes/no, never null); `venue_access_notes` is co-located with the
 *     permit block here (exactly as in checkout).
 *   - `applyPermitPatch(prev, patch)` folds a PermitSection patch back onto the
 *     draft, touching only the permit sub-object + the co-located access notes.
 *
 * Nothing here is rebuilt — byte-identical to the inline monolith versions, so the
 * permit save behavior is preserved exactly.
 */

import type { PermitSectionValue } from "@/components/permits/PermitSection";
import type { Draft } from "./order-edit-contract";

export function permitSectionValue(draft: Draft): PermitSectionValue {
    return {
        permit_decision: draft.descriptive.permit.requires_permit ? "yes" : "no",
        requires_permit: draft.descriptive.permit.requires_permit,
        permit_owner: draft.descriptive.permit.permit_owner,
        requires_vehicle_docs: draft.descriptive.permit.requires_vehicle_docs,
        requires_staff_ids: draft.descriptive.permit.requires_staff_ids,
        permit_notes: draft.descriptive.permit.notes,
        venue_access_notes: draft.descriptive.venue_access_notes,
    };
}

export function applyPermitPatch(prev: Draft, patch: Partial<PermitSectionValue>): Draft {
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
}
