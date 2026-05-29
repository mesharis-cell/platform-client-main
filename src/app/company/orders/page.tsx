"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { CompanyGate } from "../company-gate";
import { useCompanyOrders } from "@/hooks/use-company";

const ORDER_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "DECLINED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "AWAITING_RETURN",
    "RETURN_IN_TRANSIT",
    "CLOSED",
    "CANCELLED",
];

export default function CompanyOrdersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const { data, isLoading } = useCompanyOrders({
        page,
        limit: 20,
        order_status: status || undefined,
        search_term: search || undefined,
    });

    const orders: any[] = data?.data?.data || [];
    const total: number = data?.data?.meta?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / 20));

    return (
        <CompanyGate requiredPermission="company:view_all_orders">
            <ClientNav>
                <ClientHeader
                    icon={ShoppingCart}
                    title="Company Orders"
                    description="Every order across your company. Open one to review and approve its quote."
                />
                <div className="border-b border-border bg-card px-8 py-4 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search order ID, contact, asset…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>
                    <Select
                        value={status || "ALL"}
                        onValueChange={(v) => {
                            setStatus(v === "ALL" ? "" : v);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            {ORDER_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s.replace(/_/g, " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="px-8 py-6 space-y-3">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : orders.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            No orders found.
                        </div>
                    ) : (
                        orders.map((order) => (
                            <Link
                                key={order.id}
                                href={`/orders/${order.order_id}?company=1`}
                                className="block"
                            >
                                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-mono font-bold text-sm">
                                                {order.order_id}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {order.contact_name || "—"}
                                                {order.created_by_user?.name
                                                    ? ` · by ${order.created_by_user.name}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            {order.order_pricing?.final_total ? (
                                                <span className="font-mono text-sm">
                                                    {Number(
                                                        order.order_pricing.final_total
                                                    ).toLocaleString()}{" "}
                                                    AED
                                                </span>
                                            ) : null}
                                            <Badge className="font-mono text-[10px] uppercase border bg-muted text-foreground border-border whitespace-nowrap">
                                                {String(order.order_status).replace(/_/g, " ")}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-mono text-xs text-muted-foreground">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
