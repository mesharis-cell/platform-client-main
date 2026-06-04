"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatform } from "@/contexts/platform-context";
import { useToken } from "@/lib/auth/use-token";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";

/**
 * The company:* permissions that grant entry to the Company Back Office.
 * Holding ANY of them (or the company:* wildcard) makes a CLIENT user a
 * "company manager". Shared with the nav so the entry + the section gate agree.
 */
export const COMPANY_PERMISSIONS = [
    "company:view_dashboard",
    "company:view_all_orders",
    "company:manage_quotes",
    "company:view_estimates",
    "company:edit_assets",
    "company:view_users",
    // NOTE: "company:export" is intentionally NOT in this list. It's a valid
    // permission in the union type (types/auth.ts) reserved for a future export
    // feature, but it has no backing API route today. Including it here would let
    // a user granted ONLY company:export pass the "any company perm" visibility
    // gate and open the entire /company section with nothing behind it. Add it
    // back once the export feature ships.
];

/** Is the Company Back Office available to this user on this platform? */
export function useCompanyOfficeAccess() {
    const { platform, isLoading: platformLoading } = usePlatform();
    const { user, loading: userLoading } = useToken();
    const enabled =
        (platform?.features as Record<string, unknown> | undefined)?.enable_company_backoffice ===
        true;
    const allowed = hasAnyPermission(user, COMPANY_PERMISSIONS);
    return { enabled, allowed, loading: platformLoading || userLoading };
}

/**
 * Section gate for /company/*. Renders children only when the feature flag is
 * on AND the user holds a company:* permission; otherwise redirects to the
 * client dashboard. This is defense-in-depth — the API is the authoritative
 * gate (every /client/v1/company route is featureValidator + requirePermission).
 *
 * `requiredPermission`, when passed, additionally gates a specific sub-page
 * (e.g. the asset editor requires company:edit_assets).
 */
export function CompanyGate({
    children,
    requiredPermission,
}: {
    children: React.ReactNode;
    requiredPermission?: string;
}) {
    const router = useRouter();
    const { user } = useToken();
    const { enabled, allowed, loading } = useCompanyOfficeAccess();
    const pagePermitted = requiredPermission ? hasPermission(user, requiredPermission) : true;

    useEffect(() => {
        if (loading) return;
        if (!enabled || !allowed || !pagePermitted) {
            router.replace("/client-dashboard");
        }
    }, [loading, enabled, allowed, pagePermitted, router]);

    if (loading || !enabled || !allowed || !pagePermitted) return null;
    return <>{children}</>;
}
