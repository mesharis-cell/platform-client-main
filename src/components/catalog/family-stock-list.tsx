"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useCart } from "@/contexts/cart-context";
import type { CatalogFamilyStockItem } from "@/types/collection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertCircle, Check, ExternalLink, Package, ShoppingCart, X } from "lucide-react";

function buildCartDetails(stock: CatalogFamilyStockItem) {
    return {
        assetName: stock.name,
        availableQuantity: stock.availableQuantity,
        volume: Number(stock.volume),
        weight: Number(stock.weight),
        dimensionLength: Number(stock.dimensionLength),
        dimensionWidth: Number(stock.dimensionWidth),
        dimensionHeight: Number(stock.dimensionHeight),
        category: stock.category,
        image: stock.images[0]?.url,
        condition: stock.condition,
        conditionNotes: stock.conditionNotes,
        conditionImages: stock.images,
        refurbDaysEstimate: stock.refurbDaysEstimate,
    };
}

const CONDITION_CLASSES: Record<string, string> = {
    RED: "bg-red-500/10 text-red-700 border-red-500/20",
    ORANGE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    GREEN: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

export function FamilyStockList({
    familyName,
    stockRecords,
    isSerialized = false,
}: {
    familyName: string;
    stockRecords: CatalogFamilyStockItem[];
    isSerialized?: boolean;
}) {
    const { addItem, openCart } = useCart();
    const [previewItem, setPreviewItem] = useState<CatalogFamilyStockItem | null>(null);
    const [previewImgIdx, setPreviewImgIdx] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const availableItems = stockRecords.filter((s) => s.availableQuantity > 0);
    const unavailableItems = stockRecords.filter((s) => s.availableQuantity < 1);
    const hasSelection = selected.size > 0;

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function selectAll() {
        setSelected(new Set(availableItems.map((s) => s.id)));
    }

    function clearSelection() {
        setSelected(new Set());
    }

    function handleAddSingle(stock: CatalogFamilyStockItem) {
        if (stock.availableQuantity < 1) {
            toast.error("This item is currently unavailable");
            return;
        }
        addItem(stock.id, 1, buildCartDetails(stock));
        openCart();
    }

    function handleAddSelected() {
        const items = availableItems.filter((s) => selected.has(s.id));
        if (items.length === 0) return;

        items.forEach((stock) => {
            addItem(stock.id, 1, buildCartDetails(stock));
        });

        toast.success(`${items.length} item${items.length > 1 ? "s" : ""} added to cart`);
        setSelected(new Set());
        openCart();
    }

    if (stockRecords.length === 0) {
        return (
            <div
                className="rounded-xl border border-dashed border-border py-12 text-center"
                data-testid="family-stock-empty"
            >
                <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">No items available</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Check back later for availability.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Selection toolbar */}
            {availableItems.length > 1 && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={hasSelection ? clearSelection : selectAll}
                        >
                            {hasSelection ? (
                                <>
                                    <X className="h-3.5 w-3.5 mr-1.5" />
                                    Clear ({selected.size})
                                </>
                            ) : (
                                <>
                                    <Check className="h-3.5 w-3.5 mr-1.5" />
                                    Select all
                                </>
                            )}
                        </Button>
                        {hasSelection && (
                            <span className="text-sm text-muted-foreground">
                                {selected.size} selected
                            </span>
                        )}
                    </div>
                    {hasSelection && (
                        <Button
                            size="sm"
                            onClick={handleAddSelected}
                            data-testid="family-stock-add-selected"
                        >
                            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                            Add {selected.size} to cart
                        </Button>
                    )}
                </div>
            )}

            {availableItems.length === 0 ? (
                <div
                    className="rounded-xl border border-dashed border-border py-12 text-center"
                    data-testid="family-stock-empty"
                >
                    <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="font-medium">No items available right now</p>
                    <p className="mt-1 text-sm text-muted-foreground">Check back later.</p>
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    data-testid="family-stock-list"
                >
                    {availableItems.map((stock) => {
                        const isDanger = stock.condition === "RED";
                        const isWarning = stock.condition === "ORANGE";
                        const stockImage = stock.images[0]?.url;
                        const conditionClass =
                            CONDITION_CLASSES[stock.condition] || CONDITION_CLASSES.GREEN;
                        const isSelected = selected.has(stock.id);

                        return (
                            <Card
                                key={stock.id}
                                className={`group overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"}`}
                                data-testid="family-stock-card"
                            >
                                <button
                                    onClick={() => {
                                        setPreviewItem(stock);
                                        setPreviewImgIdx(0);
                                    }}
                                    className="relative aspect-[4/3] w-full bg-muted block"
                                >
                                    {stockImage ? (
                                        <Image
                                            src={stockImage}
                                            alt={stock.name}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-8 w-8 text-muted-foreground/20" />
                                        </div>
                                    )}
                                    {(isDanger || isWarning) && (
                                        <Badge
                                            variant="outline"
                                            className={`absolute top-2 left-2 text-[10px] ${conditionClass}`}
                                        >
                                            <AlertCircle className="mr-1 h-2.5 w-2.5" />
                                            {stock.condition}
                                        </Badge>
                                    )}
                                    {/* Selection checkbox overlay */}
                                    {availableItems.length > 1 && (
                                        <div
                                            className="absolute top-2 right-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelect(stock.id);
                                            }}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
                                            />
                                        </div>
                                    )}
                                </button>

                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium truncate">{stock.name}</p>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] shrink-0 ${conditionClass}`}
                                        >
                                            {stock.condition}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {isSerialized ? (
                                            <span>1 unit</span>
                                        ) : (
                                            <span>{stock.availableQuantity} available</span>
                                        )}
                                        {Number(stock.weight) > 0 && (
                                            <span>{Number(stock.weight).toFixed(1)} kg</span>
                                        )}
                                        {Number(stock.dimensionLength) > 0 && (
                                            <span>
                                                {Number(stock.dimensionLength).toFixed(0)}×
                                                {Number(stock.dimensionWidth).toFixed(0)}×
                                                {Number(stock.dimensionHeight).toFixed(0)} cm
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleAddSingle(stock)}
                                            data-testid="family-stock-add"
                                        >
                                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                                            Add to cart
                                        </Button>
                                        <Button size="sm" variant="outline" asChild>
                                            <a
                                                href={`/catalog/assets/${stock.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Full details
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Unavailable items */}
            {unavailableItems.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        Unavailable ({unavailableItems.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
                        {unavailableItems.map((stock) => (
                            <div
                                key={stock.id}
                                className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"
                            >
                                <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden">
                                    {stock.images[0]?.url ? (
                                        <Image
                                            src={stock.images[0].url}
                                            alt={stock.name}
                                            width={40}
                                            height={40}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-4 w-4 text-muted-foreground/20" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{stock.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Currently unavailable
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview modal */}
            <Dialog
                open={!!previewItem}
                onOpenChange={(open) => {
                    if (!open) setPreviewItem(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                    {previewItem && (
                        <>
                            <div className="relative aspect-[16/10] bg-muted">
                                {previewItem.images[previewImgIdx]?.url ? (
                                    <Image
                                        src={previewItem.images[previewImgIdx].url}
                                        alt={previewItem.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Package className="h-12 w-12 text-muted-foreground/20" />
                                    </div>
                                )}
                                {previewItem.images.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {previewItem.images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setPreviewImgIdx(i)}
                                                className={`h-2 w-2 rounded-full transition-colors ${i === previewImgIdx ? "bg-white" : "bg-white/40"}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="text-xl font-semibold">{previewItem.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <Badge
                                            variant="outline"
                                            className={
                                                CONDITION_CLASSES[previewItem.condition] || ""
                                            }
                                        >
                                            {previewItem.condition}
                                        </Badge>
                                        <Badge variant="outline">
                                            {previewItem.availableQuantity} available
                                        </Badge>
                                    </div>
                                </div>
                                {previewItem.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {previewItem.description}
                                    </p>
                                )}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-xs text-muted-foreground">Dimensions</p>
                                        <p className="font-medium mt-0.5">
                                            {Number(previewItem.dimensionLength).toFixed(0)} ×{" "}
                                            {Number(previewItem.dimensionWidth).toFixed(0)} ×{" "}
                                            {Number(previewItem.dimensionHeight).toFixed(0)} cm
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-xs text-muted-foreground">Weight</p>
                                        <p className="font-medium mt-0.5">
                                            {Number(previewItem.weight).toFixed(1)} kg
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-xs text-muted-foreground">Volume</p>
                                        <p className="font-medium mt-0.5">
                                            {Number(previewItem.volume).toFixed(2)} m³
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-xs text-muted-foreground">Condition</p>
                                        <p className="font-medium mt-0.5">
                                            {previewItem.condition}
                                        </p>
                                    </div>
                                </div>
                                {previewItem.conditionNotes && (
                                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                                        <p className="text-xs text-amber-700 font-medium mb-1">
                                            Condition notes
                                        </p>
                                        <p className="text-sm text-amber-800">
                                            {previewItem.conditionNotes}
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        className="flex-1"
                                        disabled={previewItem.availableQuantity < 1}
                                        onClick={() => {
                                            handleAddSingle(previewItem);
                                            setPreviewItem(null);
                                        }}
                                    >
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Add to cart
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <a
                                            href={`/catalog/assets/${previewItem.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Full details
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
