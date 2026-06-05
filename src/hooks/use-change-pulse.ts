"use client";
/* global globalThis */

/**
 * useChangePulse — a purely client-side "new activity" indicator for an order's
 * change-history surface (the Order Timeline). NO backend.
 *
 * Stores, per order id in localStorage, the timestamp of the latest change the
 * user has SEEN. When the order's latest change entry is newer than that stored
 * value, `showPulse` is true (render a pulsing dot). Calling `markSeen()` writes
 * the current latest timestamp, clearing the pulse — until a newer edit lands,
 * at which point it reappears.
 *
 * `latestChangeAt` is the ISO timestamp of the most recent history entry (or
 * null when there's no history). The caller passes whatever it considers the
 * change-history stream — typically the order_status_history entries.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "kadence:order-change-seen:";

/** SSR-safe localStorage handle (matches the cart-storage indirection pattern). */
function getStorage(): Storage | undefined {
    const runtimeGlobal =
        typeof globalThis !== "undefined"
            ? (globalThis as unknown as Record<string, unknown>)
            : undefined;
    return runtimeGlobal?.["localStorage"] as Storage | undefined;
}

function readSeen(orderId: string): string | null {
    const storage = getStorage();
    if (!storage) return null;
    try {
        return storage.getItem(STORAGE_PREFIX + orderId);
    } catch {
        return null;
    }
}

function writeSeen(orderId: string, value: string): void {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.setItem(STORAGE_PREFIX + orderId, value);
    } catch {
        // Ignore quota / privacy-mode failures — the pulse is a nicety, not load-bearing.
    }
}

export function useChangePulse(orderId: string | null | undefined, latestChangeAt: string | null) {
    const [seenAt, setSeenAt] = useState<string | null>(null);

    // Read the persisted "last seen" once we have an order id (client-only).
    useEffect(() => {
        if (!orderId) return;
        setSeenAt(readSeen(orderId));
    }, [orderId]);

    const showPulse =
        !!latestChangeAt &&
        (seenAt === null || new Date(latestChangeAt).getTime() > new Date(seenAt).getTime());

    const markSeen = useCallback(() => {
        if (!orderId || !latestChangeAt) return;
        writeSeen(orderId, latestChangeAt);
        setSeenAt(latestChangeAt);
    }, [orderId, latestChangeAt]);

    return { showPulse, markSeen };
}
