"use client";

/**
 * OrderEventDatesSection — the Event-Dates card EDITOR body for in-place order
 * editing. Composes the dumb <EventDatesEditor> (start/end inputs) with the
 * checkout feasibility cluster (<FeasibilityHelper> + <RedFeasibilityAlert>),
 * driven by the feasibility companion's `helperProps`.
 *
 * Lifted VERBATIM from the Event-Dates branch of OrderDetailEdit.tsx (the inline
 * <EventDatesEditor> + the `mt-4 space-y-3` feasibility block). Nothing is
 * rebuilt — it is the same JSX, now fed by `value`/`onChange` (the controller's
 * section binding draft/patch) + `helperProps` (the feasibility wiring) instead of
 * the monolith's local state. The "use floor date" affordance patches the draft's
 * event_start_date exactly as before.
 *
 * LIGHT MODE ONLY.
 */

import { FeasibilityHelper } from "@/components/checkout/FeasibilityHelper";
import { RedFeasibilityAlert } from "@/components/checkout/RedFeasibilityAlert";
import { roundedFloorTimeInZone, shiftDateStr } from "@/lib/feasibility/compose-datetime";
import { EventDatesEditor, type EventDatesDraft } from "./EventDatesEditor";
import type { FeasibilityHelperProps } from "@/hooks/use-order-edit-feasibility";

export function OrderEventDatesSection({
    value,
    minDate,
    onChange,
    disabled,
    helperProps,
}: {
    value: EventDatesDraft;
    minDate?: string;
    onChange: (patch: Partial<EventDatesDraft>) => void;
    disabled?: boolean;
    helperProps: FeasibilityHelperProps;
}) {
    return (
        <>
            <EventDatesEditor
                value={value}
                minDate={minDate}
                onChange={onChange}
                disabled={disabled}
            />

            {/* Feasibility helper + red alert — driven by edited dates + items,
                exactly like checkout. */}
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
                        onChange({ event_start_date: targetDate });
                    }}
                />
                <RedFeasibilityAlert
                    issues={helperProps.issues}
                    hasChecked={helperProps.hasChecked}
                    isChecking={helperProps.isChecking}
                />
            </div>
        </>
    );
}
