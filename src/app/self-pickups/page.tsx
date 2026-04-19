"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClientSelfPickups } from "@/hooks/use-self-pickups";
import { usePlatform } from "@/contexts/platform-context";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Package,
    Plus,
    Truck,
    User,
    X,
} from "lucide-react";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "Pricing Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    QUOTED: { label: "Quote Ready", color: "bg-purple-100 text-purple-700 border-purple-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Collection",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Collected", color: "bg-teal-100 text-teal-700 border-teal-300" },
    IN_USE: { label: "In Use", color: "bg-pink-100 text-pink-700 border-pink-300" },
    AWAITING_RETURN: {
        label: "Return Pending",
        color: "bg-rose-100 text-rose-700 border-rose-300",
    },
    RETURNED: { label: "Returned", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    CLOSED: { label: "Closed", color: "bg-muted text-foreground border-border" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function ClientSelfPickupsPage() {
    const router = useRouter();
    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            router.replace("/catalog");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const { data, isLoading, error } = useClientSelfPickups({
        page,
        limit: 100,
        self_pickup_status: status || undefined,
        search: search || undefined,
    });

    const clearFilters = () => {
        setStatus("");
        setSearch("");
        setPage(1);
    };

    const activeFiltersCount = useMemo(
        () => (status ? 1 : 0) + (search ? 1 : 0),
        [status, search]
    );

    if (platformLoading || !selfPickupEnabled) {
        return null;
    }

    const pickups: any[] = data?.data?.self_pickups || [];
    const totalPages: number = data?.data?.total_pages || 1;
    const total: number = data?.data?.total || pickups.length;

    return (
        <ClientNav>
            <ClientHeader
                icon={Truck}
                title="My Pickups"
                description="Track your self-pickup collections and returns"
                actions={
                    <Link href="/catalog">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Pickup
                        </Button>
                    </Link>
                }
            />

            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/30 to-background">
                <div className="container mx-auto px-6 py-8">
                    {/* Filters Bar */}
                    <Card className="bg-card/80 backdrop-blur-sm border-border/40 mb-6">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 flex gap-2">
                                    <Input
                                        placeholder="Search by pickup ID or collector..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="flex-1"
                                    />
                                </div>

                                <Select
                                    value={status || "all"}
                                    onValueChange={(val) => {
                                        setStatus(val === "all" ? "" : val);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {Object.entries(PICKUP_STATUS_CONFIG).map(
                                            ([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    {config.label}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>

                                {activeFiltersCount > 0 && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* List */}
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-40 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-12 text-center">
                                <p className="text-destructive font-medium">
                                    Failed to load pickups. Please try again.
                                </p>
                            </CardContent>
                        </Card>
                    ) : pickups.length === 0 ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-12 text-center">
                                <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-foreground font-medium text-lg mb-2">
                                    No pickups yet
                                </p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {activeFiltersCount > 0
                                        ? "Try adjusting your filters to see more results"
                                        : "Start from the catalog to create a self-pickup order"}
                                </p>
                                <Link href="/catalog">
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Browse Catalog
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex flex-col space-y-4">
                                {pickups.map((pickup: any) => {
                                    const statusConfig =
                                        PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
                                            label: pickup.self_pickup_status,
                                            color:
                                                "bg-gray-100 text-gray-700 border-gray-300",
                                        };
                                    const pickupWindow = pickup.pickup_window as any;
                                    const itemCount =
                                        pickup.item_count ?? pickup.items?.length ?? null;
                                    const total = pickup.total_sell_amount ?? null;

                                    return (
                                        <Link
                                            key={pickup.id}
                                            href={`/self-pickups/${pickup.id}`}
                                        >
                                            <Card className="bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-all duration-200 group cursor-pointer">
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                        <div className="flex-1 min-w-0 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <p className="font-mono text-lg font-bold text-foreground">
                                                                    {pickup.self_pickup_id}
                                                                </p>
                                                                {itemCount != null && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                    >
                                                                        {itemCount}{" "}
                                                                        {itemCount === 1
                                                                            ? "item"
                                                                            : "items"}
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="flex items-start gap-2">
                                                                <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-foreground text-base truncate">
                                                                        {pickup.collector_name ||
                                                                            "—"}
                                                                    </p>
                                                                    {pickup.collector_phone && (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {pickup.collector_phone}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {pickupWindow?.start && (
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Pickup:{" "}
                                                                        <span className="font-medium text-foreground font-mono">
                                                                            {new Date(
                                                                                pickupWindow.start
                                                                            ).toLocaleDateString()}
                                                                            {pickupWindow.end &&
                                                                                ` – ${new Date(pickupWindow.end).toLocaleDateString()}`}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col items-end gap-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${statusConfig.color} font-medium border whitespace-nowrap px-4 py-1.5 text-sm`}
                                                            >
                                                                {statusConfig.label}
                                                            </Badge>
                                                            {total != null && (
                                                                <p className="font-mono text-sm font-bold text-foreground">
                                                                    {new Intl.NumberFormat(
                                                                        "en-US",
                                                                        {
                                                                            style: "currency",
                                                                            currency:
                                                                                pickup.currency ||
                                                                                "AED",
                                                                        }
                                                                    ).format(Number(total))}
                                                                </p>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                View Details →
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <Card className="bg-card/80 backdrop-blur-sm border-border/40 mt-6">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                Page {page} of {totalPages}
                                                {total ? ` · ${total} total` : ""}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() =>
                                                        setPage((p) => Math.max(1, p - 1))
                                                    }
                                                    disabled={page <= 1}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        setPage((p) =>
                                                            Math.min(totalPages, p + 1)
                                                        )
                                                    }
                                                    disabled={page >= totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
