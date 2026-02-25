"use client";

import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { ClientNav } from "@/components/client-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    useClientServiceRequestDetails,
    useRespondServiceRequestQuote,
} from "@/hooks/use-service-requests";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    ClipboardList,
    FileText,
    Package,
    Wrench,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground border-muted",
    SUBMITTED: "bg-primary/10 text-primary border-primary/30",
    IN_REVIEW: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    APPROVED: "bg-green-500/10 text-green-600 border-green-500/30",
    IN_PROGRESS: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
    COMPLETED: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

const commercialColors: Record<string, string> = {
    INTERNAL: "bg-slate-500/10 text-slate-600 border-slate-500/30",
    PENDING_QUOTE: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    QUOTED: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    QUOTE_APPROVED: "bg-green-500/10 text-green-600 border-green-500/30",
    INVOICED: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusHeroTitle: Record<string, string> = {
    DRAFT: "Request Created",
    SUBMITTED: "Request Submitted",
    IN_REVIEW: "Under Review",
    APPROVED: "Request Approved",
    IN_PROGRESS: "Work In Progress",
    COMPLETED: "Request Complete",
    CANCELLED: "Request Cancelled",
};

const statusHeroDesc: Record<string, string> = {
    DRAFT: "Your service request has been created and is ready for submission.",
    SUBMITTED: "Your request has been submitted. Our team will review it shortly.",
    IN_REVIEW: "Our team is reviewing your request and preparing a quote.",
    APPROVED: "Your request has been approved and work will begin soon.",
    IN_PROGRESS: "Work is currently in progress on your service request.",
    COMPLETED: "All work has been completed. Thank you!",
    CANCELLED: "This service request has been cancelled.",
};

const statusHeroIcon: Record<string, React.ReactNode> = {
    DRAFT: <FileText className="w-10 h-10 text-white" />,
    SUBMITTED: <CheckCircle2 className="w-10 h-10 text-white" />,
    IN_REVIEW: <Clock className="w-10 h-10 text-white" />,
    APPROVED: <CheckCircle2 className="w-10 h-10 text-white" />,
    IN_PROGRESS: <Wrench className="w-10 h-10 text-white" />,
    COMPLETED: <CheckCircle2 className="w-10 h-10 text-white" />,
    CANCELLED: <AlertCircle className="w-10 h-10 text-white" />,
};

const statusHeroBg: Record<string, string> = {
    DRAFT: "bg-muted-foreground",
    SUBMITTED: "bg-primary",
    IN_REVIEW: "bg-yellow-500",
    APPROVED: "bg-green-500",
    IN_PROGRESS: "bg-cyan-500",
    COMPLETED: "bg-teal-500",
    CANCELLED: "bg-destructive",
};

export default function ClientServiceRequestDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const { data, isLoading, refetch } = useClientServiceRequestDetails(routeId || null);
    const respondQuote = useRespondServiceRequestQuote();
    const [approvalNote, setApprovalNote] = useState("");
    const request = data?.data;

    const canApprove =
        request?.billing_mode === "CLIENT_BILLABLE" && request.commercial_status === "QUOTED";

    const handleRespond = async (action: "APPROVE" | "DECLINE" | "REQUEST_REVISION") => {
        if (!request) return;
        try {
            await respondQuote.mutateAsync({
                id: request.id,
                action,
                note: approvalNote.trim() || undefined,
            });
            setApprovalNote("");
            const successMessage =
                action === "APPROVE"
                    ? "Quote approved"
                    : action === "DECLINE"
                      ? "Quote declined and returned for revision"
                      : "Revision requested";
            toast.success(successMessage);
            refetch();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit response");
        }
    };

    if (isLoading) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background">
                    <div className="max-w-7xl mx-auto px-8 py-10">
                        <Skeleton className="h-40 w-full mb-8" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </ClientNav>
        );
    }

    if (!request) {
        return (
            <ClientNav>
                <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background flex items-center justify-center p-8">
                    <Card className="max-w-md w-full p-10 text-center border-border/50 bg-card/50">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Request Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            This service request does not exist or you don't have access.
                        </p>
                        <Button
                            onClick={() => router.push("/service-requests")}
                            variant="outline"
                            className="gap-2 font-mono"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Requests
                        </Button>
                    </Card>
                </div>
            </ClientNav>
        );
    }

    const status = request.request_status;

    return (
        <ClientNav>
            <div className="min-h-screen bg-linear-gradient-to-br from-background via-muted/10 to-background relative">
                <div
                    className="fixed inset-0 opacity-[0.015] pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground mb-8 font-mono"
                    >
                        <button
                            onClick={() => router.push("/service-requests")}
                            className="hover:text-foreground transition-colors"
                        >
                            Service Requests
                        </button>
                        <span>/</span>
                        <span className="text-foreground">{request.service_request_id}</span>
                    </motion.div>

                    {/* Status Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Badge
                                            className={`font-mono text-xs border ${statusColors[status] || "bg-muted border-muted"}`}
                                        >
                                            {status.replace(/_/g, " ")}
                                        </Badge>
                                        <Badge
                                            className={`font-mono text-xs border ${commercialColors[request.commercial_status] || "bg-muted border-muted"}`}
                                        >
                                            {request.commercial_status.replace(/_/g, " ")}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Submitted{" "}
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h1 className="text-4xl font-bold mb-2">
                                        {statusHeroTitle[status] || "Service Request"}
                                    </h1>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {statusHeroDesc[status] || ""}
                                    </p>
                                </div>
                                <div
                                    className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${statusHeroBg[status] || "bg-primary"}`}
                                >
                                    {statusHeroIcon[status] || (
                                        <Wrench className="w-10 h-10 text-white" />
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Request ID Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                    >
                        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                        Request ID
                                    </p>
                                    <p className="text-2xl font-bold font-mono tracking-wider">
                                        {request.service_request_id}
                                    </p>
                                </div>
                                <ClipboardList className="h-12 w-12 text-primary/20" />
                            </div>
                        </Card>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quote Approval */}
                            {canApprove && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                >
                                    <Card className="p-6 bg-amber-500/5 border-amber-500/20">
                                        <h3 className="font-bold font-mono mb-4 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Action Required
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Your quote is ready. Review and approve to proceed.
                                        </p>
                                        <div className="space-y-3">
                                            <div>
                                                <Label>Approval Note (Optional)</Label>
                                                <Textarea
                                                    value={approvalNote}
                                                    onChange={(e) =>
                                                        setApprovalNote(e.target.value)
                                                    }
                                                    placeholder="Any acceptance notes..."
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    onClick={() => handleRespond("APPROVE")}
                                                    disabled={respondQuote.isPending}
                                                    className="font-mono"
                                                >
                                                    {respondQuote.isPending
                                                        ? "Submitting..."
                                                        : "Approve Quote"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleRespond("REQUEST_REVISION")
                                                    }
                                                    disabled={respondQuote.isPending}
                                                    className="font-mono"
                                                >
                                                    Request Revision
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleRespond("DECLINE")}
                                                    disabled={respondQuote.isPending}
                                                    className="font-mono"
                                                >
                                                    Decline (Non-Terminal)
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Quote Status (non-approvable billable) */}
                            {!canApprove &&
                                request.billing_mode === "CLIENT_BILLABLE" &&
                                !["INTERNAL", "CANCELLED"].includes(request.commercial_status) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileText className="w-5 h-5 text-primary" />
                                                <h3 className="font-bold font-mono uppercase tracking-wide text-sm">
                                                    Quote Status
                                                </h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Commercial status:{" "}
                                                <Badge
                                                    className={`font-mono text-xs border ml-2 ${commercialColors[request.commercial_status] || ""}`}
                                                >
                                                    {request.commercial_status.replace(/_/g, " ")}
                                                </Badge>
                                            </p>
                                        </Card>
                                    </motion.div>
                                )}

                            {/* Requested Items */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="h-5 w-5" /> Requested Items
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {request.items?.length ? (
                                            request.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-md border p-4 bg-background/50"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold">
                                                            {item.asset_name}
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-xs"
                                                        >
                                                            Qty: {item.quantity}
                                                        </Badge>
                                                    </div>
                                                    {item.refurb_days_estimate !== null && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Refurb estimate:{" "}
                                                            {item.refurb_days_estimate} days
                                                        </p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-sm mt-1">{item.notes}</p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted-foreground">
                                                No items listed.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Status History */}
                            {request.status_history && request.status_history.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Clock className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-bold font-mono uppercase tracking-wide">
                                                Timeline
                                            </h3>
                                        </div>
                                        <div className="space-y-1 relative">
                                            {[...request.status_history]
                                                .sort(
                                                    (a, b) =>
                                                        new Date(b.changed_at).getTime() -
                                                        new Date(a.changed_at).getTime()
                                                )
                                                .map((entry, index, arr) => {
                                                    const isFirst = index === 0;
                                                    const ts = new Date(entry.changed_at);
                                                    return (
                                                        <div
                                                            key={entry.id}
                                                            className="flex gap-3 py-2"
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                <div
                                                                    className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${isFirst ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
                                                                />
                                                                {index < arr.length - 1 && (
                                                                    <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 pb-2">
                                                                <p
                                                                    className={`text-sm font-semibold font-mono ${isFirst ? "text-primary" : "text-muted-foreground"}`}
                                                                >
                                                                    {(
                                                                        entry.from_status || "NONE"
                                                                    ).replace(/_/g, " ")}{" "}
                                                                    &rarr;{" "}
                                                                    {entry.to_status.replace(
                                                                        /_/g,
                                                                        " "
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {ts.toLocaleDateString()}{" "}
                                                                    {ts.toLocaleTimeString([], {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </p>
                                                                {entry.note && (
                                                                    <p className="text-xs mt-1">
                                                                        {entry.note}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* What's Next */}
                            {["SUBMITTED", "IN_REVIEW"].includes(status) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Card className="p-6 bg-secondary/5 border-secondary/20">
                                        <h3 className="font-bold font-mono mb-4 uppercase tracking-wide text-sm">
                                            What's Next
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    1
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">Review</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Our team reviews your request and assesses
                                                        scope.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    2
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">Quote</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        You'll receive a quote to approve or
                                                        discuss.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                                                    3
                                                </div>
                                                <div>
                                                    <p className="font-semibold mb-1">Execution</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Upon approval, work begins and you'll be
                                                        updated throughout.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {status === "COMPLETED" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Card className="p-6 bg-teal-500/5 border-teal-500/20">
                                        <h3 className="font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> All Done
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            This service request has been completed successfully.
                                        </p>
                                        <Button
                                            onClick={() => router.push("/service-requests")}
                                            variant="outline"
                                            className="font-mono gap-2"
                                        >
                                            <ClipboardList className="w-4 h-4" /> View All Requests
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Request Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Wrench className="w-4 h-4 text-primary" />
                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                            Details
                                        </h4>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Type
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {request.request_type.replace(/_/g, " ")}
                                            </p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Billing
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {request.billing_mode.replace(/_/g, " ")}
                                            </p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Title
                                            </p>
                                            <p className="font-semibold">{request.title}</p>
                                        </div>
                                        {request.description && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase">
                                                        Description
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        {request.description}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Dates */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <h4 className="font-bold font-mono text-sm uppercase tracking-wide">
                                            Schedule
                                        </h4>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Requested Start
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {request.requested_start_at
                                                    ? new Date(
                                                          request.requested_start_at
                                                      ).toLocaleDateString()
                                                    : "Not set"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Requested Due
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {request.requested_due_at
                                                    ? new Date(
                                                          request.requested_due_at
                                                      ).toLocaleDateString()
                                                    : "Not set"}
                                            </p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono uppercase">
                                                Created
                                            </p>
                                            <p className="font-mono font-semibold">
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 flex gap-3"
                    >
                        <Button
                            variant="outline"
                            onClick={() => router.push("/service-requests")}
                            className="font-mono gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> All Requests
                        </Button>
                    </motion.div>
                </div>
            </div>
        </ClientNav>
    );
}
