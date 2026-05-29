"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useCompanySelfPickups } from "@/hooks/use-company";
import { PICKUP_STATUS_CONFIG, statusBadge } from "@/lib/order-status";

export default function CompanySelfPickupsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const { data, isLoading } = useCompanySelfPickups({
        page,
        limit: 20,
        search: search || undefined,
    });

    const pickups: any[] = data?.data?.self_pickups || [];
    const totalPages: number = data?.data?.total_pages || 1;

    return (
        <CompanyGate requiredPermission="company:view_all_orders">
            <ClientNav>
                <ClientHeader
                    icon={PackageCheck}
                    title="Company Self-Pickups"
                    description="Every self-pickup across your company. Open one to review and approve its quote."
                    breadcrumbs={[
                        { label: "Company", href: "/company" },
                        { label: "Self-Pickups" },
                    ]}
                />
                <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
                    <div className="container mx-auto px-6 py-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40 mb-6">
                            <CardContent className="pt-6">
                                <Input
                                    placeholder="Search by pickup ID..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="max-w-md"
                                />
                            </CardContent>
                        </Card>

                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border/50 hover:bg-muted/50">
                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                            Pickup ID
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                            Collector
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                            Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(6)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={3}>
                                                    <Skeleton className="h-6 w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : pickups.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center py-12 text-muted-foreground font-mono text-sm"
                                            >
                                                No self-pickups found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pickups.map((p) => {
                                            const badge = statusBadge(
                                                p.self_pickup_status,
                                                PICKUP_STATUS_CONFIG
                                            );
                                            return (
                                                <TableRow
                                                    key={p.id}
                                                    className="border-border/50 cursor-pointer"
                                                    onClick={() =>
                                                        router.push(
                                                            `/self-pickups/${p.id}?company=1`
                                                        )
                                                    }
                                                >
                                                    <TableCell className="font-mono font-medium">
                                                        {p.self_pickup_id}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {p.collector_name || "—"}
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
