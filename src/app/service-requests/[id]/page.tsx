"use client";

import { ClientNav } from "@/components/client-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    useApproveServiceRequestQuote,
    useClientServiceRequestDetails,
} from "@/hooks/use-service-requests";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const APPROVABLE_COMMERCIAL_STATUSES = new Set(["QUOTED"]);

export default function ClientServiceRequestDetailsPage() {
    const params = useParams<{ id: string }>();
    const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const { data, isLoading, refetch } = useClientServiceRequestDetails(routeId || null);
    const approveQuote = useApproveServiceRequestQuote();
    const [approvalNote, setApprovalNote] = useState("");
    const request = data?.data;
    const canApprove =
        request?.billing_mode === "CLIENT_BILLABLE" &&
        APPROVABLE_COMMERCIAL_STATUSES.has(request.commercial_status);

    const handleApprove = async () => {
        if (!request) return;

        try {
            await approveQuote.mutateAsync({
                id: request.id,
                note: approvalNote.trim() || undefined,
            });
            setApprovalNote("");
            toast.success("Quote approved");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        }
    };

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/30 to-background p-6 space-y-6">
                <div className="space-y-1">
                    <Link
                        href="/service-requests"
                        className="text-sm text-muted-foreground hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4 inline mr-1" />
                        Back to service requests
                    </Link>
                    <h1 className="text-2xl font-bold">
                        {request?.service_request_id || "Service Request"}
                    </h1>
                    {request && <p className="text-muted-foreground">{request.title}</p>}
                </div>

                {isLoading ? (
                    <Card>
                        <CardContent className="p-8 text-muted-foreground">
                            Loading service request...
                        </CardContent>
                    </Card>
                ) : !request ? (
                    <Card>
                        <CardContent className="p-8 text-destructive">
                            Service request not found.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium">
                                        {request.request_type.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Billing</p>
                                    <p className="font-medium">
                                        {request.billing_mode.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Operational Status</p>
                                    <Badge variant="secondary">
                                        {request.request_status.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Commercial Status</p>
                                    <Badge>{request.commercial_status.replace(/_/g, " ")}</Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Requested Start</p>
                                    <p>
                                        {request.requested_start_at
                                            ? new Date(request.requested_start_at).toLocaleString()
                                            : "Not set"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Requested Due</p>
                                    <p>
                                        {request.requested_due_at
                                            ? new Date(request.requested_due_at).toLocaleString()
                                            : "Not set"}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-muted-foreground">Description</p>
                                    <p>{request.description || "No description provided"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Requested Items</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {request.items?.length ? (
                                    request.items.map((item) => (
                                        <div key={item.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium">{item.asset_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Qty: {item.quantity}
                                                </p>
                                            </div>
                                            {item.refurb_days_estimate !== null && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Refurb days estimate:{" "}
                                                    {item.refurb_days_estimate}
                                                </p>
                                            )}
                                            {item.notes && (
                                                <p className="text-sm mt-1">{item.notes}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">No items listed.</p>
                                )}
                            </CardContent>
                        </Card>

                        {canApprove && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quote Approval</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Approval Note (Optional)</Label>
                                        <Textarea
                                            value={approvalNote}
                                            onChange={(e) => setApprovalNote(e.target.value)}
                                            placeholder="Any acceptance notes..."
                                        />
                                    </div>
                                    <Button
                                        onClick={handleApprove}
                                        disabled={approveQuote.isPending}
                                    >
                                        {approveQuote.isPending ? "Approving..." : "Approve Quote"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {!canApprove && request.billing_mode === "CLIENT_BILLABLE" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quote Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Input
                                        readOnly
                                        value={`Current commercial status: ${request.commercial_status.replace(/_/g, " ")}`}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Status History</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {request.status_history?.length ? (
                                    request.status_history.map((entry) => (
                                        <div key={entry.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <p className="font-medium">
                                                    {(entry.from_status || "NONE").replace(
                                                        /_/g,
                                                        " "
                                                    )}
                                                    {" -> "}
                                                    {entry.to_status.replace(/_/g, " ")}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {new Date(entry.changed_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {entry.note && (
                                                <p className="text-sm mt-1">{entry.note}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">No status updates yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </ClientNav>
    );
}
