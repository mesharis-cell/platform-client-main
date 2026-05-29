"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyGate } from "../company-gate";
import { useCompanyAssets } from "@/hooks/use-company";

export default function CompanyAssetsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const { data, isLoading } = useCompanyAssets({
        page,
        limit: 24,
        search_term: search || undefined,
    });

    const assets: any[] = data?.data || [];
    const total: number = data?.meta?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / 24));

    return (
        <CompanyGate requiredPermission="company:edit_assets">
            <ClientNav>
                <ClientHeader
                    icon={Boxes}
                    title="Company Assets"
                    description="Browse your company's assets and edit their presentation details."
                />
                <div className="border-b border-border bg-card px-8 py-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="px-8 py-6">
                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full" />
                            ))}
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            No assets found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {assets.map((a) => (
                                <Card key={a.id} className="bg-card border-border overflow-hidden">
                                    <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                                        {a.on_display_image ? (
                                            <img
                                                src={a.on_display_image}
                                                alt={a.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Boxes className="h-10 w-10 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <CardContent className="p-3">
                                        <p className="font-mono font-bold text-sm truncate">
                                            {a.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {a.category || "—"}
                                            {a.brand?.name ? ` · ${a.brand.name}` : ""}
                                        </p>
                                        <Link href={`/company/assets/${a.id}`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-3 gap-2 font-mono text-xs"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit details
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

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
            </ClientNav>
        </CompanyGate>
    );
}
