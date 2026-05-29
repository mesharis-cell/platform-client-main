"use client";

import { FileText, Download } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyGate } from "../company-gate";
import { useCompanyCostEstimates, useDownloadCompanyEstimate } from "@/hooks/use-company";

export default function CompanyCostEstimatesPage() {
    const { data, isLoading } = useCompanyCostEstimates();
    const download = useDownloadCompanyEstimate();
    const estimates: any[] = data?.data || [];

    const handleDownload = async (e: {
        id: string;
        entity_type: "ORDER" | "SELF_PICKUP";
        reference_id?: string;
    }) => {
        const blob = await download.mutateAsync({ id: e.id, entity_type: e.entity_type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cost-estimate-${e.reference_id || e.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <CompanyGate requiredPermission="company:view_estimates">
            <ClientNav>
                <ClientHeader
                    icon={FileText}
                    title="Cost Estimates"
                    description="Sell-side cost estimates across your company's orders and self-pickups."
                />
                <div className="px-8 py-6 space-y-3">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : estimates.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            No cost estimates yet.
                        </div>
                    ) : (
                        estimates.map((e) => (
                            <Card
                                key={`${e.entity_type}-${e.id}`}
                                className="bg-card border-border"
                            >
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono font-bold text-sm">
                                                {e.reference_id}
                                            </p>
                                            <Badge className="font-mono text-[9px] uppercase border bg-muted text-muted-foreground border-border">
                                                {e.entity_type === "SELF_PICKUP"
                                                    ? "Self-Pickup"
                                                    : "Order"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {e.title || "—"}
                                            {e.created_by_name ? ` · by ${e.created_by_name}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {e.final_total ? (
                                            <span className="font-mono text-sm">
                                                {Number(e.final_total).toLocaleString()} AED
                                            </span>
                                        ) : null}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={download.isPending}
                                            onClick={() =>
                                                handleDownload({
                                                    id: e.id,
                                                    entity_type: e.entity_type,
                                                    reference_id: e.reference_id,
                                                })
                                            }
                                            className="gap-2 font-mono text-xs"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            PDF
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
