"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useCart } from "@/contexts/cart-context";
import type { CatalogFamilyStockItem } from "@/types/collection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Package, ShoppingCart } from "lucide-react";

const getStockStatusTone = (status: string, availableQuantity: number) => {
    if (availableQuantity < 1) return "destructive";
    if (status === "AVAILABLE") return "default";
    return "secondary";
};

export function FamilyStockList({
    familyName,
    stockRecords,
}: {
    familyName: string;
    stockRecords: CatalogFamilyStockItem[];
}) {
    const { addItem, openCart } = useCart();

    const handleAddToCart = (stock: CatalogFamilyStockItem) => {
        if (stock.availableQuantity < 1) {
            toast.error("This stock record is currently unavailable");
            return;
        }

        addItem(stock.id, 1, {
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
        });
        openCart();
    };

    if (stockRecords.length === 0) {
        return (
            <Card className="border-dashed" data-testid="family-stock-empty">
                <CardContent className="py-10 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium">No stock records available</p>
                    <p className="text-sm text-muted-foreground">
                        This family has no active stock records to order yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4" data-testid="family-stock-list">
            {stockRecords.map((stock) => (
                <Card key={stock.id} data-testid="family-stock-card">
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                    {stock.images[0]?.url ? (
                                        <Image
                                            src={stock.images[0].url}
                                            alt={stock.name}
                                            width={96}
                                            height={96}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-10 w-10 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold">{stock.name}</h3>
                                        <Badge variant="outline">{familyName}</Badge>
                                        <Badge
                                            variant={getStockStatusTone(
                                                String(stock.status),
                                                stock.availableQuantity
                                            )}
                                        >
                                            {stock.availableQuantity < 1
                                                ? "Out of stock"
                                                : stock.status}
                                        </Badge>
                                        {stock.condition !== "GREEN" && (
                                            <Badge
                                                variant={
                                                    stock.condition === "RED"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                            >
                                                <AlertCircle className="mr-1 h-3 w-3" />
                                                {stock.condition}
                                            </Badge>
                                        )}
                                    </div>

                                    {stock.description && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {stock.description}
                                        </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        <span>{stock.availableQuantity} available</span>
                                        <span>{stock.totalQuantity} total</span>
                                        <span>{Number(stock.volume).toFixed(2)} m3</span>
                                        <span>{Number(stock.weight).toFixed(1)} kg</span>
                                        <span>
                                            {Number(stock.dimensionLength).toFixed(0)} x{" "}
                                            {Number(stock.dimensionWidth).toFixed(0)} x{" "}
                                            {Number(stock.dimensionHeight).toFixed(0)} cm
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 lg:w-56 lg:flex-col">
                                <Link href={`/catalog/assets/${stock.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        View stock record
                                    </Button>
                                </Link>
                                <Button
                                    className="flex-1"
                                    disabled={stock.availableQuantity < 1}
                                    onClick={() => handleAddToCart(stock)}
                                    data-testid="family-stock-add"
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Add to cart
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
