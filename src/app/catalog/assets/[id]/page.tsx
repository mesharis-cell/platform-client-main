"use client";

/**
 * Asset Detail Page
 * Dedicated page for individual asset with full specifications and add-to-cart
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useCatalogAsset, useAssetVersions, useAssetConditionHistory } from "@/hooks/use-catalog";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    ShoppingCart,
    Package,
    Tag,
    CheckCircle,
    XCircle,
    Plus,
    Minus,
    ChevronLeft,
    ChevronRight,
    Wrench,
    AlertCircle,
    Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ClientNav } from "@/components/client-nav";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading } = useCatalogAsset(id);
    const { addItem } = useCart();
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const asset = data?.asset;
    const { data: versions } = useAssetVersions(asset?.id || null);
    const { data: conditionHistory } = useAssetConditionHistory(asset?.id || null);

    const handleAddToCart = async () => {
        if (!asset) return;

        if (asset.availableQuantity < selectedQuantity) {
            toast.error("Not enough quantity available");
            return;
        }

        await addItem(asset.id, selectedQuantity, {
            assetName: asset.name,
            availableQuantity: asset.availableQuantity,
            volume: Number(asset.volume),
            weight: Number(asset.weight),
            image: asset.images[0],
            condition: asset.condition,
        });

        setSelectedQuantity(1);
    };

    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-background p-8">
                    <div className="max-w-6xl mx-auto">
                        <Skeleton className="h-8 w-48 mb-8" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Skeleton className="aspect-square rounded-lg" />
                            <div className="space-y-6">
                                <Skeleton className="h-12 w-3/4" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-40 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </ClientNav>
        );
    }

    if (!asset) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-background flex items-center justify-center p-8">
                    <Card className="max-w-md w-full p-10 text-center">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h2 className="text-2xl font-bold mb-3">Asset not found</h2>
                        <p className="text-muted-foreground mb-6">
                            The asset you're looking for doesn't exist or has been removed
                        </p>
                        <Link href="/catalog">
                            <Button className="gap-2 font-mono">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Catalog
                            </Button>
                        </Link>
                    </Card>
                </div>
            </ClientNav>
        );
    }

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
                <div className="max-w-7xl mx-auto px-8 py-10">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 font-mono">
                        <Link href="/catalog" className="hover:text-foreground transition-colors">
                            Catalog
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground">{asset.name}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Image Gallery */}
                        <div className="space-y-4">
                            {/* Main Image */}
                            <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted relative">
                                {asset.images.length > 0 ? (
                                    <Image
                                        src={asset.images[selectedImageIndex]}
                                        alt={asset.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                        <Package className="h-32 w-32 text-muted-foreground/20" />
                                    </div>
                                )}

                                {/* Image Navigation */}
                                {asset.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setSelectedImageIndex(
                                                    (selectedImageIndex - 1 + asset.images.length) %
                                                        asset.images.length
                                                )
                                            }
                                            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setSelectedImageIndex(
                                                    (selectedImageIndex + 1) % asset.images.length
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {asset.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-3">
                                    {asset.images.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                index === selectedImageIndex
                                                    ? "border-primary"
                                                    : "border-border hover:border-border/80"
                                            }`}
                                        >
                                            <Image
                                                src={image}
                                                alt={`${asset.name} ${index + 1}`}
                                                width={100}
                                                height={100}
                                                className="object-cover w-full h-full"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="space-y-6">
                            {/* Header */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary" className="font-mono">
                                        <Package className="w-3 h-3 mr-1.5" />
                                        Asset
                                    </Badge>
                                    {asset.brand && (
                                        <Badge variant="outline" className="font-mono gap-1.5">
                                            <Tag className="w-3 h-3" />
                                            {asset.brand.name}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="font-mono">
                                        {asset.category}
                                    </Badge>
                                </div>

                                <h1 className="text-4xl font-bold mb-3 text-foreground">
                                    {asset.name}
                                </h1>

                                {asset.description && (
                                    <p className="text-muted-foreground leading-relaxed">
                                        {asset.description}
                                    </p>
                                )}
                            </div>

                            {/* Availability */}
                            <Card
                                className={`p-6 ${asset.availableQuantity > 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}
                            >
                                <div className="flex items-center gap-3">
                                    {asset.availableQuantity > 0 ? (
                                        <>
                                            <CheckCircle className="h-6 w-6 text-primary" />
                                            <div>
                                                <p className="font-semibold text-lg">In Stock</p>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    {asset.availableQuantity} of{" "}
                                                    {asset.totalQuantity} available
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-6 w-6 text-destructive" />
                                            <div>
                                                <p className="font-semibold text-lg">
                                                    Out of Stock
                                                </p>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    Currently unavailable
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>

                            {/* Specifications */}
                            <div>
                                <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-muted-foreground font-mono">
                                    Specifications
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4 bg-muted/30 border-border/50">
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                            Volume
                                        </p>
                                        <p className="text-2xl font-bold font-mono">
                                            {asset.volume} m³
                                        </p>
                                    </Card>
                                    <Card className="p-4 bg-muted/30 border-border/50">
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                            Weight
                                        </p>
                                        <p className="text-2xl font-bold font-mono">
                                            {asset.weight} kg
                                        </p>
                                    </Card>
                                    <Card className="p-4 bg-muted/30 border-border/50">
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                            Dimensions
                                        </p>
                                        <p className="text-sm font-mono font-bold">
                                            {asset.dimensionLength} × {asset.dimensionWidth} ×{" "}
                                            {asset.dimensionHeight} cm
                                        </p>
                                    </Card>
                                    <Card className="p-4 bg-muted/30 border-border/50">
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                            Condition
                                        </p>
                                        <Badge
                                            variant={
                                                asset.condition === "GREEN"
                                                    ? "default"
                                                    : asset.condition === "ORANGE"
                                                      ? "secondary"
                                                      : "destructive"
                                            }
                                            className="font-mono"
                                        >
                                            {asset.condition}
                                        </Badge>
                                    </Card>
                                </div>
                            </div>

                            {/* Handling Tags */}
                            {asset.handlingTags && asset.handlingTags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground font-mono">
                                        Handling Requirements
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {asset.handlingTags.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add to Cart Section */}
                            {asset.availableQuantity > 0 && (
                                <Card className="p-6 bg-card/50 border-border/50">
                                    <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-muted-foreground font-mono">
                                        Add to Cart
                                    </h3>

                                    {/* Quantity Selector */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <label className="text-sm font-medium font-mono uppercase tracking-wide">
                                            Quantity
                                        </label>
                                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setSelectedQuantity(
                                                        Math.max(1, selectedQuantity - 1)
                                                    )
                                                }
                                                className="h-12 w-12 p-0 rounded-none border-r border-border"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <div className="px-8 font-mono text-xl font-bold min-w-[6ch] text-center">
                                                {selectedQuantity}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setSelectedQuantity(
                                                        Math.min(
                                                            asset.availableQuantity,
                                                            selectedQuantity + 1
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    selectedQuantity >= asset.availableQuantity
                                                }
                                                className="h-12 w-12 p-0 rounded-none border-l border-border"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <span className="text-sm text-muted-foreground font-mono">
                                            of {asset.availableQuantity} available
                                        </span>
                                    </div>

                                    {/* Add Buttons */}
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => handleAddToCart()}
                                            className="w-full h-14 gap-2 font-mono uppercase tracking-wide text-base"
                                            size="lg"
                                        >
                                            <ShoppingCart className="w-5 h-5" />
                                            Add {selectedQuantity} to Cart
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            <Card className="p-6 bg-card/50 border-border/50">
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground font-mono">
                                    Service
                                </h3>
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 font-mono"
                                    onClick={() =>
                                        router.push(`/service-requests?asset_id=${asset.id}`)
                                    }
                                >
                                    <Wrench className="w-4 h-4" />
                                    Request Service
                                </Button>
                            </Card>
                        </div>
                    </div>

                    {/* Condition & Maintenance */}
                    {asset && (
                        <div className="mt-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-sm font-bold font-mono uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <Wrench className="w-4 h-4" />
                                        Condition & Maintenance
                                    </h3>
                                    <div
                                        className={`rounded-lg p-4 border mb-4 ${
                                            asset.condition === "RED"
                                                ? "bg-destructive/10 border-destructive/30"
                                                : asset.condition === "ORANGE"
                                                  ? "bg-orange-500/10 border-orange-500/30"
                                                  : "bg-green-500/10 border-green-500/30"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge
                                                className={`font-mono ${
                                                    asset.condition === "RED"
                                                        ? "bg-destructive"
                                                        : asset.condition === "ORANGE"
                                                          ? "bg-orange-500"
                                                          : "bg-green-500"
                                                }`}
                                            >
                                                {asset.condition === "RED" ? (
                                                    <>
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Damaged / In Maintenance
                                                    </>
                                                ) : asset.condition === "ORANGE" ? (
                                                    <>
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Minor Issues
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Good Condition
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                        {asset.conditionNotes && (
                                            <p className="text-sm text-foreground mb-2">
                                                {asset.conditionNotes}
                                            </p>
                                        )}
                                        {asset.refurbDaysEstimate &&
                                            asset.condition !== "GREEN" && (
                                                <p className="text-sm font-mono mb-2">
                                                    <span className="text-muted-foreground">
                                                        Est. refurb time:
                                                    </span>{" "}
                                                    <span className="font-bold">
                                                        {asset.refurbDaysEstimate} days
                                                    </span>
                                                </p>
                                            )}
                                        {asset.lastScannedAt && (
                                            <p className="text-xs font-mono text-muted-foreground">
                                                Last scanned:{" "}
                                                {new Date(asset.lastScannedAt).toLocaleDateString()}{" "}
                                                at{" "}
                                                {new Date(asset.lastScannedAt).toLocaleTimeString(
                                                    [],
                                                    { hour: "2-digit", minute: "2-digit" }
                                                )}
                                            </p>
                                        )}
                                        {asset.condition === "RED" && (
                                            <p className="text-xs font-mono text-destructive mt-2">
                                                This asset is currently unavailable for booking
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Condition History */}
                    {conditionHistory && conditionHistory.length > 0 && (
                        <div className="mt-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-sm font-bold font-mono uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Condition History
                                    </h3>
                                    <div className="space-y-1 relative">
                                        {conditionHistory.map((entry: any, idx: number) => {
                                            const isFirst = idx === 0;
                                            return (
                                                <div
                                                    key={entry.id || idx}
                                                    className="flex gap-3 py-2"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
                                                                entry.condition === "RED"
                                                                    ? "bg-destructive"
                                                                    : entry.condition === "ORANGE"
                                                                      ? "bg-orange-500"
                                                                      : "bg-green-500"
                                                            } ${isFirst ? "ring-4 ring-primary/20" : ""}`}
                                                        />
                                                        {idx < conditionHistory.length - 1 && (
                                                            <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                className={`text-xs font-mono ${
                                                                    entry.condition === "RED"
                                                                        ? "bg-destructive"
                                                                        : entry.condition ===
                                                                            "ORANGE"
                                                                          ? "bg-orange-500"
                                                                          : "bg-green-500"
                                                                }`}
                                                            >
                                                                {entry.condition}
                                                            </Badge>
                                                            {isFirst && (
                                                                <span className="text-xs font-mono text-muted-foreground">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {entry.notes}
                                                            </p>
                                                        )}
                                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                                            {new Date(
                                                                entry.timestamp
                                                            ).toLocaleDateString()}{" "}
                                                            {new Date(
                                                                entry.timestamp
                                                            ).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Version History */}
                    {versions && versions.length > 0 && (
                        <div className="mt-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-sm font-bold font-mono uppercase tracking-wide mb-4">
                                        Version History
                                    </h3>
                                    <div className="space-y-1 relative">
                                        {versions.map((v: any, idx: number) => {
                                            const snap = v.snapshot || {};
                                            const isFirst = idx === 0;
                                            return (
                                                <div key={v.id} className="flex gap-3 py-2">
                                                    <div className="flex flex-col items-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${isFirst ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
                                                        />
                                                        {idx < versions.length - 1 && (
                                                            <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-muted-foreground">
                                                                v{v.version_number}
                                                            </span>
                                                            <span className="text-sm font-semibold">
                                                                {v.reason}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(
                                                                v.created_at
                                                            ).toLocaleDateString()}{" "}
                                                            {new Date(
                                                                v.created_at
                                                            ).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                        {snap.images?.[0] && (
                                                            <div className="mt-2 w-16 h-12 rounded overflow-hidden bg-muted">
                                                                <img
                                                                    src={snap.images[0]}
                                                                    alt="Snapshot"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
