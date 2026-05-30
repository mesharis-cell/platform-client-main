"use client";

/**
 * Pickup-window editor (order-editing Phase 4, self-pickup). Captures the pickup
 * window start + end and an optional expected-return datetime. Uses native
 * <input type="datetime-local"> because the SP pickup window carries a
 * time-of-day (the detail page renders it with toLocaleString()), unlike the
 * order event-date editor which is calendar-day only.
 *
 * Editing these re-derives the asset booking window server-side; insufficient
 * availability returns 409 with a descriptive message which the panel surfaces
 * inline. The server is authoritative on availability.
 *
 * Drafts hold "YYYY-MM-DDTHH:mm" strings (or "" when absent). The panel converts
 * them to ISO on the wire and only sends the keys that changed. Expected return
 * is clearable — an empty draft sends `null`.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface PickupWindowDraft {
    pickup_start: string; // "YYYY-MM-DDTHH:mm" or ""
    pickup_end: string; // "YYYY-MM-DDTHH:mm" or ""
    expected_return_at: string; // "YYYY-MM-DDTHH:mm" or "" (cleared)
}

export function PickupWindowEditor({
    value,
    onChange,
    disabled,
}: {
    value: PickupWindowDraft;
    onChange: (patch: Partial<PickupWindowDraft>) => void;
    disabled?: boolean;
}) {
    // Client-side guard only: end must not precede start. Server is authoritative.
    const endBeforeStart =
        !!value.pickup_start && !!value.pickup_end && value.pickup_end < value.pickup_start;
    const returnBeforeStart =
        !!value.expected_return_at &&
        !!value.pickup_start &&
        value.expected_return_at < value.pickup_start;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Changing your pickup window re-checks asset availability for the new dates. If stock
                isn&apos;t available we&apos;ll let you know when you save.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label
                        htmlFor="sp-edit-pickup-start"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Pickup Start
                    </Label>
                    <Input
                        id="sp-edit-pickup-start"
                        type="datetime-local"
                        data-testid="sp-edit-pickup-start"
                        value={value.pickup_start}
                        onChange={(e) => onChange({ pickup_start: e.target.value })}
                        disabled={disabled}
                        className="h-12 font-mono"
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="sp-edit-pickup-end"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Pickup End
                    </Label>
                    <Input
                        id="sp-edit-pickup-end"
                        type="datetime-local"
                        data-testid="sp-edit-pickup-end"
                        value={value.pickup_end}
                        onChange={(e) => onChange({ pickup_end: e.target.value })}
                        disabled={disabled}
                        min={value.pickup_start || undefined}
                        className="h-12 font-mono"
                    />
                </div>
            </div>

            {endBeforeStart && (
                <p className="text-xs font-medium text-destructive">
                    The pickup end can&apos;t be before the start.
                </p>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <Label
                        htmlFor="sp-edit-expected-return"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Expected Return
                        <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                            (optional)
                        </span>
                    </Label>
                    {value.expected_return_at && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onChange({ expected_return_at: "" })}
                            disabled={disabled}
                            className="h-7 px-2 text-xs font-mono text-muted-foreground"
                            data-testid="sp-edit-expected-return-clear"
                        >
                            Clear
                        </Button>
                    )}
                </div>
                <Input
                    id="sp-edit-expected-return"
                    type="datetime-local"
                    data-testid="sp-edit-expected-return"
                    value={value.expected_return_at}
                    onChange={(e) => onChange({ expected_return_at: e.target.value })}
                    disabled={disabled}
                    min={value.pickup_start || undefined}
                    className="h-12 font-mono"
                />
                {returnBeforeStart && (
                    <p className="text-xs font-medium text-destructive">
                        The expected return can&apos;t be before the pickup start.
                    </p>
                )}
            </div>
        </div>
    );
}
