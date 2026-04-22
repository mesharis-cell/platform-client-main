"use client";

/**
 * FeasibilityHelper — plain-language inline guide for the installation-step
 * date picker. Shows:
 *   - soonest event date ("floor") given what's in the cart
 *   - whether the user's picked date clears the floor
 *   - an optional "Why?" disclosure with the concrete numbers that drive the
 *     floor (no jargon — phrased in "your stuff needs this much prep" terms)
 *
 * Rendering of this helper is gated by the `enable_feasibility_helper`
 * platform feature flag. When the flag is off, the component renders
 * nothing. Hard-block enforcement (the Next button) is handled by the
 * caller and is NOT flag-gated — rules are always enforced even when the
 * explanatory copy is suppressed.
 */

import * as React from "react";
import { format, parse } from "date-fns";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    MaintenanceFeasibilityIssue,
    MaintenanceFeasibilityResult,
} from "@/hooks/use-feasibility-check";

function fmtFriendlyDate(ymd: string): string {
    try {
        const d = parse(ymd, "yyyy-MM-dd", new Date());
        return format(d, "EEE d MMM yyyy");
    } catch {
        return ymd;
    }
}

interface FeasibilityHelperProps {
    /**
     * Whether to render the helper at all. When false the component returns
     * null — the hard-block behavior on Next is the caller's responsibility.
     */
    helperEnabled: boolean;
    isLoading: boolean;
    floorDate: string | null; // YYYY-MM-DD or null
    userEventDate: string; // YYYY-MM-DD or ""
    userDateFeasible: boolean | null;
    blockingItems: MaintenanceFeasibilityIssue[];
    config: MaintenanceFeasibilityResult["config"] | null;
    /** Called when user clicks "Use this date" shortcut. */
    onUseFloorDate: () => void;
}

export function FeasibilityHelper({
    helperEnabled,
    isLoading,
    floorDate,
    userEventDate,
    userDateFeasible,
    blockingItems,
    config,
    onUseFloorDate,
}: FeasibilityHelperProps) {
    const [whyOpen, setWhyOpen] = React.useState(false);

    if (!helperEnabled) return null;
    if (isLoading) {
        return <p className="text-xs text-muted-foreground italic">Checking availability…</p>;
    }
    // Platform lead-time floor is always present. Only short-circuit when the
    // preview hasn't returned yet (e.g., empty cart or pre-fetch).
    if (!floorDate) return null;

    // User hasn't picked a date yet — show the floor as a friendly hint.
    if (!userEventDate) {
        return (
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm space-y-1">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Soonest possible start
                </p>
                <p className="font-mono font-medium">{fmtFriendlyDate(floorDate)}</p>
                <p className="text-xs text-muted-foreground">
                    Based on what's in your cart. Pick this date or later.
                </p>
                <WhyAccordion
                    open={whyOpen}
                    setOpen={setWhyOpen}
                    floorDate={floorDate}
                    config={config}
                    blockingItems={blockingItems}
                />
            </div>
        );
    }

    // User picked a date that clears the floor — subtle confirmation.
    if (userDateFeasible === true) {
        return (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">
                    Your date works — we can have everything ready in time.
                </p>
            </div>
        );
    }

    // User picked a date earlier than the floor — warn + offer the shortcut.
    return (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900">
                        This date is a bit too soon.
                    </p>
                    <p className="text-xs text-amber-800">
                        Soonest we can have everything ready:{" "}
                        <span className="font-mono font-semibold">
                            {fmtFriendlyDate(floorDate)}
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={onUseFloorDate}
                >
                    Use this date
                </Button>
                <button
                    type="button"
                    onClick={() => setWhyOpen((v) => !v)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    Why
                    <ChevronDown
                        className={cn("h-3 w-3 transition-transform", whyOpen && "rotate-180")}
                    />
                </button>
            </div>
            {whyOpen ? (
                <WhyBody floorDate={floorDate} config={config} blockingItems={blockingItems} />
            ) : null}
        </div>
    );
}

function WhyAccordion({
    open,
    setOpen,
    floorDate,
    config,
    blockingItems,
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    floorDate: string;
    config: MaintenanceFeasibilityResult["config"] | null;
    blockingItems: MaintenanceFeasibilityIssue[];
}) {
    return (
        <div className="pt-1">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
                Why this date?
                <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
                <div className="pt-2">
                    <WhyBody floorDate={floorDate} config={config} blockingItems={blockingItems} />
                </div>
            ) : null}
        </div>
    );
}

function WhyBody({
    floorDate,
    config,
    blockingItems,
}: {
    floorDate: string;
    config: MaintenanceFeasibilityResult["config"] | null;
    blockingItems: MaintenanceFeasibilityIssue[];
}) {
    return (
        <ul className="text-[11px] text-muted-foreground space-y-1 pl-3 border-l-2 border-border/50">
            {config ? (
                <li>
                    <span className="font-mono font-medium">{config.minimum_lead_hours}h</span> of
                    prep time after you place your order
                    {config.exclude_weekends ? " (weekends don't count)" : ""}
                </li>
            ) : null}
            {blockingItems.map((it) => (
                <li key={it.asset_id}>
                    <span className="font-medium">{it.asset_name}</span> needs{" "}
                    <span className="font-mono">
                        {it.refurb_days_estimate} more day
                        {it.refurb_days_estimate === 1 ? "" : "s"}
                    </span>{" "}
                    to be ready
                </li>
            ))}
            <li className="pt-1 text-foreground">
                Earliest everything can be ready:{" "}
                <span className="font-mono font-medium">{fmtFriendlyDate(floorDate)}</span>
            </li>
        </ul>
    );
}
