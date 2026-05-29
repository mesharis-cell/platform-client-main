/**
 * Canonical order-status → badge config for client-side lists.
 * Mirrors ORDER_STATUS_CONFIG in app/my-orders/page.tsx (kept in sync) so the
 * Company Back Office tables show the exact same colors as the rest of the
 * portal. Tailwind 100/700/300 family per the house convention.
 */
export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300" },
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "Pricing Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    QUOTED: { label: "Quoted", color: "bg-purple-100 text-purple-700 border-purple-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    IN_PREPARATION: { label: "In Preparation", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    READY_FOR_DELIVERY: { label: "Ready", color: "bg-sky-100 text-sky-700 border-sky-300" },
    IN_TRANSIT: { label: "In Transit", color: "bg-violet-100 text-violet-700 border-violet-300" },
    DELIVERED: { label: "Delivered", color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300" },
    IN_USE: { label: "On Site", color: "bg-pink-100 text-pink-700 border-pink-300" },
    DERIG: { label: "Derig", color: "bg-purple-100 text-purple-700 border-purple-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-rose-100 text-rose-700 border-rose-300",
    },
    RETURN_IN_TRANSIT: {
        label: "Return in Transit",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    CLOSED: { label: "Closed", color: "bg-muted text-foreground border-border" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

/** Self-pickup statuses that orders don't have. Falls back to the order map otherwise. */
export const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    ...ORDER_STATUS_CONFIG,
    QUOTED: { label: "Quote Ready", color: "bg-purple-100 text-purple-700 border-purple-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Collection",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Collected", color: "bg-teal-100 text-teal-700 border-teal-300" },
};

const FALLBACK = "bg-gray-100 text-gray-700 border-gray-300";

/** Returns { label, color } for a status, using the given map (default order map). */
export const statusBadge = (
    status: string | null | undefined,
    map: Record<string, { label: string; color: string }> = ORDER_STATUS_CONFIG
) => {
    const cfg = status ? map[status] : undefined;
    return {
        label: cfg?.label || (status ? status.replace(/_/g, " ") : "—"),
        color: cfg?.color || FALLBACK,
    };
};
