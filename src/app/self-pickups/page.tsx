"use client";

import { useState } from "react";
import Link from "next/link";
import { useClientSelfPickups } from "@/hooks/use-self-pickups";
import { ClientNav } from "@/components/client-nav";
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
    Search,
    ChevronLeft,
    ChevronRight,
    User,
    Clock,
    Package,
} from "lucide-react";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "In Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    QUOTED: { label: "Quote Ready", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Collection",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Collected", color: "bg-teal-100 text-teal-700 border-teal-300" },
    IN_USE: { label: "In Use", color: "bg-purple-100 text-purple-700 border-purple-300" },
    AWAITING_RETURN: {
        label: "Return Pending",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    RETURNED: { label: "Returned", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function ClientSelfPickupsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const { data, isLoading } = useClientSelfPickups({
        page,
        limit: 20,
        self_pickup_status: status || undefined,
        search: search || undefined,
    });

    const pickups = data?.data?.self_pickups || [];
    const totalPages = data?.data?.total_pages || 1;

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
                <div className="border-b border-border bg-card/70 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-8 py-10">
                        <Badge className="mb-4">Self Pickups</Badge>
                        <h1 className="text-4xl font-bold tracking-tight">My Pickups</h1>
                        <p className="mt-3 max-w-2xl text-muted-foreground">
                            Track your self-pickup collections and returns.
                        </p>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-8 py-8 space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by pickup ID..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>
                        <Select
                            value={status || "_all_"}
                            onValueChange={(v) => {
                                setStatus(v === "_all_" ? "" : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all_">All statuses</SelectItem>
                                {Object.entries(PICKUP_STATUS_CONFIG).map(
                                    ([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            {config.label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cards */}
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : pickups.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Package className="mx-auto h-12 w-12 mb-4 opacity-30" />
                            <p className="text-lg font-medium">No pickups yet</p>
                            <p className="text-sm mt-1">
                                Start from the catalog to create a self-pickup order.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pickups.map((pickup: any) => {
                                const statusConfig =
                                    PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
                                        label: pickup.self_pickup_status,
                                        color: "bg-gray-100 text-gray-700",
                                    };
                                const pickupWindow = pickup.pickup_window as any;

                                return (
                                    <Link
                                        key={pickup.id}
                                        href={`/self-pickups/${pickup.id}`}
                                    >
                                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-lg">
                                                            {pickup.self_pickup_id}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                {pickup.collector_name}
                                                            </span>
                                                            {pickupWindow?.start && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {new Date(
                                                                        pickupWindow.start
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={statusConfig.color}
                                                    >
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={page >= totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
