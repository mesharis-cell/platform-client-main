import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import { CustomJwtPayload } from "./app/page";
// Routes that don't require authentication
const publicRoutes = ["/", "/forgot-password", "/maintenance", "/docs"];

// Hard-disabled client-portal routes (all tenants), independent of any
// feature flag. The nav items are removed too, but blocking here also bounces
// direct URLs and sub-routes (e.g. /service-requests/<id>) to the dashboard.
// To re-enable: remove the route here and restore its nav item in client-nav.
// NOTE: prefix-matched as `=== route || startsWith(route + "/")`, so this does
// NOT affect /company/reports (different path under /company).
const disabledClientRoutes = ["/service-requests", "/reports"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const cookieStore = await cookies();

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    // Allow public routes without authentication
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for access_token cookie
    const accessToken = cookieStore.get("access_token")?.value || null;

    // If no token and trying to access protected route, redirect to homepage
    if (!accessToken) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const role = jwtDecode<CustomJwtPayload>(accessToken || "").role;

    if (role !== "CLIENT") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Bounce hard-disabled routes (and their sub-routes) to the dashboard.
    const isDisabledRoute = disabledClientRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isDisabledRoute) {
        return NextResponse.redirect(new URL("/client-dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
