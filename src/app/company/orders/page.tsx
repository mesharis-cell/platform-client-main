"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, ChevronLeft, ChevronRight, X } from "lucide-react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CompanyGate } from "../company-gate";
import { useCompanyOrders } from "@/hooks/use-company";
import { ORDER_STATUS_CONFIG, statusBadge } from "@/lib/order-status";

const ORDER_STATUSES = Object.keys(ORDER_STATUS_CONFIG);

const fmtDate = (v?: string | null) =>
    v
        ? new Date(v).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

export default function CompanyOrdersPage() {
    const router = useRouter();
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
    const activeFilters = (status ? 1 : 0) + (search ? 1 : 0);

    const clearFilters = () => {
        setStatus("");
        setSearch("");
        setPage(1);
    };

    return (
        <CompanyGate requiredPermission="company:view_all_orders">
            <ClientNav>
                <ClientHeader
                    icon={ShoppingCart}
                    title="Company Orders"
                    description="Every order across your company. Open one to review and approve its quote."
                    breadcrumbs={[{ label: "Company", href: "/company" }, { label: "Orders" }]}
                />
                <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
                    <div className="container mx-auto px-6 py-8">
                        {/* Filters */}
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40 mb-6">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Input
                                        placeholder="Search by order ID, contact or asset..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="flex-1"
                                    />
                                    <Select
                                        value={status || "all"}
                                        onValueChange={(v) => {
                                            setStatus(v === "all" ? "" : v);
                                            setPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="w-full md:w-[200px]">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            {ORDER_STATUSES.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {ORDER_STATUS_CONFIG[s].label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {activeFilters > 0 && (
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

                        {/* Table */}
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border/50 hover:bg-muted/50">
                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                            Order ID
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                            Ordered By
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                            Event Date
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                            Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(8)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={4}>
                                                    <Skeleton className="h-6 w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center py-12 text-muted-foreground font-mono text-sm"
                                            >
                                                No orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order) => {
                                            const badge = statusBadge(order.order_status);
                                            return (
                                                <TableRow
                                                    key={order.id}
                                                    className="border-border/50 cursor-pointer"
                                                    onClick={() =>
                                                        router.push(
                                                            `/orders/${order.order_id}?company=1`
                                                        )
                                                    }
                                                >
                                                    <TableCell className="font-mono font-medium">
                                                        {order.order_id}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {order.created_by_user?.name || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {fmtDate(order.event_start_date)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge
                                                            variant="outline"
                                                            className={`${badge.color} font-medium border whitespace-nowrap`}
                                                        >
                                                            {badge.label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-6">
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
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
