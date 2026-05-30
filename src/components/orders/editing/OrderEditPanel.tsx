"use client";

/**
 * OrderEditPanel — order-editing feature, Phase 1 (descriptive fields only).
 *
 * View mode shows a single "Edit Details" affordance; entering edit mode reveals
 * controlled editors for contact, venue contact, and descriptive fields. On save
 * it diffs the working draft against the original snapshot and sends ONLY the
 * changed keys to PATCH /client/v1/order/:id (one endpoint serves owner AND
 * company-manager scope). No optimistic mutation — a successful save invalidates
 * the detail query and the refetch drives the UI.
 *
 * The parent gates rendering on the editable band + scope; this panel assumes it
 * should only render when editing is permitted. `job_number` is never touched.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, X, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUpdateOrderDetails, type OrderEditPayload } from "@/hooks/use-order-editing";
import { ContactEditor, type ContactDraft } from "./ContactEditor";
import { VenueContactEditor, type VenueContactDraft } from "./VenueContactEditor";
import {
    DescriptiveFieldsEditor,
    type DescriptiveDraft,
    type PermitDraft,
} from "./DescriptiveFieldsEditor";
import { EventDatesEditor, type EventDatesDraft } from "./EventDatesEditor";

// Shape we read off the order detail response (snake_case, as returned by the API).
interface OrderForEdit {
    id: string;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    venue_contact_name?: string | null;
    venue_contact_email?: string | null;
    venue_contact_phone?: string | null;
    venue_name?: string | null;
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
    // ISO date/datetime strings as returned by the API.
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
}

const s = (v: string | null | undefined) => v ?? "";

// Normalise an ISO date/datetime string from the API to "YYYY-MM-DD" for the
// native date input. Returns "" when absent/unparseable.
const toDateInput = (v: string | null | undefined): string => {
    if (!v) return "";
    // Fast path: already date-only or an ISO datetime — take the leading 10 chars.
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
    if (m) return m[1];
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
};

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
    };
}

// Convert an editor string to the wire value: empty string → null for nullable
// fields so a cleared field is actually cleared server-side.
const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

/**
 * Diff the draft against the original and emit ONLY changed, allowlisted keys.
 * Venue contact goes as top-level columns; venue address/access_notes are nested
 * under venue_location; permit fields are nested under permit_requirements.
 */
function diffPayload(original: Draft, next: Draft): OrderEditPayload {
    const body: OrderEditPayload = {};

    // Contact (required fields — send trimmed value, not null)
    if (next.contact.contact_name.trim() !== original.contact.contact_name.trim())
        body.contact_name = next.contact.contact_name.trim();
    if (next.contact.contact_email.trim() !== original.contact.contact_email.trim())
        body.contact_email = next.contact.contact_email.trim();
    if (next.contact.contact_phone.trim() !== original.contact.contact_phone.trim())
        body.contact_phone = next.contact.contact_phone.trim();

    // Venue contact (nullable, top-level)
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

    // Descriptive
    const d = next.descriptive;
    const o = original.descriptive;
    if (d.venue_name.trim() !== o.venue_name.trim()) body.venue_name = d.venue_name.trim();
    if (d.venue_city_id && d.venue_city_id !== o.venue_city_id)
        body.venue_city_id = d.venue_city_id;

    // venue_location: only send if address or access_notes changed.
    const addressChanged = d.venue_address.trim() !== o.venue_address.trim();
    const accessNotesChanged = d.venue_access_notes.trim() !== o.venue_access_notes.trim();
    if (addressChanged || accessNotesChanged) {
        body.venue_location = {
            address: d.venue_address.trim(),
            access_notes: d.venue_access_notes.trim(),
        };
    }

    if (d.special_instructions.trim() !== o.special_instructions.trim())
        body.special_instructions = nullable(d.special_instructions);

    if (d.is_permanent_placement !== o.is_permanent_placement)
        body.is_permanent_placement = d.is_permanent_placement;

    if (d.po_number.trim() !== o.po_number.trim()) body.po_number = nullable(d.po_number);

    // permit_requirements: send the full object if any permit sub-field changed.
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
            // Turning permits off clears the whole block.
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

    // Event dates: compared as "YYYY-MM-DD"; sent as ISO date-only strings so a
    // full calendar-day edit re-derives the booking window server-side.
    const ed = next.eventDates;
    const oed = original.eventDates;
    if (ed.event_start_date && ed.event_start_date !== oed.event_start_date)
        body.event_start_date = ed.event_start_date;
    if (ed.event_end_date && ed.event_end_date !== oed.event_end_date)
        body.event_end_date = ed.event_end_date;

    return body;
}

export function OrderEditPanel({ order }: { order: OrderForEdit }) {
    const [isEditing, setIsEditing] = useState(false);
    const [bandError, setBandError] = useState<string | null>(null);
    const updateOrder = useUpdateOrderDetails(order.id);

    // Snapshot the order at the moment edit mode opens. Memoised on the order
    // identity + version so an external refetch reseeds the baseline in view mode.
    const baseline = useMemo(() => buildDraft(order), [order]);
    const [draft, setDraft] = useState<Draft>(baseline);

    const openEdit = () => {
        setDraft(buildDraft(order));
        setBandError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setBandError(null);
        setDraft(buildDraft(order));
    };

    const payload = useMemo(() => diffPayload(baseline, draft), [baseline, draft]);
    const hasChanges = Object.keys(payload).length > 0;

    const handleSave = async () => {
        if (!hasChanges) {
            toast.info("No changes to save.");
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
            setIsEditing(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save changes";
            // The API returns 409 (with a descriptive message) when the order has
            // left the editable band, OR when the new event dates lack asset
            // availability. Surface either inline as well as via toast.
            if (/editable|locked|confirmed|availability|available|409/i.test(message)) {
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
                                Order Details
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Update contact, venue, permits and instructions before your order is
                                confirmed.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={openEdit}
                        variant="outline"
                        className="font-mono gap-2 shrink-0"
                        data-testid="order-edit-open"
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
                data-testid="order-edit-panel"
            >
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        <h3 className="font-bold font-mono text-sm uppercase tracking-wide">
                            Edit Order Details
                        </h3>
                    </div>
                    <Button
                        onClick={cancelEdit}
                        variant="ghost"
                        size="icon"
                        disabled={updateOrder.isPending}
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
                            Contact
                        </h4>
                        <ContactEditor
                            value={draft.contact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    contact: { ...prev.contact, ...patch },
                                }))
                            }
                            disabled={updateOrder.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Venue Contact
                        </h4>
                        <VenueContactEditor
                            value={draft.venueContact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    venueContact: { ...prev.venueContact, ...patch },
                                }))
                            }
                            disabled={updateOrder.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Venue &amp; Logistics
                        </h4>
                        <DescriptiveFieldsEditor
                            value={draft.descriptive}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    descriptive: { ...prev.descriptive, ...patch },
                                }))
                            }
                            disabled={updateOrder.isPending}
                        />
                    </section>

                    <Separator />

                    <section>
                        <h4 className="font-mono uppercase text-xs tracking-wide text-muted-foreground mb-3">
                            Event Dates
                        </h4>
                        <EventDatesEditor
                            value={draft.eventDates}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    eventDates: { ...prev.eventDates, ...patch },
                                }))
                            }
                            disabled={updateOrder.isPending}
                        />
                    </section>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={updateOrder.isPending}
                        className="font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateOrder.isPending || !hasChanges}
                        className="font-mono gap-2"
                        data-testid="order-edit-save"
                    >
                        <Save className="w-4 h-4" />
                        {updateOrder.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}
