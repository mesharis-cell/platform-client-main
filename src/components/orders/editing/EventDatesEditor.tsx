"use client";

/**
 * Event-dates editor (order-editing P3). Captures the event start + end dates
 * as full calendar days (native <input type="date">, mirroring the checkout
 * event-date fields). Controlled by the parent OrderEditPanel.
 *
 * Editing these re-derives the asset booking window server-side; if the new
 * dates lack availability the API returns 409 with a descriptive message which
 * the panel surfaces inline. Full date edits are intended here (no time-only /
 * day-lock restriction) — the server is authoritative on availability.
 *
 * Drafts hold "YYYY-MM-DD" strings (or "" when absent). The panel converts them
 * to ISO on the wire and only sends the keys that changed.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EventDatesDraft {
    event_start_date: string; // "YYYY-MM-DD" or ""
    event_end_date: string; // "YYYY-MM-DD" or ""
}

export function EventDatesEditor({
    value,
    onChange,
    disabled,
}: {
    value: EventDatesDraft;
    onChange: (patch: Partial<EventDatesDraft>) => void;
    disabled?: boolean;
}) {
    // Client-side guard only: end must not precede start. The server is
    // authoritative and 409s on availability — this is purely a friendly hint.
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
                        min={value.event_start_date || undefined}
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
