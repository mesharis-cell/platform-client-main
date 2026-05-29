"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Breadcrumb } from "@/components/client-header";
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
import { useClientAssetCategories } from "@/hooks/use-client-asset-categories";
import { useClientTeams } from "@/hooks/use-client-teams";
import { useToken } from "@/lib/auth/use-token";
import type { CatalogItem } from "@/types/collection";
import { CatalogCard } from "@/components/catalog/catalog-card";

/**
 * Shared catalog browser — the single source of the search + brand/category/team
 * filters + view tabs + grid + pagination. Used by BOTH /catalog (default,
 * add-to-cart cards) and /company/assets (edit-oriented cards). Pass `renderCard`
 * to change what each card does; everything about search/filtering/layout stays
 * identical across both pages by construction.
 */
export type CatalogBrowserProps = {
    title?: string;
    description?: string;
    badgeLabel?: string;
    showCounts?: boolean;
    defaultViewType?: "all" | "asset" | "collection";
    renderCard?: (item: CatalogItem) => ReactNode;
    breadcrumbs?: Breadcrumb[];
};

export function CatalogBrowser({
    title = "Browse items",
    description = "Find the items you need, check availability, and add them to your order.",
    badgeLabel = "Catalog",
    showCounts = true,
    defaultViewType = "all",
    renderCard,
    breadcrumbs,
}: CatalogBrowserProps) {
    const { user } = useToken();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedTeam, setSelectedTeam] = useState<string>("");
    const [viewType, setViewType] = useState<"asset" | "collection" | "all">(defaultViewType);
    const [page, setPage] = useState(1);

    const ITEMS_PER_PAGE = 24;
    const { data: brandsData } = useBrands({ limit: "100", company_id: user?.company_id });
    const { data: catalogData, isLoading } = useCatalog({
        search_term: searchQuery || undefined,
        brand: selectedBrand && selectedBrand !== "_all_" ? selectedBrand : undefined,
        category: selectedCategory && selectedCategory !== "_all_" ? selectedCategory : undefined,
        team: selectedTeam && selectedTeam !== "_all_" ? selectedTeam : undefined,
        type: viewType,
        limit: ITEMS_PER_PAGE,
        page,
    });

    const items = catalogData?.items || [];
    const brands = brandsData?.data || [];

    const { data: allCategoriesData } = useClientAssetCategories();
    const { data: allTeamsData } = useClientTeams();
    const categories = useMemo(
        () => (allCategoriesData || []).slice().sort((a, b) => a.name.localeCompare(b.name)),
        [allCategoriesData]
    );
    const teams = useMemo(
        () =>
            (allTeamsData || [])
                .map((t) => ({ id: t.id, name: t.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [allTeamsData]
    );

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedBrand("");
        setSelectedCategory("");
        setSelectedTeam("");
        setViewType(defaultViewType);
        setPage(1);
    };

    const hasActiveFilters =
        searchQuery ||
        selectedBrand ||
        selectedCategory ||
        selectedTeam ||
        viewType !== defaultViewType;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
            <div className="border-b border-border bg-card/70 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-8 py-10">
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <nav
                            aria-label="Breadcrumb"
                            className="mb-4 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground"
                        >
                            {breadcrumbs.map((crumb, i) => {
                                const isLast = i === breadcrumbs.length - 1;
                                return (
                                    <span
                                        key={`${crumb.label}-${i}`}
                                        className="flex items-center gap-1.5"
                                    >
                                        {crumb.href && !isLast ? (
                                            <Link
                                                href={crumb.href}
                                                className="transition-colors hover:text-foreground"
                                            >
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className={isLast ? "text-foreground" : undefined}
                                            >
                                                {crumb.label}
                                            </span>
                                        )}
                                        {!isLast && (
                                            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                        )}
                                    </span>
                                );
                            })}
                        </nav>
                    )}
                    <Badge className="mb-4">{badgeLabel}</Badge>
                    <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
                    <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
                    {showCounts && (
                        <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
                            <span>{catalogData?.totalFamilies ?? 0} assets</span>
                            <span>{catalogData?.totalCollections ?? 0} collections</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-8 py-8">
                <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Search assets or collections"
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
                                    <SelectItem key={category.id} value={category.id}>
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            {category.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {teams.length > 0 && (
                        <div>
                            <Select
                                value={selectedTeam || "_all_"}
                                onValueChange={(value) => {
                                    setSelectedTeam(value === "_all_" ? "" : value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full max-w-[200px]">
                                    <SelectValue placeholder="All departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_all_">All departments</SelectItem>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                                <TabsTrigger value="asset">Assets</TabsTrigger>
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
                            data-testid="client-catalog-browser"
                        >
                            {items.map((item) =>
                                renderCard ? (
                                    <div key={`${item.type}-${item.id}`}>{renderCard(item)}</div>
                                ) : (
                                    <CatalogCard key={`${item.type}-${item.id}`} item={item} />
                                )
                            )}
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
    );
}
