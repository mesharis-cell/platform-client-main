"use client";

/**
 * Enhanced Client Navigation with Cart Integration
 *
 * Industrial aesthetic with floating cart button and badge
 */

import { FloatingCart } from "@/components/cart/floating-cart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { useCompany } from "@/hooks/use-companies";
import { useToken } from "@/lib/auth/use-token";
import { usePlatform } from "@/contexts/platform-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { COMPANY_PERMISSIONS } from "@/app/company/company-gate";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
    LayoutDashboard,
    Grid3x3,
    LogOut,
    ShoppingCart,
    FileText,
    Box,
    Building2,
    Calendar,
    Lock,
    ClipboardList,
    FileSpreadsheet,
    PackageCheck,
    BookOpen,
    ExternalLink,
    LifeBuoy,
    Menu,
    X,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const clientNav = [
    { name: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard },
    { name: "Catalog", href: "/catalog", icon: Grid3x3 },
    { name: "My Orders", href: "/my-orders", icon: ShoppingCart },
    {
        name: "My Pickups",
        href: "/self-pickups",
        icon: PackageCheck,
        featureFlag: "enable_self_pickup",
    },
    {
        // Company Back Office — visible only to company managers (CLIENT users
        // holding a company:* permission) when the feature flag is on.
        name: "Company",
        href: "/company",
        icon: Building2,
        featureFlag: "enable_company_backoffice",
        requiresCompanyAccess: true,
    },
    { name: "Quotes & Estimates", href: "/quotes-estimates", icon: FileText },
    {
        name: "Service Requests",
        href: "/service-requests",
        icon: ClipboardList,
        featureFlag: "enable_service_requests",
    },
    {
        name: "New Stock Request",
        href: "/assets-inbound",
        icon: Box,
        featureFlag: "enable_client_stock_requests",
    },
    {
        name: "Event Calendar",
        href: "/event-calendar",
        icon: Calendar,
        featureFlag: "enable_event_calendar",
    },
    { name: "Reports", href: "/reports", icon: FileSpreadsheet },
] as const;

interface ClientNavProps {
    children: React.ReactNode;
}

function ClientNavInner({ children }: ClientNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useToken();
    const { toggleCart, itemCount } = useCart();
    const { user } = useToken();
    const { platform } = usePlatform();
    const { data: company, isLoading } = useCompany(user?.company_id || undefined);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    // Desktop sidebar fold (icon-only rail). Persisted; mobile uses the drawer
    // and ignores this. Collapsed styles are all md:-gated so the mobile drawer
    // stays full-width with labels.
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        // eslint-disable-next-line creatr/no-browser-globals-in-ssr
        setCollapsed(localStorage.getItem("client-nav-collapsed") === "1");
    }, []);
    const toggleCollapsed = () =>
        setCollapsed((c) => {
            const next = !c;
            try {
                // eslint-disable-next-line creatr/no-browser-globals-in-ssr
                localStorage.setItem("client-nav-collapsed", next ? "1" : "0");
            } catch {
                /* ignore */
            }
            return next;
        });

    // Auto-close the mobile drawer on route change so the user lands on the
    // new page without having to dismiss the menu manually.
    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    // Lock body scroll while the mobile drawer is open — prevents the page
    // from scrolling underneath the open menu on iOS Safari.
    useEffect(() => {
        if (typeof document === "undefined") return;
        const original = document.body.style.overflow;
        document.body.style.overflow = mobileNavOpen ? "hidden" : original;
        return () => {
            document.body.style.overflow = original;
        };
    }, [mobileNavOpen]);

    const features = platform?.features || {};
    const visibleNav = clientNav.filter((item) => {
        // Feature-flag gate: hide only when the flag is explicitly off.
        if ("featureFlag" in item && item.featureFlag && features[item.featureFlag] === false) {
            return false;
        }
        // Permission gate (Company Back Office): hide unless the user holds a
        // company:* permission. Double-gate with the flag above.
        if (
            "requiresCompanyAccess" in item &&
            item.requiresCompanyAccess &&
            !hasAnyPermission(user, COMPANY_PERMISSIONS)
        ) {
            return false;
        }
        return true;
    });

    const handleSignOut = () => {
        logout();
        router.push("/");
        toast.success("You have been signed out.");
    };

    // Find most specific matching route for active state
    const getActiveRoute = () => {
        const matchingRoutes = visibleNav.filter(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
        );
        return matchingRoutes.reduce(
            (longest, current) => (current.href.length > longest.href.length ? current : longest),
            matchingRoutes[0]
        );
    };

    const activeRoute = getActiveRoute();

    return (
        <div className="min-h-screen flex bg-background">
            {/* Mobile top bar — only on screens narrower than md. Holds the
            hamburger toggle and a compact brand mark so the user can identify
            which tenant they're in without opening the drawer. */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-40 flex items-center px-3 gap-3">
                <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Open navigation menu"
                    aria-expanded={mobileNavOpen}
                    className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    {company?.data?.settings?.branding?.logo_url ? (
                        <img
                            src={company.data.settings.branding.logo_url}
                            alt=""
                            className="h-7 w-7 rounded object-contain shrink-0"
                        />
                    ) : null}
                    <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground truncate">
                        {company?.data?.name ?? platform?.company_name ?? ""}
                    </span>
                </div>
            </div>

            {/* Backdrop for the mobile drawer. Tapping outside the drawer
            dismisses it. Hidden above md where the sidebar is persistent. */}
            {mobileNavOpen && (
                <div
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                />
            )}

            {/* Sidebar Navigation
            Desktop (md+): persistent sticky column, 72 wide.
            Mobile: fixed slide-in drawer from the left, full-height. We use
            translate-x to animate so it doesn't reflow the page underneath. */}
            <aside
                className={cn(
                    "w-72 border-r border-border bg-background md:bg-muted/30 flex flex-col overflow-hidden z-50",
                    "fixed top-0 left-0 h-screen transition-transform duration-200 ease-out",
                    "md:static md:sticky md:top-0 md:shrink-0 md:translate-x-0 md:transition-[width] md:duration-200",
                    // Desktop fold: icon-only rail when collapsed (mobile stays w-72).
                    collapsed ? "md:w-[72px]" : "md:w-72",
                    mobileNavOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Drawer close button — mobile only. Doubles up with the
                backdrop tap but is more discoverable for touch users. */}
                <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close navigation menu"
                    className="md:hidden absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-md bg-background/80 hover:bg-muted z-20"
                >
                    <X className="h-5 w-5" />
                </button>
                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
                        backgroundSize: "32px 32px",
                    }}
                />

                {/* Zone markers */}
                <div
                    className={cn(
                        "absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0",
                        collapsed && "md:hidden"
                    )}
                >
                    CLIENT-01
                </div>
                <div
                    className={cn(
                        "absolute top-4 right-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0",
                        collapsed && "md:hidden"
                    )}
                >
                    SEC-L1
                </div>

                {/* Header */}
                <div
                    className={cn(
                        "relative z-10 p-6 pb-4 border-b border-border",
                        collapsed && "md:px-3"
                    )}
                >
                    <div
                        className={cn(
                            "flex items-center gap-3",
                            collapsed && "md:flex-col md:items-center md:gap-3"
                        )}
                    >
                        {isLoading ? (
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        ) : company?.data?.settings?.branding?.logo_url ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                                <img
                                    src={company.data.settings.branding.logo_url}
                                    alt={`${company.data.name} logo`}
                                    className="w-full h-full object-contain p-1"
                                />
                            </div>
                        ) : company?.data ? (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                                <span className="text-sm font-mono font-bold text-primary">
                                    {company.data.name.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden">
                                <Box className="h-5 w-5 text-primary relative z-10" />
                                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                            </div>
                        )}
                        <div className={cn("min-w-0", collapsed && "md:hidden")}>
                            {isLoading ? (
                                <>
                                    <Skeleton className="h-5 w-32 mb-1" />
                                    <Skeleton className="h-3 w-24" />
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-mono font-bold tracking-tight uppercase truncate">
                                        {company?.data?.name ? company.data.name : "Client Portal"}
                                    </h2>
                                    <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                        Asset Ordering System
                                    </p>
                                </>
                            )}
                        </div>
                        {/* Collapse / expand toggle — desktop only, inline with the brand
                        (sits to the right when open, centered under the logo when folded) */}
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className={cn(
                                "hidden md:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                !collapsed && "ml-auto"
                            )}
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
                    {isLoading ? (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                    <Skeleton className="h-4 w-4 rounded" />
                                    <Skeleton className="h-3.5 flex-1" />
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            {visibleNav.map((item) => {
                                const isActive = activeRoute?.href === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={collapsed ? item.name : undefined}
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden",
                                            collapsed && "md:justify-center md:px-0",
                                            isActive
                                                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                                : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                                        )}

                                        <Icon className="h-4 w-4 relative z-10 shrink-0" />
                                        <span
                                            className={cn(
                                                "flex-1 relative z-10 uppercase tracking-wide text-xs",
                                                collapsed && "md:hidden"
                                            )}
                                        >
                                            {item.name}
                                        </span>

                                        {!isActive && (
                                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                                        )}
                                    </Link>
                                );
                            })}

                            {/* Separator before external links */}
                            <div className="px-3 pt-4 pb-1">
                                <div className="h-px bg-border/60" />
                            </div>

                            {/* Docs — external link, distinct styling (opens new tab) */}
                            <a
                                href="/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={collapsed ? "Help & Guides" : undefined}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all text-muted-foreground hover:text-foreground hover:bg-muted",
                                    collapsed && "md:justify-center md:px-0"
                                )}
                            >
                                <BookOpen className="h-4 w-4 shrink-0" />
                                <span
                                    className={cn(
                                        "flex-1 uppercase tracking-wide text-xs",
                                        collapsed && "md:hidden"
                                    )}
                                >
                                    Help &amp; Guides
                                </span>
                                <ExternalLink
                                    className={cn(
                                        "h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity",
                                        collapsed && "md:hidden"
                                    )}
                                />
                            </a>
                        </>
                    )}
                </nav>

                {/* Divider */}
                <div className={cn("relative z-10 px-6 py-2", collapsed && "md:hidden")}>
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                            User Profile
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </div>

                {/* User Profile */}
                <div className={cn("relative z-10 p-4 space-y-3", collapsed && "md:px-2")}>
                    {isLoading ? (
                        <>
                            <div className="flex items-center gap-3 px-2">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className={cn("flex-1 space-y-2", collapsed && "md:hidden")}>
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-9 w-full rounded-md" />
                        </>
                    ) : (
                        <>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-2 py-1",
                                    collapsed && "md:justify-center md:px-0"
                                )}
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="rounded-full border-2 border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-primary/10 text-primary font-mono text-sm font-bold">
                                                    {user?.name?.charAt(0).toUpperCase() || "C"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="top" align="start">
                                        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide">
                                            {user?.name || "Client User"}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() => router.push("/reset-password")}
                                            className="font-mono text-xs uppercase tracking-wide"
                                        >
                                            <Lock className="h-3.5 w-3.5 mr-2" />
                                            Reset Password
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                window.open(
                                                    "/docs",
                                                    "_blank",
                                                    "noopener,noreferrer"
                                                )
                                            }
                                            className="font-mono text-xs uppercase tracking-wide"
                                        >
                                            <LifeBuoy className="h-3.5 w-3.5 mr-2" />
                                            Help &amp; Guides
                                            <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={handleSignOut}
                                            className="font-mono text-xs uppercase tracking-wide text-destructive focus:text-destructive"
                                        >
                                            <LogOut className="h-3.5 w-3.5 mr-2" />
                                            Sign Out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className={cn("flex-1 min-w-0", collapsed && "md:hidden")}>
                                    <p className="text-sm font-mono font-semibold truncate">
                                        {user?.name || "Client User"}
                                    </p>
                                    <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                        Client User
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Bottom zone marker */}
                <div
                    className={cn(
                        "absolute bottom-4 left-4 right-4 text-[9px] font-mono text-muted-foreground/30 tracking-[0.2em] uppercase text-center z-0",
                        collapsed && "md:hidden"
                    )}
                >
                    Platform Asset Fulfillment v1.0
                </div>
            </aside>

            {/* Main Content — pt-14 on mobile reserves space for the fixed
            top bar; reset on md+ where the bar is hidden. */}
            <main className="flex-1 overflow-auto bg-background relative pt-14 md:pt-0">
                {children}

                {/* Floating Cart Button */}
                <motion.button
                    onClick={toggleCart}
                    className="fixed bottom-20 right-8 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-30 border-4 border-background"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ShoppingCart className="h-6 w-6" />
                    <AnimatePresence>
                        {itemCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-mono font-bold text-sm border-2 border-background"
                            >
                                {itemCount}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Floating Cart Panel */}
                <FloatingCart />
            </main>
        </div>
    );
}

export function ClientNav({ children }: ClientNavProps) {
    return <ClientNavInner>{children}</ClientNavInner>;
}
