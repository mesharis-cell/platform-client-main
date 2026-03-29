"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";

interface ReportConfig {
    id: string;
    title: string;
    description: string;
    endpoint: string;
    filename: string;
    supportsDateRange: boolean;
}

const REPORTS: ReportConfig[] = [
    {
        id: "orders",
        title: "My Orders",
        description:
            "Full export of your orders including status, event dates, items, and pricing.",
        endpoint: "/operations/v1/export/orders",
        filename: "my-orders",
        supportsDateRange: true,
    },
    {
        id: "orderHistory",
        title: "Order History",
        description: "Timeline of your orders with status changes and financial snapshots.",
        endpoint: "/operations/v1/export/order-history",
        filename: "order-history",
        supportsDateRange: true,
    },
    {
        id: "assetUtilization",
        title: "Asset Utilization",
        description:
            "Items you've used, how often, and how recently. Useful for planning future orders.",
        endpoint: "/operations/v1/export/asset-utilization",
        filename: "asset-utilization",
        supportsDateRange: false,
    },
];

export default function ClientReportsPage() {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [downloading, setDownloading] = useState<string | null>(null);

    async function handleDownload(report: ReportConfig) {
        setDownloading(report.id);
        try {
            const params = new URLSearchParams();
            if (report.supportsDateRange) {
                if (dateFrom) params.set("dateFrom", dateFrom);
                if (dateTo) params.set("dateTo", dateTo);
            }

            const response = await apiClient.get(
                `${report.endpoint}${params.toString() ? `?${params}` : ""}`,
                { responseType: "blob" }
            );

            const blob = new Blob([response.data], { type: "text/csv" });
            /* eslint-disable no-undef */
            const rg =
                typeof globalThis !== "undefined"
                    ? (globalThis as unknown as Record<string, unknown>)
                    : undefined;
            /* eslint-enable no-undef */
            const doc = rg?.["document"] as Document | undefined;
            if (!doc) return;
            const url = URL.createObjectURL(blob);
            const a = doc.createElement("a");
            a.href = url;
            a.download = `${report.filename}-${new Date().toISOString().split("T")[0]}.csv`;
            doc.body.appendChild(a);
            a.click();
            doc.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(`${report.title} downloaded`);
        } catch {
            toast.error(`Failed to download ${report.title}`);
        } finally {
            setDownloading(null);
        }
    }

    const hasDateFilter = dateFrom || dateTo;

    return (
        <ClientNav>
            <div className="min-h-screen bg-background">
                <ClientHeader
                    icon={FileSpreadsheet}
                    title="Reports"
                    description="Download reports and data exports"
                />

                <div className="container mx-auto px-6 py-8 space-y-6">
                    {/* Date range filter */}
                    <Card>
                        <CardContent className="py-4">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">From</Label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">To</Label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                                {hasDateFilter && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setDateFrom("");
                                            setDateTo("");
                                        }}
                                    >
                                        Clear dates
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Report cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {REPORTS.map((report) => {
                            const isDownloading = downloading === report.id;

                            return (
                                <Card key={report.id}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                                            {report.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {report.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                            disabled={isDownloading}
                                            onClick={() => handleDownload(report)}
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Downloading...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download CSV
                                                </>
                                            )}
                                        </Button>
                                        {!report.supportsDateRange && hasDateFilter && (
                                            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                                Date filter not applicable
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ClientNav>
    );
}
