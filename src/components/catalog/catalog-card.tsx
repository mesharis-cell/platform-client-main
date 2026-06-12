"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Boxes, Eye, Layers, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { CatalogAssetDetails, CatalogAssetItem, CatalogItem } from "@/types/collection";

function hexWithAlpha(hex: string | null | undefined, alphaHex: string) {
    if (!hex) return undefined;
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    return `${normalized}${alphaHex}`;
}

function cartDetails(asset: CatalogAssetDetails) {
    return {
        assetName: asset.name,
        availableQuantity: asset.availableQuantity,
        volume: Number(asset.volume),
        weight: Number(asset.weight),
        image: asset.onDisplayImage || asset.images[0]?.url,
        condition: asset.condition,
        conditionNotes: asset.conditionNotes,
        conditionImages: asset.images,
        refurbDaysEstimate: asset.refurbDaysEstimate,
        dimensionLength: Number(asset.dimensionLength),
        dimensionWidth: Number(asset.dimensionWidth),
        dimensionHeight: Number(asset.dimensionHeight),
        category: asset.category,
    };
}

function catalogAssetCartDetails(asset: CatalogAssetItem) {
    return {
        assetName: asset.name,
        availableQuantity: asset.availableQuantity,
        volume: Number(asset.volume),
        weight: Number(asset.weight),
        image: asset.onDisplayImage || asset.images[0],
        condition: asset.condition,
        conditionNotes: asset.conditionNotes || undefined,
        conditionImages: asset.images.map((url) => ({ url })),
        refurbDaysEstimate: asset.refurbDaysEstimate || undefined,
        dimensionLength: Number(asset.dimensionLength),
        dimensionWidth: Number(asset.dimensionWidth),
        dimensionHeight: Number(asset.dimensionHeight),
        category: asset.category || "",
    };
}

export function CatalogCard({ item }: { item: CatalogItem }) {
    const { addItem, openCart } = useCart();
    const [pickerOpen, setPickerOpen] = useState(false);
    const isCollection = item.type === "collection";
    const isGroup = item.type === "group";
    const isAsset = item.type === "asset";
    const detailAssetId = isGroup ? item.siblings[0]?.id || item.id : item.id;
    const href = isCollection
        ? `/catalog/collections/${item.id}`
        : `/catalog/assets/${detailAssetId}`;
    const image = !isCollection ? item.onDisplayImage || item.images[0] : item.images[0];
    const Fallback = isCollection ? Layers : Boxes;

    const categoryColor = item.categoryRef?.color || null;
    const catBg = hexWithAlpha(categoryColor, "1A");
    const catText = categoryColor || undefined;
    const catBorder = hexWithAlpha(categoryColor, "40");

    const availability = !isCollection
        ? {
              available: item.availableQuantity,
              total: item.totalQuantity,
          }
        : null;
    const conditionFlags = !isCollection
        ? {
              red: item.conditionSummary?.red ?? 0,
              orange: item.conditionSummary?.orange ?? 0,
          }
        : null;
    const canAddDirectly = !isCollection && (!isGroup || item.siblings.length > 0);

    const addFirstAvailable = () => {
        if (!isGroup) return;
        const asset =
            item.siblings.find((sibling) => sibling.availableQuantity > 0) ?? item.siblings[0];
        if (!asset) {
            return;
        }
        addItem(asset.id, 1, cartDetails(asset));
        openCart();
    };

    const addAsset = () => {
        if (!isAsset) return;
        addItem(item.id, 1, catalogAssetCartDetails(item));
        openCart();
    };

    return (
        <div
            data-testid={
                isCollection
                    ? "client-collection-card"
                    : isGroup
                      ? "client-group-card"
                      : "client-asset-card"
            }
            className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        >
            <div className="bg-muted/30">
                <Link href={href} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                        {image ? (
                            <Image
                                src={image}
                                alt={item.name}
                                fill
                                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                                className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Fallback className="h-20 w-20 text-muted-foreground/25" />
                            </div>
                        )}

                        {item.brand && (
                            <div className="absolute left-3 top-3">
                                <Badge
                                    variant="secondary"
                                    className="border-border/50 bg-background/85 text-[10px] font-medium text-foreground/80 backdrop-blur-sm"
                                >
                                    {item.brand.name}
                                </Badge>
                            </div>
                        )}

                        {isGroup && (
                            <div className="absolute right-3 top-3">
                                <Badge className="bg-background/85 text-[10px] text-foreground shadow-sm backdrop-blur-sm hover:bg-background/85">
                                    {item.siblingCount} stock records
                                </Badge>
                            </div>
                        )}

                        {!isCollection &&
                            conditionFlags &&
                            (conditionFlags.red > 0 || conditionFlags.orange > 0) && (
                                <div className="absolute bottom-3 left-3">
                                    <Badge
                                        variant="outline"
                                        className={
                                            conditionFlags.red > 0
                                                ? "bg-red-500/10 text-red-700 border-red-500/25 backdrop-blur-sm text-[10px]"
                                                : "bg-amber-500/10 text-amber-700 border-amber-500/25 backdrop-blur-sm text-[10px]"
                                        }
                                    >
                                        <AlertCircle className="mr-1 h-2.5 w-2.5" />
                                        {conditionFlags.red > 0
                                            ? `${conditionFlags.red} need repair`
                                            : `${conditionFlags.orange} minor`}
                                    </Badge>
                                </div>
                            )}
                    </div>
                </Link>

                {isGroup && item.siblingThumbnails.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 border-t border-border/60 bg-background p-2">
                        {item.siblingThumbnails.slice(0, 3).map((thumb, index) => (
                            <div
                                key={`${thumb}-${index}`}
                                className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted/30"
                            >
                                <Image src={thumb} alt="" fill className="object-contain p-1" />
                            </div>
                        ))}
                        {Array.from({
                            length: Math.max(0, 3 - item.siblingThumbnails.slice(0, 3).length),
                        }).map((_, index) => (
                            <div
                                key={`empty-${index}`}
                                className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted/20"
                            >
                                <Boxes className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {isGroup && <Badge variant="secondary">Grouped</Badge>}
                        {item.category && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium"
                                style={
                                    categoryColor
                                        ? {
                                              backgroundColor: catBg,
                                              color: catText,
                                              borderColor: catBorder,
                                          }
                                        : undefined
                                }
                            >
                                {item.category}
                            </Badge>
                        )}
                        {!isCollection && (item as any).team && (
                            <Badge
                                variant="outline"
                                className="border-border/60 bg-muted/40 text-[10px] text-foreground/80"
                            >
                                {(item as any).team.name}
                            </Badge>
                        )}
                    </div>

                    <Link
                        href={href}
                        className="line-clamp-2 text-base font-semibold leading-tight text-foreground transition-colors hover:text-primary"
                    >
                        {item.name}
                    </Link>
                    {!isCollection && item.code && !isGroup && (
                        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                            {item.code}
                        </p>
                    )}
                </div>

                {availability ? (
                    <div className="text-sm">
                        <span
                            className={`font-mono font-bold ${
                                availability.available > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {availability.available}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                            {isGroup
                                ? `available across ${item.siblingCount} records`
                                : `of ${availability.total} available`}
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {(item as any).itemCount ?? 0} items
                    </p>
                )}

                <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2">
                    {isGroup ? (
                        <>
                            <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={addFirstAvailable}
                                disabled={!canAddDirectly}
                            >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Add
                            </Button>
                            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        Choose
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{item.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                                        {item.siblings.map((asset) => {
                                            const thumb =
                                                asset.onDisplayImage || asset.images[0]?.url;
                                            return (
                                                <div
                                                    key={asset.id}
                                                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30">
                                                            {thumb ? (
                                                                <Image
                                                                    src={thumb}
                                                                    alt=""
                                                                    fill
                                                                    className="object-contain p-1"
                                                                />
                                                            ) : (
                                                                <Boxes className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/catalog/assets/${asset.id}`}
                                                                className="block truncate font-medium hover:text-primary"
                                                            >
                                                                {asset.name}
                                                            </Link>
                                                            <p className="text-xs text-muted-foreground">
                                                                {asset.condition} ·{" "}
                                                                {asset.availableQuantity} available
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            addItem(
                                                                asset.id,
                                                                1,
                                                                cartDetails(asset)
                                                            );
                                                            setPickerOpen(false);
                                                            openCart();
                                                        }}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="icon" asChild aria-label="View details">
                                <Link href={href}>
                                    <Eye className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </>
                    ) : isAsset ? (
                        <>
                            <Button
                                size="sm"
                                className="col-span-2 gap-1.5"
                                onClick={addAsset}
                                disabled={!canAddDirectly}
                            >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Add to cart
                            </Button>
                            <Button variant="outline" size="icon" asChild aria-label="View details">
                                <Link href={href}>
                                    <Eye className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <Button variant="default" size="sm" className="col-span-3 gap-1.5" asChild>
                            <Link href={href}>
                                View Collection
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
