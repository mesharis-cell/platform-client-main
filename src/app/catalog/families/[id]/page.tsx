"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { FamilyStockList } from "@/components/catalog/family-stock-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogFamily } from "@/hooks/use-catalog";

export default function CatalogFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = useCatalogFamily(id);
    const family = data?.family;

    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-background">
                    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
                        <Skeleton className="h-6 w-48" />
                        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                            <Skeleton className="h-72 w-full rounded-xl" />
                            <Skeleton className="h-72 w-full rounded-xl" />
                        </div>
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </div>
            </ClientNav>
        );
    }

    if (!family) {
        return (
            <ClientNav>
                <div className="flex min-h-screen items-center justify-center p-8">
                    <div className="text-center">
                        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h1 className="text-xl font-semibold">Item not found</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This item is unavailable or outside your company scope.
                        </p>
                        <Link href="/catalog" className="mt-6 inline-block">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to catalog
                            </Button>
                        </Link>
                    </div>
                </div>
            </ClientNav>
        );
    }

    const heroImage = family.images[0]?.url;
    const isSerialized = family.stockMode === "INDIVIDUAL";

    return (
        <ClientNav>
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-6xl px-6 py-8">
                    {/* Breadcrumb */}
                    <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/catalog" className="hover:text-foreground transition-colors">
                            Catalog
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-foreground font-medium">{family.name}</span>
                    </nav>

                    {/* Hero: Image left, Info right */}
                    <div className="grid gap-6 lg:grid-cols-[1fr_320px] mb-10">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                            {heroImage ? (
                                <Image
                                    src={heroImage}
                                    alt={family.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-16 w-16 text-muted-foreground/15" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge variant="secondary">{family.category?.name ?? "Uncategorized"}</Badge>
                                    {family.brand?.name && (
                                        <Badge variant="outline">{family.brand.name}</Badge>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">{family.name}</h1>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-sm text-muted-foreground">Available</span>
                                    <span className="text-3xl font-bold text-emerald-600">
                                        {family.availableQuantity}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-sm">
                                    <span className="text-muted-foreground">Total inventory</span>
                                    <span className="font-medium">{family.totalQuantity}</span>
                                </div>
                                {Number(family.volume) > 0 && (
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="text-muted-foreground">Volume / unit</span>
                                        <span className="font-medium">
                                            {Number(family.volume).toFixed(2)} m³
                                        </span>
                                    </div>
                                )}
                                {Number(family.weight) > 0 && (
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="text-muted-foreground">Weight / unit</span>
                                        <span className="font-medium">
                                            {Number(family.weight).toFixed(1)} kg
                                        </span>
                                    </div>
                                )}
                            </div>

                            {family.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {family.description}
                                </p>
                            )}

                            {family.handlingTags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {family.handlingTags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-[10px]">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">
                            {isSerialized ? "Available units" : "Available inventory"}
                            <span className="text-muted-foreground font-normal ml-2 text-base">
                                ({family.stockRecords.length})
                            </span>
                        </h2>
                        <FamilyStockList
                            familyName={family.name}
                            stockRecords={family.stockRecords}
                            isSerialized={isSerialized}
                        />
                    </section>
                </div>
            </div>
        </ClientNav>
    );
}
