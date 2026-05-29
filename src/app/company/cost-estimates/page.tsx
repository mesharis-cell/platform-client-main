"use client";

import { FileText, Download, Loader2 } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useCompanyCostEstimates, useDownloadCompanyEstimate } from "@/hooks/use-company";
import { ORDER_STATUS_CONFIG, PICKUP_STATUS_CONFIG, statusBadge } from "@/lib/order-status";

export default function CompanyCostEstimatesPage() {
    const { data, isLoading } = useCompanyCostEstimates();
    const download = useDownloadCompanyEstimate();
    const estimates: any[] = data?.data?.data || [];
    // Track which row is downloading so only its button spins.
    const downloadingId = download.isPending ? (download.variables as any)?.id : null;

    const handleDownload = (e: {
        id: string;
        entity_type: "ORDER" | "SELF_PICKUP";
        reference_id?: string;
    }) =>
        download.mutateAsync({ id: e.id, entity_type: e.entity_type }).then((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${e.reference_id || e.id}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        });

    return (
        <CompanyGate requiredPermission="company:view_estimates">
            <ClientNav>
                <ClientHeader
                    icon={FileText}
                    title="Cost Estimates"
                    description="Cost estimates across your company's orders and self-pickups. Download the PDF for full pricing."
                />
                <div className="px-8 py-6">
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50 hover:bg-muted/50">
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Reference
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Type
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Ordered By
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Status
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                        Estimate
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5}>
                                                <Skeleton className="h-6 w-full" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : estimates.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="text-center py-12 text-muted-foreground font-mono text-sm"
                                        >
                                            No cost estimates yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    estimates.map((e) => {
                                        const isSP = e.entity_type === "SELF_PICKUP";
                                        const badge = statusBadge(
                                            e.status,
                                            isSP ? PICKUP_STATUS_CONFIG : ORDER_STATUS_CONFIG
                                        );
                                        const busy = downloadingId === e.id;
                                        return (
                                            <TableRow
                                                key={`${e.entity_type}-${e.id}`}
                                                className="border-border/50"
                                            >
                                                <TableCell className="font-mono font-medium">
                                                    {e.reference_id}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px] uppercase border bg-muted text-muted-foreground"
                                                    >
                                                        {isSP ? "Self-Pickup" : "Order"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {e.created_by_name || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${badge.color} font-medium border whitespace-nowrap`}
                                                    >
                                                        {badge.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            handleDownload({
                                                                id: e.id,
                                                                entity_type: e.entity_type,
                                                                reference_id: e.reference_id,
                                                            })
                                                        }
                                                        className="gap-2 font-mono text-xs"
                                                    >
                                                        {busy ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Download className="h-3.5 w-3.5" />
                                                        )}
                                                        PDF
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
