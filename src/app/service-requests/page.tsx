"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { ServiceRequestStatus, ServiceRequestType } from "@/types/service-request";
import { Search, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

export default function ClientServiceRequestsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "all">("all");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requestType, setRequestType] = useState<ServiceRequestType>("MAINTENANCE");
    const [requestedStartAt, setRequestedStartAt] = useState("");
    const [requestedDueAt, setRequestedDueAt] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemNotes, setItemNotes] = useState("");
    const [itemRefurbDays, setItemRefurbDays] = useState("");

    const filters = useMemo(
        () => ({
            page: 1,
            limit: 100,
            search_term: searchTerm || undefined,
            request_status: statusFilter === "all" ? undefined : statusFilter,
        }),
        [searchTerm, statusFilter]
    );

    const { data, isLoading, error } = useClientServiceRequests(filters);
    const createServiceRequest = useCreateServiceRequest();
    const requests = data?.data ?? [];
    const activeFilters = (searchTerm ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
    };

    const handleCreateServiceRequest = async () => {
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
                requested_due_at: requestedDueAt ? new Date(requestedDueAt).toISOString() : undefined,
                items: [
                    {
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

            setTitle("");
            setDescription("");
            setRequestType("MAINTENANCE");
            setRequestedStartAt("");
            setRequestedDueAt("");
            setItemName("");
            setItemQuantity(1);
            setItemNotes("");
            setItemRefurbDays("");
            toast.success("Service request created");
        } catch (error: any) {
            toast.error(error.message || "Failed to create service request");
        }
    };

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/30 to-background p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Requests</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track standalone maintenance, reskin, and refurbishment requests
                    </p>
                </div>

                <Card className="bg-card/80 border-border/40">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold">Create Service Request</h2>
                            <Button
                                onClick={handleCreateServiceRequest}
                                disabled={createServiceRequest.isPending}
                            >
                                {createServiceRequest.isPending ? "Creating..." : "Create Request"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                placeholder="Request title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <Select
                                value={requestType}
                                onValueChange={(value) => setRequestType(value as ServiceRequestType)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REQUEST_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.replace(/_/g, " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="datetime-local"
                                value={requestedStartAt}
                                onChange={(e) => setRequestedStartAt(e.target.value)}
                            />
                            <Input
                                type="datetime-local"
                                value={requestedDueAt}
                                onChange={(e) => setRequestedDueAt(e.target.value)}
                            />
                            <Input
                                placeholder="Item name"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                            />
                            <Input
                                type="number"
                                min={1}
                                placeholder="Quantity"
                                value={itemQuantity}
                                onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                            />
                            <Input
                                type="number"
                                min={0}
                                placeholder="Refurb days (optional)"
                                value={itemRefurbDays}
                                onChange={(e) => setItemRefurbDays(e.target.value)}
                            />
                            <Input
                                placeholder="Item notes (optional)"
                                value={itemNotes}
                                onChange={(e) => setItemNotes(e.target.value)}
                            />
                        </div>
                        <Textarea
                            placeholder="Request description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-card/80 border-border/40">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative md:col-span-2">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Search by request title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) =>
                                    setStatusFilter(value as ServiceRequestStatus | "all")
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_FILTERS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status === "all"
                                                ? "All statuses"
                                                : status.replace(/_/g, " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {activeFilters > 0 && (
                            <button
                                className="text-xs text-muted-foreground hover:text-foreground mt-3 inline-flex items-center gap-1"
                                onClick={clearFilters}
                            >
                                <X className="h-3 w-3" />
                                Clear filters
                            </button>
                        )}
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, index) => (
                            <Skeleton key={index} className="h-28 w-full" />
                        ))}
                    </div>
                ) : error ? (
                    <Card>
                        <CardContent className="p-8 text-center text-destructive">
                            Failed to load service requests.
                        </CardContent>
                    </Card>
                ) : requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center">
                            <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="font-medium">No service requests found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {activeFilters
                                    ? "Try adjusting your filters."
                                    : "No standalone service requests yet."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {requests.map((request) => (
                            <Link key={request.id} href={`/service-requests/${request.id}`}>
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="space-y-2">
                                                <p className="font-mono font-semibold text-primary">
                                                    {request.service_request_id}
                                                </p>
                                                <p className="font-medium">{request.title}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">
                                                        {request.request_type.replace(/_/g, " ")}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {request.billing_mode.replace(/_/g, " ")}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 md:justify-end">
                                                <Badge variant="secondary">
                                                    {request.request_status.replace(/_/g, " ")}
                                                </Badge>
                                                <Badge>
                                                    {request.commercial_status.replace(/_/g, " ")}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </ClientNav>
    );
}
