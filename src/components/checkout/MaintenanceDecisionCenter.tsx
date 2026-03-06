"use client";

import { useMemo, useState } from "react";
import type { LocalCartItem } from "@/lib/cart/localStorage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ImageViewerModal, type ViewerImageItem } from "@/components/shared/image-viewer-modal";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Wrench } from "lucide-react";
import Image from "next/image";

interface MaintenanceDecisionCenterProps {
    items: LocalCartItem[];
    onDecisionChange: (assetId: string, decision: "FIX_IN_ORDER" | "USE_AS_IS") => void;
}

export function MaintenanceDecisionCenter({
    items,
    onDecisionChange,
}: MaintenanceDecisionCenterProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<ViewerImageItem[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    const unresolved = useMemo(
        () => items.filter((item) => !item.maintenanceDecision).length,
        [items]
    );

    const activeItem = items[activeIndex];

    if (items.length === 0) return null;

    const openDetails = (index: number) => {
        setActiveIndex(index);
        setModalOpen(true);
    };

    const moveIndex = (delta: number) => {
        const next = (activeIndex + delta + items.length) % items.length;
        setActiveIndex(next);
    };

    const openViewer = (
        imageItems: ViewerImageItem[],
        index: number,
        fallback?: ViewerImageItem
    ) => {
        const safeImages = imageItems.length > 0 ? imageItems : fallback ? [fallback] : [];
        if (safeImages.length === 0) return;
        const bounded = Math.max(0, Math.min(index, safeImages.length - 1));
        setViewerImages(safeImages);
        setViewerIndex(bounded);
        setViewerOpen(true);
    };

    return (
        <Card className="p-6 border-amber-300 bg-amber-50/40 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-amber-900">
                        Maintenance Decision Center
                    </h3>
                    <p className="text-sm text-amber-800">
                        Review ORANGE assets and choose whether each item should be fixed before the
                        event or used as-is.
                    </p>
                </div>
                <Badge variant={unresolved > 0 ? "destructive" : "secondary"}>
                    {unresolved > 0 ? `${unresolved} pending` : "All decided"}
                </Badge>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={item.assetId}
                        className="rounded-md border border-amber-200 bg-background/70 p-3"
                    >
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                className="h-12 w-12 rounded-md overflow-hidden border border-amber-200 bg-muted shrink-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                onClick={() =>
                                    openViewer(
                                        (item.conditionImages || []).map((image) => ({
                                            url: image.url,
                                            note: image.note,
                                        })),
                                        0,
                                        item.image ? { url: item.image } : undefined
                                    )
                                }
                            >
                                {item.image ? (
                                    <Image
                                        src={item.image}
                                        alt={item.assetName}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-amber-700">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                )}
                            </button>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{item.assetName}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className="text-amber-700 border-amber-300"
                                    >
                                        ORANGE
                                    </Badge>
                                    {item.refurbDaysEstimate ? (
                                        <span className="text-xs text-amber-700 inline-flex items-center gap-1">
                                            <Clock className="h-3 w-3" />~{item.refurbDaysEstimate}{" "}
                                            day{item.refurbDaysEstimate > 1 ? "s" : ""}
                                        </span>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => openDetails(index)}
                                    >
                                        View details
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            item.maintenanceDecision === "FIX_IN_ORDER"
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() =>
                                            onDecisionChange(item.assetId, "FIX_IN_ORDER")
                                        }
                                    >
                                        <Wrench className="h-3.5 w-3.5 mr-1" />
                                        Fix before event
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            item.maintenanceDecision === "USE_AS_IS"
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => onDecisionChange(item.assetId, "USE_AS_IS")}
                                    >
                                        Use as-is
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {unresolved > 0 ? (
                <p className="text-sm text-destructive font-medium">
                    {unresolved} item(s) still need a decision before order submission.
                </p>
            ) : null}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-3xl">
                    {activeItem ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    {activeItem.assetName}
                                </DialogTitle>
                                <DialogDescription>
                                    ORANGE condition details ({activeIndex + 1} of {items.length})
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                            Condition Notes
                                        </p>
                                        <p className="text-sm leading-relaxed">
                                            {activeItem.conditionNotes || "No notes recorded."}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                            Timeline
                                        </p>
                                        <div className="text-sm space-y-1">
                                            <p>
                                                Captured:{" "}
                                                {new Date(activeItem.addedAt).toLocaleString()}
                                            </p>
                                            <p>
                                                Refurb estimate:{" "}
                                                {activeItem.refurbDaysEstimate || "N/A"}
                                            </p>
                                            <p>
                                                Current decision:{" "}
                                                {activeItem.maintenanceDecision || "Pending"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                        Condition Photos
                                    </p>
                                    {activeItem.conditionImages &&
                                    activeItem.conditionImages.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {activeItem.conditionImages.map((image, index) => (
                                                <div key={index} className="space-y-1">
                                                    <button
                                                        type="button"
                                                        className="aspect-square w-full rounded-md overflow-hidden border border-border bg-muted cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                                        onClick={() =>
                                                            openViewer(
                                                                activeItem.conditionImages!.map(
                                                                    (itemImage) => ({
                                                                        url: itemImage.url,
                                                                        note: itemImage.note,
                                                                    })
                                                                ),
                                                                index
                                                            )
                                                        }
                                                    >
                                                        <img
                                                            src={image.url}
                                                            alt={
                                                                image.note ||
                                                                `Condition ${index + 1}`
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                    {image.note ? (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                            {image.note}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No condition photos.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Button variant="outline" onClick={() => moveIndex(-1)}>
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button variant="outline" onClick={() => moveIndex(1)}>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            <ImageViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                images={viewerImages}
                initialIndex={viewerIndex}
                title={activeItem?.assetName || "Condition photos"}
            />
        </Card>
    );
}
