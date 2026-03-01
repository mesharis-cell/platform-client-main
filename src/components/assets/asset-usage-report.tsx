"use client";

import { useState } from "react";
import type { AssetUsageReport } from "@/types/collection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewerModal, type ViewerImageItem } from "@/components/shared/image-viewer-modal";
import {
    CalendarRange,
    ClipboardList,
    History,
    ShieldCheck,
    ShieldQuestion,
    ShieldAlert,
    Wrench,
    Camera,
    Activity,
} from "lucide-react";

interface AssetUsageReportProps {
    report: AssetUsageReport | null | undefined;
    isLoading?: boolean;
}

const EVENT_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    ORDER_USAGE: {
        label: "Order Usage",
        className: "border-primary/30 text-primary",
        icon: <CalendarRange className="h-3.5 w-3.5" />,
    },
    SCAN_EVENT: {
        label: "Scan Event",
        className: "border-blue-500/30 text-blue-700",
        icon: <Activity className="h-3.5 w-3.5" />,
    },
    SERVICE_REQUEST: {
        label: "Service Request",
        className: "border-orange-500/30 text-orange-700",
        icon: <Wrench className="h-3.5 w-3.5" />,
    },
    CONDITION_UPDATE: {
        label: "Condition Update",
        className: "border-emerald-500/30 text-emerald-700",
        icon: <ClipboardList className="h-3.5 w-3.5" />,
    },
};

const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "N/A";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
};

const renderConditionIcon = (condition?: string | null) => {
    if (condition === "GREEN") return <ShieldCheck className="h-4 w-4 text-green-600" />;
    if (condition === "ORANGE") return <ShieldQuestion className="h-4 w-4 text-amber-600" />;
    if (condition === "RED") return <ShieldAlert className="h-4 w-4 text-red-600" />;
    return null;
};

const conditionBadgeClass = (condition?: string | null) => {
    if (condition === "GREEN") return "bg-green-600/10 text-green-600 border-green-600/30";
    if (condition === "ORANGE") return "bg-amber-600/10 text-amber-600 border-amber-600/30";
    if (condition === "RED") return "bg-red-600/10 text-red-600 border-red-600/30";
    return "";
};

export function AssetUsageReport({ report, isLoading = false }: AssetUsageReportProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<ViewerImageItem[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    const openViewer = (images: ViewerImageItem[], initialIndex: number) => {
        if (images.length === 0) return;
        setViewerImages(images);
        setViewerIndex(initialIndex);
        setViewerOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-20 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-48 rounded-lg" />
            </div>
        );
    }

    if (!report) {
        return (
            <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                    Usage report is not available for this asset yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Orders Used
                    </p>
                    <p className="text-2xl font-bold font-mono">
                        {report.summary.total_order_usages}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Scan Events
                    </p>
                    <p className="text-2xl font-bold font-mono">
                        {report.summary.total_scan_events}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Service Requests
                    </p>
                    <p className="text-2xl font-bold font-mono">
                        {report.summary.total_service_requests}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Condition Updates
                    </p>
                    <p className="text-2xl font-bold font-mono">
                        {report.summary.total_condition_updates}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Latest Activity
                    </p>
                    <p className="text-sm font-semibold leading-tight">
                        {formatDateTime(report.summary.latest_activity_at)}
                    </p>
                </Card>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-4 w-4" />
                        <h3 className="text-sm font-bold font-mono uppercase tracking-wide text-muted-foreground">
                            Usage Timeline
                        </h3>
                    </div>

                    {report.timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No usage events yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {report.timeline.map((entry) => {
                                const meta =
                                    EVENT_META[entry.event_type] ??
                                    ({
                                        label: entry.event_type,
                                        className: "border-border text-foreground",
                                        icon: null,
                                    } as const);
                                const images = (entry.photos || []).map((photo) => ({
                                    url: photo.url,
                                    note: photo.note || undefined,
                                }));

                                return (
                                    <div
                                        key={entry.id}
                                        className="rounded-lg border border-border p-4 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={meta.className}
                                                    >
                                                        {meta.icon}
                                                        <span className="ml-1">{meta.label}</span>
                                                    </Badge>
                                                    {entry.condition ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={conditionBadgeClass(
                                                                entry.condition
                                                            )}
                                                        >
                                                            {renderConditionIcon(entry.condition)}
                                                            <span className="ml-1">
                                                                {entry.condition}
                                                            </span>
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="font-semibold text-sm">
                                                    {entry.title}
                                                </p>
                                                {entry.subtitle ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {entry.subtitle}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                <p className="font-mono">
                                                    {formatDateTime(entry.occurred_at)}
                                                </p>
                                                {entry.actor_name ? (
                                                    <p>by {entry.actor_name}</p>
                                                ) : null}
                                            </div>
                                        </div>

                                        {entry.note ? (
                                            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                                {entry.note}
                                            </div>
                                        ) : null}

                                        {images.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                                    <Camera className="h-3.5 w-3.5" />
                                                    {images.length} media item(s)
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {images.map((image, idx) => (
                                                        <button
                                                            key={`${image.url}-${idx}`}
                                                            type="button"
                                                            onClick={() => openViewer(images, idx)}
                                                            className="rounded-md overflow-hidden border border-border bg-muted"
                                                        >
                                                            <img
                                                                src={image.url}
                                                                alt={`Usage media ${idx + 1}`}
                                                                className="h-28 w-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ImageViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                images={viewerImages}
                initialIndex={viewerIndex}
                title="Asset Usage Media"
            />
        </div>
    );
}
