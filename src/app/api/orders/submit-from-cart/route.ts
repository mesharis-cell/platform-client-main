import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendApiUrl, resolvePlatformContext } from "@/lib/server/platform-context";

const BACKEND_URL = getBackendApiUrl();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        const platform = await resolvePlatformContext(request);

        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const response = await fetch(`${BACKEND_URL}/client/v1/order/submit-from-cart`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "x-platform": platform.platform_id,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || "Failed to submit order" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Submit order proxy error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
