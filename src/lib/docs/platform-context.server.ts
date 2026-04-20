import { headers } from "next/headers";

/**
 * Server-side platform context fetcher for docs pages.
 *
 * Docs is public — it has no user session to lean on — but it still needs
 * platform features to decide which articles to show and which to gate.
 * We resolve the tenant the same way the root layout does: by forwarding
 * the inbound host to the API's /auth/context endpoint.
 *
 * Returns `null` on any failure; callers should treat a null platform as
 * "all articles visible, no feature gating" — better than crashing a public
 * docs page because the API is down.
 */

export interface ServerPlatformContext {
    platform_id: string | null;
    platform_name: string | null;
    company_id: string | null;
    company_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    currency: string | null;
    features: Record<string, boolean>;
}

const FALLBACK: ServerPlatformContext = {
    platform_id: null,
    platform_name: null,
    company_id: null,
    company_name: null,
    logo_url: null,
    primary_color: null,
    secondary_color: null,
    currency: null,
    features: {},
};

export const getServerPlatformContext = async (): Promise<ServerPlatformContext> => {
    try {
        const headersList = await headers();
        const host = process.env.NEXT_PUBLIC_DEV_HOST_OVERRIDE || headersList.get("host") || "";

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) return FALLBACK;

        const res = await fetch(`${apiUrl}/auth/context`, {
            headers: { "x-forwarded-host": host },
            cache: "no-store",
        });
        if (!res.ok) return FALLBACK;

        const body = await res.json();
        const data = body?.data ?? {};
        return {
            platform_id: data.platform_id ?? null,
            platform_name: data.platform_name ?? null,
            company_id: data.company_id ?? null,
            company_name: data.company_name ?? null,
            logo_url: data.logo_url ?? null,
            primary_color: data.primary_color ?? null,
            secondary_color: data.secondary_color ?? null,
            currency: data.currency ?? null,
            features: (data.features ?? {}) as Record<string, boolean>,
        };
    } catch {
        return FALLBACK;
    }
};
