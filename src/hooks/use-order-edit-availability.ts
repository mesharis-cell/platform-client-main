"use client";

/**
 * useOrderEditAvailability — availability-bounds companion for the order-edit
 * controller.
 *
 * Lifted VERBATIM from the availability-bounds derivation block inside
 * OrderDetailEdit.tsx (the `availabilityItems` → `maxByItemId`/`maxByAssetId`
 * span; design doc §3 / §6 / §1.1).
 *
 * Data-flow (§1.1): runs AFTER the controller is constructed — it reads the
 * controller's LIVE `draft` (+ the order snapshot + flags) and returns the
 * `AvailabilityWiring` shape, which the page pushes back via
 * `controller.setWiring({ availability })`. The controller's items binding reads
 * `maxByItemId`/`maxByAssetId` from that wiring (absent → unbounded).
 *
 * Bounds rationale (verbatim):
 *   - `available_quantity` is net of ALL active bookings INCLUDING this order's,
 *     so for an existing row max = available + that row's own ORIGINAL booked qty
 *     (a decrease / no-op isn't falsely flagged).
 *   - For a staged add, max = available (no own booking yet).
 */

import { useMemo } from "react";
import { useAvailabilityPreview } from "@/hooks/use-availability-preview";
import {
    toDateInput,
    type Draft,
    type OrderForEdit,
} from "@/components/orders/editing/order-edit-contract";
import type { AvailabilityWiring } from "@/hooks/use-editable-entity";
import type { OrderEditFlags } from "@/hooks/use-order-edit-feasibility";

export function useOrderEditAvailability(
    draft: Draft,
    order: OrderForEdit,
    flags: OrderEditFlags
): AvailabilityWiring {
    const { eventDateInputsEnabled } = flags;

    const itemAssetIdByOrderItemId = useMemo(() => {
        const map = new Map<string, string>();
        for (const it of order.items ?? []) {
            if (it?.order_item?.id && it.order_item.asset_id) {
                map.set(it.order_item.id, it.order_item.asset_id);
            }
        }
        return map;
    }, [order.items]);

    const effectiveEventStart = eventDateInputsEnabled
        ? draft.eventDates.event_start_date
        : toDateInput(order.event_start_date);

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

    // Stabilize the wiring object itself. `maxByItemId`/`maxByAssetId` are already
    // memoized, but the page feeds this return straight into
    // `controller.setWiring(...)` from a `useEffect` — a fresh wrapper object every
    // render would re-run that effect every render and spin the feedback loop. The
    // controller's guard deep-compares the records, but stabilizing the wrapper too
    // keeps the effect from firing needlessly.
    return useMemo<AvailabilityWiring>(
        () => ({ maxByItemId, maxByAssetId }),
        [maxByItemId, maxByAssetId]
    );
}
