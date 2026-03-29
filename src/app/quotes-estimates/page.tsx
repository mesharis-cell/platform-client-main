"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { useClientOrders, useDownloadCostEstimate } from "@/hooks/use-client-orders";
import { usePlatform } from "@/contexts/platform-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell } from "@/components/ui/table";
import { DataTable, DataTableRow } from "@/components/ui/data-table";

const QUOTE_ELIGIBLE_ORDER_STATUSES = new Set([
    "QUOTED",
    "APPROVED",
    "DECLINED",
    "INVOICED",
    "PAID",
    "CONFIRMED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "AWAITING_RETURN",
    "RETURN_IN_TRANSIT",
    "CLOSED",
]);

const QUOTE_REVIEW_STATUS_CONFIG = {
    PENDING_REVIEW: {
        label: "Pending Review",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    APPROVED: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    DECLINED: {
        label: "Declined",
        color: "bg-rose-100 text-rose-700 border-rose-300",
    },
} as const;

const formatDate = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(value || 0);

const getQuoteReviewStatus = (orderStatus?: string | null) => {
    if (orderStatus === "DECLINED") return QUOTE_REVIEW_STATUS_CONFIG.DECLINED;
    if (orderStatus === "QUOTED") return QUOTE_REVIEW_STATUS_CONFIG.PENDING_REVIEW;
    return QUOTE_REVIEW_STATUS_CONFIG.APPROVED;
};

const getEstimateAmount = (order: any) => {
    const pricingTotal = Number(order?.order_pricing?.final_total || 0);
    if (pricingTotal > 0) return pricingTotal;
    return Number(order?.final_total_price || 0);
};

const getDateSent = (order: any) => order?.quote_sent_at || order?.updated_at || order?.created_at;

export default function QuotesEstimatesPage() {
    const [page, setPage] = useState(1);
    const limit = 10;
    const { platform } = usePlatform();

    const { data, isLoading, error } = useClientOrders({
        page: 1,
        limit: 500,
        sortBy: "created_at",
        sortOrder: "desc",
    });
    const downloadCostEstimate = useDownloadCostEstimate();

    const quoteOrders = useMemo(() => {
        const orders = Array.isArray(data?.data) ? data.data : [];
        return orders
            .filter(
                (order) =>
                    QUOTE_ELIGIBLE_ORDER_STATUSES.has(order?.order_status) ||
                    Boolean(order?.quote_sent_at)
            )
            .sort(
                (a, b) => new Date(getDateSent(b)).getTime() - new Date(getDateSent(a)).getTime()
            );
    }, [data?.data]);

    const totalPages = Math.max(1, Math.ceil(quoteOrders.length / limit));
    const currentPage = Math.min(page, totalPages);
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * limit;
        return quoteOrders.slice(start, start + limit);
    }, [quoteOrders, currentPage]);

    const handleDownloadCostEstimate = async (orderUuid: string, orderReadableId: string) => {
        if (!platform?.platform_id) {
            toast.error("Platform context is missing. Please refresh and try again.");
            return;
        }

        try {
            const pdfBlob = await downloadCostEstimate.mutateAsync({
                orderId: orderUuid,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${orderReadableId}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (downloadError: any) {
            toast.error(downloadError.message || "Failed to download cost estimate");
        }
    };

    if (error) {
        return (
            <ClientNav>
                <ClientHeader
                    icon={FileText}
                    title="Quotes & Estimates"
                    description="Review pricing and approve quotes"
                />
                <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
                    <div className="container mx-auto px-6 py-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-10 text-center">
                                <p className="text-destructive font-medium">
                                    Failed to load quotes and estimates.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </ClientNav>
        );
    }

    return (
        <ClientNav>
            <ClientHeader
                icon={FileText}
                title="Quotes & Estimates"
                description="Review pricing and approve quotes"
            />

            <DataTable
                columns={[
                    "Order ID",
                    "Event Name",
                    "Event Date",
                    "Status",
                    "Total Amount",
                    "Date Sent",
                    { label: "Action", className: "text-right" },
                ]}
                loading={isLoading}
                hasData={quoteOrders.length > 0}
                empty={{
                    icon: FileText,
                    message: "No quotes available yet",
                }}
            >
                {paginatedOrders.map((order, index) => {
                    const reviewStatus = getQuoteReviewStatus(order?.order_status);
                    return (
                        <DataTableRow key={order?.id} index={index}>
                            <TableCell>
                                <Link
                                    href={`/orders/${order?.order_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    {order?.order_id}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            </TableCell>
                            <TableCell className="font-medium">
                                {order?.event_name || order?.venue_name || "N/A"}
                            </TableCell>
                            <TableCell>
                                {formatDate(order?.event_start_date || order?.event_end_date)}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`${reviewStatus.color} border`}>
                                    {reviewStatus.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                                {formatCurrency(getEstimateAmount(order))}
                            </TableCell>
                            <TableCell>{formatDate(getDateSent(order))}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                        if (!order?.id || !order?.order_id) return;
                                        handleDownloadCostEstimate(order.id, order.order_id);
                                    }}
                                    disabled={downloadCostEstimate.isPending || !order?.id}
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </Button>
                            </TableCell>
                        </DataTableRow>
                    );
                })}
            </DataTable>

            {quoteOrders.length > limit && (
                <div className="px-8 pb-6">
                    <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Showing {(currentPage - 1) * limit + 1} to{" "}
                                    {Math.min(currentPage * limit, quoteOrders.length)} of{" "}
                                    {quoteOrders.length} estimates
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() =>
                                            setPage((previousPage) => Math.max(1, previousPage - 1))
                                        }
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() =>
                                            setPage((previousPage) =>
                                                Math.min(totalPages, previousPage + 1)
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </ClientNav>
    );
}
