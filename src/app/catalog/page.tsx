"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Boxes, ChevronLeft, ChevronRight, Layers, Package, Search, Tag } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrands } from "@/hooks/use-brands";
import { useCatalog } from "@/hooks/use-catalog";
import { useToken } from "@/lib/auth/use-token";
import type {
    CatalogAssetFamilyItem,
    CatalogCollectionItem,
    CatalogItem,
} from "@/types/collection";

function CatalogCard({ item }: { item: CatalogItem }) {
    const href =
        item.type === "family" ? `/catalog/families/${item.id}` : `/catalog/collections/${item.id}`;
    const image = item.images[0];

    return (
        <Card
            className="h-full overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm"
            data-testid={item.type === "family" ? "client-family-card" : "client-collection-card"}
        >
            <Link href={href} className="block h-full">
                <div className="relative aspect-[4/3] bg-muted">
                    {image ? (
                        <Image src={image} alt={item.name} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            {item.type === "family" ? (
                                <Boxes className="h-16 w-16 text-muted-foreground/20" />
                            ) : (
                                <Layers className="h-16 w-16 text-muted-foreground/20" />
                            )}
                        </div>
                    )}
                </div>
                <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge>{item.type === "family" ? "Family" : "Collection"}</Badge>
                        {item.type === "family" && (
                            <Badge variant="outline">{item.stockMode}</Badge>
                        )}
                        {item.brand && (
                            <Badge variant="outline">
                                <Tag className="mr-1 h-3 w-3" />
                                {item.brand.name}
                            </Badge>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold">{item.name}</h2>
                        {item.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{item.category || "Uncategorized"}</span>
                        {item.type === "family" ? (
                            <>
                                <span>{item.availableQuantity} available</span>
                                <span>{item.stockRecordCount} stock records</span>
                            </>
                        ) : (
                            <span>{item.itemCount} items</span>
                        )}
                    </div>

                    {item.type === "family" && (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border p-3">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Total quantity
                                </p>
                                <p className="text-lg font-semibold">{item.totalQuantity}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Condition issues
                                </p>
                                <p className="text-lg font-semibold">
                                    {item.conditionSummary.orange + item.conditionSummary.red}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-1">
                        <Button className="w-full" variant="outline">
                            {item.type === "family" ? "Browse stock" : "View collection"}
                        </Button>
                    </div>
                </CardContent>
            </Link>
        </Card>
    );
}

export default function CatalogPage() {
    const { user } = useToken();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [viewType, setViewType] = useState<"family" | "collection" | "all">("all");
    const [page, setPage] = useState(1);

    const ITEMS_PER_PAGE = 24;
    const { data: brandsData } = useBrands({ limit: "100", company_id: user?.company_id });
    const { data: catalogData, isLoading } = useCatalog({
        search_term: searchQuery || undefined,
        brand: selectedBrand && selectedBrand !== "_all_" ? selectedBrand : undefined,
        category: selectedCategory && selectedCategory !== "_all_" ? selectedCategory : undefined,
        type: viewType,
        limit: ITEMS_PER_PAGE,
        page,
    });

    const items = catalogData?.items || [];
    const brands = brandsData?.data || [];
    const categories = useMemo(
        () =>
            Array.from(
                new Set(items.map((item) => item.category).filter(Boolean) as string[])
            ).sort(),
        [items]
    );

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedBrand("");
        setSelectedCategory("");
        setViewType("all");
        setPage(1);
    };

    const hasActiveFilters = searchQuery || selectedBrand || selectedCategory || viewType !== "all";

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
                <div className="border-b border-border bg-card/70 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-8 py-10">
                        <Badge className="mb-4">Asset Catalog</Badge>
                        <h1 className="text-5xl font-bold tracking-tight">Browse by family</h1>
                        <p className="mt-3 max-w-3xl text-muted-foreground">
                            Families are the catalog identity. Checkout still uses the underlying
                            stock records, so you can browse by family and select the exact stock
                            row before ordering.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
                            <span>{catalogData?.totalFamilies ?? 0} families</span>
                            <span>{catalogData?.totalCollections ?? 0} collections</span>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-8 py-8">
                    <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Search families or collections"
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>

                            <Select
                                value={selectedBrand || "_all_"}
                                onValueChange={(value) => {
                                    setSelectedBrand(value === "_all_" ? "" : value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_all_">All brands</SelectItem>
                                    {brands.map((brand: any) => (
                                        <SelectItem key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedCategory || "_all_"}
                                onValueChange={(value) => {
                                    setSelectedCategory(value === "_all_" ? "" : value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_all_">All categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <Tabs
                                value={viewType}
                                onValueChange={(value) => {
                                    setViewType(value as typeof viewType);
                                    setPage(1);
                                }}
                            >
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="family">Families</TabsTrigger>
                                    <TabsTrigger value="collection">Collections</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {hasActiveFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <Card key={index}>
                                        <Skeleton className="aspect-[4/3] w-full" />
                                        <CardContent className="space-y-3 p-5">
                                            <Skeleton className="h-5 w-1/3" />
                                            <Skeleton className="h-7 w-2/3" />
                                            <Skeleton className="h-4 w-full" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                                    <h2 className="text-2xl font-semibold">No catalog results</h2>
                                    <p className="mt-2 text-muted-foreground">
                                        Adjust the filters or search query and try again.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div
                                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                                data-testid="client-family-browser"
                            >
                                {items.map((item) => (
                                    <CatalogCard key={`${item.type}-${item.id}`} item={item} />
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
                            <span>
                                Showing {items.length} of {catalogData?.total ?? 0} results
                            </span>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Previous
                                </Button>
                                <span>
                                    Page {page} of {catalogData?.totalPages ?? 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= (catalogData?.totalPages ?? 1)}
                                    onClick={() => setPage((current) => current + 1)}
                                >
                                    Next
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ClientNav>
    );
}
