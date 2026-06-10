"use client";

import Link from "next/link";
import {
    Building2,
    ShoppingCart,
    PackageCheck,
    FileText,
    Users,
    Boxes,
    BarChart3,
    type LucideIcon,
} from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyGate } from "./company-gate";
import { useCompanyDashboard } from "@/hooks/use-company";

const TILES = [
    { key: "pending_quotes", label: "Quotes Awaiting Decision" },
    { key: "upcoming_events_30d", label: "Upcoming Events (30d)" },
    { key: "orders", label: "Total Orders" },
    { key: "self_pickups", label: "Total Self-Pickups" },
] as const;

type Section = {
    href: string;
    label: string;
    icon: LucideIcon;
    desc: string;
    disabled?: boolean;
};

const SECTIONS: Section[] = [
    { href: "/company/orders", label: "Orders", icon: ShoppingCart, desc: "All company orders" },
    {
        href: "/company/self-pickups",
        label: "Self-Pickups",
        icon: PackageCheck,
        desc: "All company self-pickups",
    },
    {
        href: "/company/cost-estimates",
        label: "Cost Estimates",
        icon: FileText,
        desc: "Company-wide estimates",
    },
    { href: "/company/members", label: "Members", icon: Users, desc: "People in your company" },
    { href: "/company/assets", label: "Assets", icon: Boxes, desc: "Browse + edit asset details" },
    // Upcoming — shown disabled to posture the roadmap. Wire the href + remove `disabled` to ship.
    {
        href: "/company/reports",
        label: "Reports",
        icon: BarChart3,
        desc: "Company reports & exports",
        disabled: true,
    },
];

export default function CompanyDashboardPage() {
    const { data, isLoading } = useCompanyDashboard();
    const totals = data?.data?.totals || {};

    return (
        <CompanyGate>
            <ClientNav>
                <ClientHeader
                    icon={Building2}
                    title="Company Back Office"
                    description="Oversee your whole company's activity — orders, self-pickups, estimates and assets."
                    breadcrumbs={[{ label: "Company" }]}
                />
                <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
                    <div className="container mx-auto px-6 py-8 space-y-8">
                        {/* Stat tiles */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {TILES.map((t) => (
                                <Card key={t.key} className="bg-card border-border">
                                    <CardContent className="p-5">
                                        {isLoading ? (
                                            <Skeleton className="h-9 w-16 mb-2" />
                                        ) : (
                                            <p className="text-3xl font-mono font-bold text-foreground">
                                                {Number(totals[t.key] ?? 0)}
                                            </p>
                                        )}
                                        <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                                            {t.label}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Section links */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {SECTIONS.map((s) => {
                                const Icon = s.icon;
                                const card = (
                                    <Card
                                        className={`bg-card border-border h-full ${
                                            s.disabled
                                                ? "opacity-60"
                                                : "hover:border-primary/50 transition-colors"
                                        }`}
                                    >
                                        <CardContent className="p-5 flex items-start gap-3">
                                            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                                                <Icon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-mono font-bold uppercase tracking-wide text-sm">
                                                    {s.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {s.desc}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                                if (s.disabled) {
                                    return (
                                        <div
                                            key={s.label}
                                            aria-disabled
                                            className="cursor-not-allowed select-none pointer-events-none"
                                        >
                                            {card}
                                        </div>
                                    );
                                }
                                return (
                                    <Link key={s.href} href={s.href}>
                                        {card}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
