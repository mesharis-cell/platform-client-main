import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalLinkProps {
    /** The portal path, e.g. "/orders/ORD-DEMO-002" or "/my-orders". */
    to: string;
    /** Human-readable link text. Keep it action-oriented. */
    label: string;
    /** Optional secondary explanation shown below the link. */
    hint?: string;
    className?: string;
}

/**
 * A doc-specific link that deep-links into the portal.
 *
 * Because the docs site is public, readers may be unauthenticated. Every
 * PortalLink routes through `/?next=<target>` so that:
 * - Signed-in CLIENT users are redirected straight to the target (the
 *   login page's useEffect auto-forwards authenticated clients).
 * - Unauthenticated readers land on the login form with a "after login
 *   you'll go to <target>" destination already set.
 *
 * Non-CLIENT roles are filtered out at the login page level, so this is
 * safe to link from anywhere in docs without leaking admin surfaces.
 */
export function PortalLink({ to, label, hint, className }: PortalLinkProps) {
    const target = encodeURIComponent(to);
    const href = `/?next=${target}`;

    return (
        <span className={cn("inline-flex flex-col", className)}>
            <Link
                href={href}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
                {label}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {hint ? (
                <span className="text-xs text-muted-foreground mt-0.5">{hint}</span>
            ) : null}
        </span>
    );
}
