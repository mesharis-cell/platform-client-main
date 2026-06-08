"use client";

/**
 * useOrderEditFeasibility — feasibility companion for the order-edit controller.
 *
 * Lifted VERBATIM from the feasibility derivation block that lived inside
 * OrderDetailEdit.tsx (~the `useFeasibilityConfig` → `interpretFeasibilityPreview`
 * span + the `calculateMinDate` lead-time floor; design doc §3 / §6 / §1.1).
 *
 * Data-flow (§1.1): this runs AFTER the controller is constructed — it reads the
 * controller's LIVE `draft` (+ the order snapshot + flags) and returns the
 * `FeasibilityWiring` verdict, which the page then pushes back into the
 * controller via `controller.setWiring({ feasibility })`. It is NOT a controller
 * construction input (that would be a forward reference to the draft the
 * controller hasn't created yet).
 *
 * `helperProps` carries everything the <FeasibilityHelper>/<RedFeasibilityAlert>
 * cluster needs so the dates card can render the advisory UI without re-deriving.
 */

import { useMemo } from "react";
import {
    useFeasibility,
    useFeasibilityConfig,
    interpretFeasibilityPreview,
    type MaintenanceDecision,
    type MaintenanceFeasibilityIssue,
} from "@/hooks/use-feasibility-check";
import { composeZonedISO } from "@/lib/feasibility/compose-datetime";
import {
    toDateInput,
    type Draft,
    type OrderForEdit,
} from "@/components/orders/editing/order-edit-contract";
import type { FeasibilityWiring } from "@/hooks/use-editable-entity";

export interface OrderEditFlags {
    eventDateInputsEnabled: boolean;
    feasibilityHelperEnabled: boolean;
}

/** What the Event-Dates card needs to render the helper + red alert cluster. */
export interface FeasibilityHelperProps {
    helperEnabled: boolean;
    isLoading: boolean;
    floorDate: string | null;
    floorDatetime: string | null;
    userEventDate: string;
    userDateFeasible: boolean | null;
    blockingItems: MaintenanceFeasibilityIssue[];
    config: NonNullable<ReturnType<typeof useFeasibility>["data"]>["config"] | null;
    issues: MaintenanceFeasibilityIssue[];
    hasChecked: boolean;
    isChecking: boolean;
    /** The earliest feasible ISO datetime, for the "use floor date" affordance. */
    floorDatetimeForUseDate: string | null;
    /** Platform timezone (for rounding the floor moment to a wall-clock date). */
    timezone?: string;
}

export interface OrderEditFeasibilityWiring extends FeasibilityWiring {
    helperProps: FeasibilityHelperProps;
}

export function useOrderEditFeasibility(
    draft: Draft,
    order: OrderForEdit,
    flags: OrderEditFlags
): OrderEditFeasibilityWiring {
    const { eventDateInputsEnabled, feasibilityHelperEnabled } = flags;

    const { data: feasibilityConfig } = useFeasibilityConfig();

    // Build the asset_id → order_item_id helper map (verbatim).
    const itemAssetIdByOrderItemId = useMemo(() => {
        const map = new Map<string, string>();
        for (const it of order.items ?? []) {
            if (it?.order_item?.id && it.order_item.asset_id) {
                map.set(it.order_item.id, it.order_item.asset_id);
            }
        }
        return map;
    }, [order.items]);

    // Effective edited event start: the draft date when the flag is on, else the
    // order's existing start. We use the START date + a neutral midday wall-clock
    // so the floor comparison matches the server and a same-day floor doesn't trip
    // purely on time-of-day.
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

    // Feasibility item set = surviving existing rows (not pending-removal) +
    // staged adds (with their picker maintenance decision). Mirrors checkout.
    const feasibilityItems = useMemo(() => {
        const out: Array<{
            asset_id: string;
            maintenance_decision?: MaintenanceDecision;
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

    // Lead-time floor for the date input min (checkout's calculateMinDate). Verbatim.
    const minDate = useMemo<string | undefined>(() => {
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
    }, [feasibilityConfig]);

    const helperProps: FeasibilityHelperProps = {
        helperEnabled: feasibilityHelperEnabled,
        isLoading: feasibilityPreview.isLoading,
        floorDate: feasibility.floorDate,
        floorDatetime: feasibility.floorDatetime,
        userEventDate: draft.eventDates.event_start_date,
        userDateFeasible: feasibility.userDateFeasible,
        blockingItems: feasibility.blockingItems,
        config: feasibilityPreview.data?.config ?? null,
        issues: feasibilityPreview.data?.issues ?? [],
        hasChecked: !!feasibilityPreview.data && feasibilityItems.length > 0,
        isChecking: feasibilityPreview.isLoading,
        floorDatetimeForUseDate: feasibility.floorDatetime,
        timezone: feasibilityConfig?.timezone,
    };

    return {
        userDateFeasible: feasibility.userDateFeasible,
        blocks: feasibility.userDateFeasible === false,
        minDate,
        helperProps,
    };
}
