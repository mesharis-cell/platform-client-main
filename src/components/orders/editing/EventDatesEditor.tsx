"use client";

/**
 * EventDatesEditor (client) — inline event start/end date inputs for order edit.
 *
 * Extracted VERBATIM from the inline `EventDatesInline` that lived inside
 * OrderDetailEdit.tsx (Phase 0; design doc §6 / LOW-9). Distinct from a plain
 * dates editor only in that it threads the lead-time `minDate` onto the START
 * input (checkout parity); the END input floors at the picked start.
 *
 * Dumb controlled component: `{ value, minDate, onChange, disabled }`. The
 * controller's section binding supplies `value` (draft) + `onChange` (patch).
 *
 * NOTE (design doc §3 / LOW-9): admin already has its own `EventDatesEditor.tsx`
 * twin. These reconcile into the hand-synced canonical set later; for now this is
 * a client-local extraction so the client monolith can drop the inline copy.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventDatesDraft } from "./order-edit-contract";

export type { EventDatesDraft } from "./order-edit-contract";

export function EventDatesEditor({
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
