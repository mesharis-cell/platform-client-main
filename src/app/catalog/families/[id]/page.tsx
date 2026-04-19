"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    Package,
    ChevronRight,
    ChevronLeft,
    ChevronRight as ChevronRightArrow,
    X,
} from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { FamilyStockList } from "@/components/catalog/family-stock-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCatalogFamily } from "@/hooks/use-catalog";

export default function CatalogFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = useCatalogFamily(id);
    const family = data?.family;
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

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

    const images = family.images || [];
    const hasImages = images.length > 0;
    const isSerialized = family.stockMode === "INDIVIDUAL";
    const safeIdx = hasImages ? Math.min(activeImgIdx, images.length - 1) : 0;
    const currentImage = hasImages ? images[safeIdx]?.url : null;

    const conditionTotal =
        (family.conditionSummary?.green || 0) +
        (family.conditionSummary?.orange || 0) +
        (family.conditionSummary?.red || 0);

    const goPrev = () =>
        setActiveImgIdx((i) => (i - 1 + images.length) % images.length);
    const goNext = () => setActiveImgIdx((i) => (i + 1) % images.length);

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
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/30 border border-border/50">
                            {currentImage ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setLightboxOpen(true)}
                                        className="absolute inset-0 flex items-center justify-center cursor-zoom-in"
                                        aria-label="Open full-size image"
                                    >
                                        <Image
                                            src={currentImage}
                                            alt={family.name}
                                            fill
                                            className="object-contain p-6"
                                            priority
                                        />
                                    </button>
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goPrev();
                                                }}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center hover:bg-background transition-colors"
                                                aria-label="Previous image"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goNext();
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center hover:bg-background transition-colors"
                                                aria-label="Next image"
                                            >
                                                <ChevronRightArrow className="h-4 w-4" />
                                            </button>
                                            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-[11px] font-mono">
                                                {safeIdx + 1} / {images.length}
                                            </div>
                                        </>
                                    )}
                                </>
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

                            {conditionTotal > 0 && (
                                <div className="rounded-lg border border-border/40 p-3 space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Condition Summary
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {family.conditionSummary.green > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                                            >
                                                {family.conditionSummary.green} good
                                            </Badge>
                                        )}
                                        {family.conditionSummary.orange > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="bg-amber-500/10 text-amber-700 border-amber-500/25"
                                            >
                                                {family.conditionSummary.orange} minor issues
                                            </Badge>
                                        )}
                                        {family.conditionSummary.red > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="bg-red-500/10 text-red-700 border-red-500/25"
                                            >
                                                {family.conditionSummary.red} need repair
                                            </Badge>
                                        )}
                                    </div>
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

            {/* Lightbox modal */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-none">
                    {currentImage && (
                        <div className="relative h-[80vh] w-full bg-black">
                            <Image
                                src={currentImage}
                                alt={family.name}
                                fill
                                className="object-contain"
                            />
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-white" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                                        aria-label="Next image"
                                    >
                                        <ChevronRightArrow className="h-5 w-5 text-white" />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-mono text-white">
                                        {safeIdx + 1} / {images.length}
                                    </div>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => setLightboxOpen(false)}
                                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5 text-white" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </ClientNav>
    );
}
