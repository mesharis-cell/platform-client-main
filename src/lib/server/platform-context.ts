import { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

export const getBackendApiUrl = () => API_URL;

export const resolvePlatformContext = async (request: NextRequest) => {
    const host = process.env.NEXT_PUBLIC_DEV_HOST_OVERRIDE || request.headers.get("host") || "";

    const response = await fetch(`${API_URL}/auth/context`, {
        headers: {
            "x-forwarded-host": host,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Failed to resolve platform context");
    }

    const data = await response.json();
    return data.data as { platform_id: string };
};
