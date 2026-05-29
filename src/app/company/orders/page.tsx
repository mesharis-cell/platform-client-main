"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

    return (
        <CompanyGate requiredPermission="company:view_all_orders">
            <ClientNav>
                <ClientHeader
                    icon={ShoppingCart}
                    title="Company Orders"
                    description="Every order across your company. Open one to review and approve its quote."
                    breadcrumbs={[{ label: "Company", href: "/company" }, { label: "Orders" }]}
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
                                    {ORDER_STATUS_CONFIG[s].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="px-8 py-6">
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
