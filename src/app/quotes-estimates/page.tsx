"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { useClientOrders, useDownloadCostEstimate } from "@/hooks/use-client-orders";
import { usePlatform } from "@/contexts/platform-context";
import { getOrderPrice } from "@/lib/utils/helper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const QUOTE_ELIGIBLE_ORDER_STATUSES = new Set([
    "QUOTED",
    "APPROVED",
    "DECLINED",
    "INVOICED",
    "PAID",
    "CONFIRMED",
    "AWAITING_FABRICATION",
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
    const computedTotal = Number(getOrderPrice(order?.order_pricing).total || 0);
    if (computedTotal > 0) return computedTotal;
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
                (a, b) =>
                    new Date(getDateSent(b)).getTime() - new Date(getDateSent(a)).getTime()
            );
    }, [data?.data]);

    const totalPages = Math.max(1, Math.ceil(quoteOrders.length / limit));
    const currentPage = Math.min(page, totalPages);
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * limit;
        return quoteOrders.slice(start, start + limit);
    }, [quoteOrders, currentPage]);

    const handleDownloadCostEstimate = async (orderId: string) => {
        if (!platform?.platform_id) {
            toast.error("Platform context is missing. Please refresh and try again.");
            return;
        }

        try {
            const pdfBlob = await downloadCostEstimate.mutateAsync({
                orderId,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${orderId}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (downloadError: any) {
            toast.error(downloadError.message || "Failed to download cost estimate");
        }
    };

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
                <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="container mx-auto px-6 py-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    Quotes & Estimates
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Review estimate history and download cost estimate PDFs
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-8">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(6)].map((_, index) => (
                                <Skeleton key={index} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-10 text-center">
                                <p className="text-destructive font-medium">
                                    Failed to load quotes and estimates.
                                </p>
                            </CardContent>
                        </Card>
                    ) : quoteOrders.length === 0 ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-10 text-center space-y-2">
                                <p className="font-medium text-lg">No quotes available yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Quotes will appear here once your orders reach quoted status.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card className="bg-card/80 backdrop-blur-sm border-border/40 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Event Name</TableHead>
                                            <TableHead>Event Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total Amount</TableHead>
                                            <TableHead>Date Sent</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedOrders.map((order) => {
                                            const reviewStatus = getQuoteReviewStatus(order?.order_status);
                                            return (
                                                <TableRow key={order?.id}>
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
                                                        {formatDate(
                                                            order?.event_start_date || order?.event_end_date
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`${reviewStatus.color} border`}
                                                        >
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
                                                            onClick={() =>
                                                                handleDownloadCostEstimate(
                                                                    order?.order_id
                                                                )
                                                            }
                                                            disabled={
                                                                downloadCostEstimate.isPending ||
                                                                !order?.order_id
                                                            }
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Download
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>

                            {quoteOrders.length > limit && (
                                <Card className="bg-card/80 backdrop-blur-sm border-border/40 mt-6">
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
                                                        setPage((previousPage) =>
                                                            Math.max(1, previousPage - 1)
                                                        )
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
                            )}
                        </>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
