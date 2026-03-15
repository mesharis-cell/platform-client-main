"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Boxes, ChevronRight, Package, Tag } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { FamilyStockList } from "@/components/catalog/family-stock-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogFamily } from "@/hooks/use-catalog";

export default function CatalogFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = useCatalogFamily(id);

    const family = data?.family;

    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-background p-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </ClientNav>
        );
    }

    if (!family) {
        return (
            <ClientNav>
                <div className="flex min-h-screen items-center justify-center p-8">
                    <Card className="max-w-md">
                        <CardContent className="p-10 text-center">
                            <Boxes className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                            <h1 className="text-2xl font-semibold">Asset family not found</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                The requested family is unavailable or outside your company scope.
                            </p>
                            <Link href="/catalog" className="mt-6 inline-block">
                                <Button>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to catalog
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </ClientNav>
        );
    }

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
                <div className="mx-auto max-w-7xl px-8 py-10">
                    <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/catalog" className="hover:text-foreground">
                            Catalog
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground">{family.name}</span>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
                        <div className="space-y-6">
                            <div className="overflow-hidden rounded-2xl border bg-card">
                                <div className="relative aspect-[16/8] bg-muted">
                                    {family.images[0]?.url ? (
                                        <Image
                                            src={family.images[0].url}
                                            alt={family.name}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-20 w-20 text-muted-foreground/20" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4 p-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge>Family</Badge>
                                        <Badge variant="outline">{family.stockMode}</Badge>
                                        {family.brand?.name && (
                                            <Badge variant="outline">
                                                <Tag className="mr-1 h-3 w-3" />
                                                {family.brand.name}
                                            </Badge>
                                        )}
                                        <Badge variant="outline">{family.category}</Badge>
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold">{family.name}</h1>
                                        {family.description && (
                                            <p className="mt-3 max-w-3xl text-muted-foreground">
                                                {family.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold">Available stock</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Checkout still works on stock records. Choose the
                                            specific stock row you want to order.
                                        </p>
                                    </div>
                                </div>
                                <FamilyStockList
                                    familyName={family.name}
                                    stockRecords={family.stockRecords}
                                />
                            </section>
                        </div>

                        <div className="space-y-4">
                            <Card data-testid="client-family-availability">
                                <CardContent className="grid gap-4 p-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Available quantity
                                        </p>
                                        <p className="text-3xl font-bold">
                                            {family.availableQuantity}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Total quantity</p>
                                            <p className="font-semibold">{family.totalQuantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Stock records</p>
                                            <p className="font-semibold">
                                                {family.stockRecordCount}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Volume / unit</p>
                                            <p className="font-semibold">
                                                {Number(family.volume).toFixed(2)} m3
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Weight / unit</p>
                                            <p className="font-semibold">
                                                {Number(family.weight).toFixed(1)} kg
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="grid grid-cols-3 gap-4 p-6 text-center">
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Green
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {family.conditionSummary.green}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Orange
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {family.conditionSummary.orange}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Red
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {family.conditionSummary.red}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </ClientNav>
    );
}
