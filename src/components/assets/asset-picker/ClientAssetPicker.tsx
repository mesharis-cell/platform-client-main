"use client";

/**
 * ClientAssetPicker — the CLIENT data adapter for the canonical AssetPicker.
 *
 * NOT a synced canonical file. This is the client surface's data adapter: it owns
 * the search / facet / page state, calls useCatalog (/client/v1/catalog), maps the
 * resulting CatalogItem rows to the normalized AssetPickerItem shape, and feeds
 * brand / category / team facet options. The core <AssetPicker> stays data-
 * agnostic so admin/warehouse can inject their own ops adapter against the same
 * component. Collections are excluded — only assets / grouped families are addable
 * one asset_id at a time.
 *
 * `onConfirm` re-emits the picker's selections to the surface unchanged (the
 * editor stages them into its add-ops). The adapter only adds NAMES (the picker
 * works in ids; the editor needs the display name for its staged-add rows), so it
 * exposes an `onConfirmWithNames` callback alongside the raw selections.
 */

import { useMemo, useState } from "react";
import { useBrands } from "@/hooks/use-brands";
import { useCatalog } from "@/hooks/use-catalog";
import { useClientAssetCategories } from "@/hooks/use-client-asset-categories";
import { useClientTeams } from "@/hooks/use-client-teams";
import { useToken } from "@/lib/auth/use-token";
import type { CatalogItem } from "@/types/collection";
import { OrangeDecisionCard } from "@/components/checkout/OrangeDecisionCard";
import { AssetPicker } from "./AssetPicker";
import type {
    AssetCondition,
    AssetPickerFilterValues,
    AssetPickerItem,
    AssetPickerSelection,
} from "./types";

const ITEMS_PER_PAGE = 24;

function toCondition(value: unknown): AssetCondition {
    return value === "RED" || value === "ORANGE" ? value : "GREEN";
}

/** Map a CatalogItem (asset or group) → AssetPickerItem. Collections return null. */
function mapCatalogItem(item: CatalogItem): AssetPickerItem | null {
    if (item.type === "collection") return null;

    if (item.type === "group") {
        return {
            id: item.id,
            name: item.name,
            code: item.code ?? null,
            category: item.category ?? null,
            categoryColor: item.categoryRef?.color ?? null,
            brand: item.brand?.name ?? null,
            imageUrl: item.onDisplayImage || item.images[0] || null,
            availableQuantity: item.availableQuantity,
            condition: toCondition(item.condition),
            conditionNotes: item.conditionNotes ?? null,
            refurbDaysEstimate: item.refurbDaysEstimate ?? null,
            grouped: true,
            siblings: (item.siblings ?? []).map((sibling) => ({
                id: sibling.id,
                name: sibling.name,
                availableQuantity: sibling.availableQuantity,
                condition: toCondition(sibling.condition),
                conditionNotes: sibling.conditionNotes ?? null,
                conditionPhotos: (sibling.images ?? []).map((img) => ({
                    url: img.url,
                    note: img.note,
                })),
                refurbDaysEstimate: sibling.refurbDaysEstimate ?? null,
                imageUrl: sibling.onDisplayImage || sibling.images[0]?.url || null,
            })),
        };
    }

    // type === "asset"
    return {
        id: item.id,
        name: item.name,
        code: item.code ?? null,
        category: item.category ?? null,
        categoryColor: item.categoryRef?.color ?? null,
        brand: item.brand?.name ?? null,
        imageUrl: item.onDisplayImage || item.images[0] || null,
        availableQuantity: item.availableQuantity,
        condition: toCondition(item.condition),
        conditionNotes: item.conditionNotes ?? null,
        // The catalog asset row carries plain image URLs (string[]); surface them
        // as photos so the ORANGE decision card has something to show.
        conditionPhotos: item.images.map((url) => ({ url })),
        refurbDaysEstimate: item.refurbDaysEstimate ?? null,
        grouped: false,
    };
}

/** A confirmed selection enriched with the chosen asset's display name. */
export interface NamedAssetSelection extends AssetPickerSelection {
    name: string;
}

export function ClientAssetPicker({
    alreadyOnEntity,
    conditionDecision = "require",
    entityNoun = "order",
    onConfirm,
}: {
    alreadyOnEntity?: string[];
    /** "require" (orders + SP — both have ORANGE) | "none". */
    conditionDecision?: "require" | "none";
    entityNoun?: string;
    /** Selections enriched with the chosen asset's display name. */
    onConfirm: (selections: NamedAssetSelection[]) => void;
}) {
    const { user } = useToken();
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<AssetPickerFilterValues>({});
    const [page, setPage] = useState(1);

    // No upstream debounce hook in this repo; useCatalog's staleTime + react-query
    // dedupe keep this cheap, matching the existing CatalogBrowser behavior.
    const { data: catalogData, isLoading } = useCatalog({
        search_term: searchTerm || undefined,
        brand: filters.brand,
        category: filters.category,
        team: filters.team,
        // Only assets / grouped families are addable.
        type: "asset",
        limit: ITEMS_PER_PAGE,
        page,
    });

    const { data: brandsData } = useBrands({ limit: "100", company_id: user?.company_id });
    const { data: categoriesData } = useClientAssetCategories();
    const { data: teamsData } = useClientTeams();

    const rawItems = catalogData?.items ?? [];
    const items = useMemo(
        () => rawItems.map(mapCatalogItem).filter((i): i is AssetPickerItem => i !== null),
        [rawItems]
    );

    // Index name by the asset_id that the picker will emit (asset id OR sibling id).
    const nameByAssetId = useMemo(() => {
        const map = new Map<string, string>();
        for (const item of items) {
            map.set(item.id, item.name);
            for (const sibling of item.siblings ?? []) {
                map.set(sibling.id, sibling.name || item.name);
            }
        }
        return map;
    }, [items]);

    const facets = useMemo(
        () => ({
            brand: (brandsData?.data ?? []).map((b: { id: string; name: string }) => ({
                value: b.id,
                label: b.name,
            })),
            category: (categoriesData ?? [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => ({ value: c.id, label: c.name, color: c.color })),
            team: (teamsData ?? [])
                .map((t) => ({ value: t.id, label: t.name }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        }),
        [brandsData, categoriesData, teamsData]
    );

    return (
        <AssetPicker
            mode="client"
            items={items}
            isLoading={isLoading}
            onSearch={(term) => {
                setSearchTerm(term);
                setPage(1);
            }}
            facets={facets}
            filterValues={filters}
            onFilterChange={(next) => {
                setFilters(next);
                setPage(1);
            }}
            alreadyOnEntity={alreadyOnEntity}
            multiSelect
            withQuantity
            conditionDecision={conditionDecision}
            entityNoun={entityNoun}
            renderDecision={(args) => <OrangeDecisionCard {...args} />}
            onConfirm={(selections) => {
                onConfirm(
                    selections.map((s) => ({
                        ...s,
                        name: nameByAssetId.get(s.assetId) ?? "Asset",
                    }))
                );
            }}
            pagination={{
                page,
                totalPages: catalogData?.totalPages ?? 1,
                onPrev: () => setPage((p) => Math.max(1, p - 1)),
                onNext: () => setPage((p) => p + 1),
                total: catalogData?.total,
                shown: items.length,
            }}
        />
    );
}
