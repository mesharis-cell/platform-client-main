"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientNav } from "@/components/client-nav";
import { useClientServiceRequests, useCreateServiceRequest } from "@/hooks/use-service-requests";
import { useCatalogAsset } from "@/hooks/use-catalog";
import type { ServiceRequestStatus, ServiceRequestType } from "@/types/service-request";
import { Search, Wrench, X, Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const STATUS_FILTERS: Array<ServiceRequestStatus | "all"> = [
    "all",
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];

const REQUEST_TYPES: ServiceRequestType[] = ["MAINTENANCE", "RESKIN", "REFURBISHMENT", "CUSTOM"];

const SR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300" },
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    IN_REVIEW: { label: "In Review", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 border-green-300" },
    IN_PROGRESS: { label: "In Progress", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    COMPLETED: { label: "Completed", color: "bg-teal-100 text-teal-700 border-teal-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

const COMMERCIAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    INTERNAL: { label: "Internal", color: "bg-slate-100 text-slate-700 border-slate-300" },
    PENDING_QUOTE: { label: "Pending Quote", color: "bg-blue-100 text-blue-700 border-blue-300" },
    QUOTED: { label: "Quoted", color: "bg-purple-100 text-purple-700 border-purple-300" },
    QUOTE_APPROVED: {
        label: "Quote Approved",
        color: "bg-green-100 text-green-700 border-green-300",
    },
    INVOICED: { label: "Invoiced", color: "bg-amber-100 text-amber-700 border-amber-300" },
    PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

export default function ClientServiceRequestsPage() {
    const searchParams = useSearchParams();
    const prefilledAssetId = searchParams.get("asset_id") || "";
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "all">("all");

    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requestType, setRequestType] = useState<ServiceRequestType>("MAINTENANCE");
    const [requestedStartAt, setRequestedStartAt] = useState("");
    const [requestedDueAt, setRequestedDueAt] = useState("");
    const [itemName, setItemName] = useState("");
    const [relatedAssetId, setRelatedAssetId] = useState("");
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemNotes, setItemNotes] = useState("");
    const [itemRefurbDays, setItemRefurbDays] = useState("");
    const { data: prefilledAssetData, isLoading: loadingPrefilledAsset } = useCatalogAsset(
        prefilledAssetId || undefined
    );
    const prefilledAsset = prefilledAssetData?.asset;
    const hasPrefilledAsset = Boolean(prefilledAssetId && prefilledAsset);

    const filters = useMemo(
        () => ({
            page,
            limit: 100,
            search_term: searchTerm || undefined,
            request_status: statusFilter === "all" ? undefined : statusFilter,
        }),
        [page, searchTerm, statusFilter]
    );

    const { data, isLoading, error } = useClientServiceRequests(filters);
    const createServiceRequest = useCreateServiceRequest();
    const requests = data?.data ?? [];
    const totalRequests = data?.meta?.total ?? 0;
    const activeFilters = (searchTerm ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setPage(1);
    };

    useEffect(() => {
        if (!prefilledAssetId) return;
        setCreateOpen(true);
        setRelatedAssetId(prefilledAssetId);
    }, [prefilledAssetId]);

    useEffect(() => {
        if (!prefilledAsset?.name) return;
        setItemName(prefilledAsset.name);
    }, [prefilledAsset?.name]);

    const resetCreateForm = () => {
        setTitle("");
        setDescription("");
        setRequestType("MAINTENANCE");
        setRequestedStartAt("");
        setRequestedDueAt("");
        setItemName(prefilledAsset?.name || "");
        setRelatedAssetId(prefilledAssetId || "");
        setItemQuantity(1);
        setItemNotes("");
        setItemRefurbDays("");
    };

    const handleCreate = async () => {
        if (!title.trim()) return toast.error("Request title is required");
        if (!itemName.trim()) return toast.error("At least one item name is required");

        try {
            await createServiceRequest.mutateAsync({
                request_type: requestType,
                title: title.trim(),
                description: description.trim() || undefined,
                requested_start_at: requestedStartAt
                    ? new Date(requestedStartAt).toISOString()
                    : undefined,
                requested_due_at: requestedDueAt
                    ? new Date(requestedDueAt).toISOString()
                    : undefined,
                items: [
                    {
                        asset_id: hasPrefilledAsset ? relatedAssetId : undefined,
                        asset_name: itemName.trim(),
                        quantity: Math.max(1, Number(itemQuantity) || 1),
                        notes: itemNotes.trim() || undefined,
                        refurb_days_estimate:
                            itemRefurbDays.trim() === ""
                                ? undefined
                                : Math.max(0, Number(itemRefurbDays) || 0),
                    },
                ],
            });
            toast.success("Service request created");
            setCreateOpen(false);
            resetCreateForm();
        } catch (err: any) {
            toast.error(err.message || "Failed to create service request");
        }
    };

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/30 to-background">
                {/* Sticky Header */}
                <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="container mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                                    Service Requests
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Track maintenance, reskin, and refurbishment requests
                                </p>
                            </div>
                            <Dialog
                                open={createOpen}
                                onOpenChange={(open) => {
                                    setCreateOpen(open);
                                    if (!open) resetCreateForm();
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        New Request
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Create Service Request</DialogTitle>
                                        <DialogDescription>
                                            Submit a new maintenance or service request.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {prefilledAssetId && (
                                            <div className="md:col-span-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Related Asset
                                                </Label>
                                                {loadingPrefilledAsset ? (
                                                    <p className="text-sm mt-1">
                                                        Loading asset details...
                                                    </p>
                                                ) : prefilledAsset ? (
                                                    <div className="mt-1">
                                                        <p className="font-semibold">
                                                            {prefilledAsset.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            Asset ID: {prefilledAsset.id}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm mt-1 text-destructive">
                                                        Prefilled asset not found. You can still
                                                        submit the request manually.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <div className="md:col-span-2">
                                            <Label>
                                                Title <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Request title"
                                            />
                                        </div>
                                        <div>
                                            <Label>Type</Label>
                                            <Select
                                                value={requestType}
                                                onValueChange={(v) =>
                                                    setRequestType(v as ServiceRequestType)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {REQUEST_TYPES.map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {t.replace(/_/g, " ")}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>
                                                Item Name{" "}
                                                <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                value={itemName}
                                                onChange={(e) => setItemName(e.target.value)}
                                                placeholder="Backbar unit"
                                                readOnly={hasPrefilledAsset}
                                                disabled={hasPrefilledAsset}
                                            />
                                        </div>
                                        <div>
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={itemQuantity}
                                                onChange={(e) =>
                                                    setItemQuantity(Number(e.target.value) || 1)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label>Refurb Days</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="Optional"
                                                value={itemRefurbDays}
                                                onChange={(e) => setItemRefurbDays(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Start Date</Label>
                                            <Input
                                                type="datetime-local"
                                                value={requestedStartAt}
                                                onChange={(e) =>
                                                    setRequestedStartAt(e.target.value)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label>Due Date</Label>
                                            <Input
                                                type="datetime-local"
                                                value={requestedDueAt}
                                                onChange={(e) => setRequestedDueAt(e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Label>Item Notes</Label>
                                            <Input
                                                value={itemNotes}
                                                onChange={(e) => setItemNotes(e.target.value)}
                                                placeholder="Optional notes"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Optional description"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCreateOpen(false)}
                                            disabled={createServiceRequest.isPending}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleCreate}
                                            disabled={createServiceRequest.isPending}
                                        >
                                            {createServiceRequest.isPending
                                                ? "Creating..."
                                                : "Create Request"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-8">
                    {/* Filter Bar */}
                    <Card className="bg-card/80 backdrop-blur-sm border-border/40 mb-6">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <Input
                                    placeholder="Search by request title or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1"
                                />
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => {
                                        setStatusFilter(v as ServiceRequestStatus | "all");
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_FILTERS.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s === "all"
                                                    ? "All Statuses"
                                                    : SR_STATUS_CONFIG[s]?.label || s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {activeFilters > 0 && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Request List */}
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-36 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-12 text-center">
                                <p className="text-destructive font-medium">
                                    Failed to load service requests. Please try again.
                                </p>
                            </CardContent>
                        </Card>
                    ) : requests.length === 0 ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
                            <CardContent className="p-12 text-center">
                                <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-foreground font-medium text-lg mb-2">
                                    No service requests found
                                </p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {activeFilters > 0
                                        ? "Try adjusting your filters to see more results"
                                        : "Get started by creating your first service request"}
                                </p>
                                <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                                    <Plus className="h-4 w-4" /> Create Service Request
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex flex-col space-y-4">
                                {requests.map((request) => {
                                    const opsCfg = SR_STATUS_CONFIG[request.request_status];
                                    const comCfg =
                                        COMMERCIAL_STATUS_CONFIG[request.commercial_status];
                                    return (
                                        <Link
                                            key={request.id}
                                            href={`/service-requests/${request.id}`}
                                        >
                                            <Card className="bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-all duration-200 group cursor-pointer">
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                        <div className="flex-1 min-w-0 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <p className="font-mono text-lg font-bold text-foreground">
                                                                    {request.service_request_id}
                                                                </p>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {request.request_type.replace(
                                                                        /_/g,
                                                                        " "
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                            <p className="font-semibold text-foreground text-base truncate">
                                                                {request.title}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                                                <p className="text-sm text-muted-foreground">
                                                                    Created:{" "}
                                                                    <span className="font-medium text-foreground font-mono">
                                                                        {new Date(
                                                                            request.created_at
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${opsCfg?.color || "bg-gray-100 text-gray-700 border-gray-300"} font-medium border whitespace-nowrap px-4 py-1.5 text-sm`}
                                                            >
                                                                {opsCfg?.label ||
                                                                    request.request_status}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`${comCfg?.color || "bg-gray-100 text-gray-700 border-gray-300"} font-medium border whitespace-nowrap text-xs`}
                                                            >
                                                                {comCfg?.label ||
                                                                    request.commercial_status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                View Details &rarr;
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>

                            {totalRequests > limit && (
                                <Card className="bg-card/80 backdrop-blur-sm border-border/40 mt-6">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                Showing {(page - 1) * limit + 1} to{" "}
                                                {Math.min(page * limit, totalRequests)} of{" "}
                                                {totalRequests} requests
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() =>
                                                        setPage((p) => Math.max(1, p - 1))
                                                    }
                                                    disabled={page === 1}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                >
                                                    <ChevronLeft className="h-4 w-4" /> Previous
                                                </Button>
                                                <Button
                                                    onClick={() => setPage((p) => p + 1)}
                                                    disabled={requests.length < limit}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                >
                                                    Next <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
