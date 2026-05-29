"use client";

import { useState } from "react";
import Link from "next/link";
import { PackageCheck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyGate } from "../company-gate";
import { useCompanySelfPickups } from "@/hooks/use-company";

export default function CompanySelfPickupsPage() {
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
                />
                <div className="border-b border-border bg-card px-8 py-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search pickup ID…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="px-8 py-6 space-y-3">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : pickups.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            No self-pickups found.
                        </div>
                    ) : (
                        pickups.map((p) => (
                            <Link
                                key={p.id}
                                href={`/self-pickups/${p.id}?company=1`}
                                className="block"
                            >
                                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-mono font-bold text-sm">
                                                {p.self_pickup_id}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {p.collector_name || "—"}
                                            </p>
                                        </div>
                                        <Badge className="font-mono text-[10px] uppercase border bg-muted text-foreground border-border whitespace-nowrap shrink-0">
                                            {String(p.self_pickup_status).replace(/_/g, " ")}
                                        </Badge>
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
