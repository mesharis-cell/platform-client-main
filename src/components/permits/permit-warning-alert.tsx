"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type PermitChoice =
    | "NO_PERMIT" // requires_permit=false
    | "CLIENT_HANDLES" // requires_permit=true + permit_owner=CLIENT
    | "PLATFORM_HANDLES" // requires_permit=true + permit_owner=PLATFORM
    | "UNSELECTED"; // form not yet answered

type Props = {
    choice: PermitChoice;
    companyName?: string | null;
};

/**
 * Three context-sensitive warning messages that surface based on the
 * client's permit decision. Shown both at checkout (after the choice is
 * made) AND on the quote-approval screen so clients re-confirm at the
 * commitment moment.
 *
 *   NO_PERMIT       — red, blocks delivery if wrong at venue
 *   CLIENT_HANDLES  — amber, surcharge if not provided by delivery day
 *   PLATFORM_HANDLES — info, charge line item will be added by ops
 */
export function PermitWarningAlert({ choice, companyName }: Props) {
    if (choice === "UNSELECTED") return null;

    if (choice === "NO_PERMIT") {
        return (
            <Alert
                role="alert"
                className="border-red-500/70 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 [&>svg]:text-red-600 ring-2 ring-red-200"
            >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    If a permit is required at the venue and our crew arrives without one,{" "}
                    <strong>delivery cannot proceed</strong>. Confirm with the venue before
                    continuing.
                </AlertDescription>
            </Alert>
        );
    }

    if (choice === "CLIENT_HANDLES") {
        const who = companyName ? `${companyName}` : "your team";
        return (
            <Alert
                role="alert"
                className="border-amber-500/70 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 [&>svg]:text-amber-600 ring-2 ring-amber-200"
            >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    {who} will handle the permit. Permits must be provided to our crew before
                    delivery day. If we arrive without permits in hand,{" "}
                    <strong>a surcharge and additional fees will apply</strong>, and delivery may
                    be delayed or cancelled.
                </AlertDescription>
            </Alert>
        );
    }

    // PLATFORM_HANDLES
    return (
        <Alert
            role="alert"
            className="border-blue-500/60 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 [&>svg]:text-blue-600"
        >
            <Info className="h-4 w-4" />
            <AlertDescription>
                We will handle the venue permit on your behalf.{" "}
                <strong>An additional cost line item will be added to your quote</strong> for
                permit handling.
            </AlertDescription>
        </Alert>
    );
}

export function derivePermitChoice(
    requiresPermit: boolean,
    permitOwner: "CLIENT" | "PLATFORM" | "UNKNOWN" | null | undefined
): PermitChoice {
    if (!requiresPermit) return "NO_PERMIT";
    if (permitOwner === "CLIENT") return "CLIENT_HANDLES";
    if (permitOwner === "PLATFORM") return "PLATFORM_HANDLES";
    return "UNSELECTED";
}
