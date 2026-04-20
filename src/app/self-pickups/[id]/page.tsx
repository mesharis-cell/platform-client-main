"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useClientSelfPickupDetail,
    useClientApproveSelfPickupQuote,
    useClientDeclineSelfPickupQuote,
    useTriggerSelfPickupReturn,
} from "@/hooks/use-self-pickups";
import { usePlatform } from "@/contexts/platform-context";
import { ClientNav } from "@/components/client-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, Clock, Package } from "lucide-react";
import { toast } from "sonner";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "In Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    QUOTED: { label: "Quote Ready", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Collection",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Collected", color: "bg-teal-100 text-teal-700 border-teal-300" },
    IN_USE: { label: "In Use", color: "bg-purple-100 text-purple-700 border-purple-300" },
    AWAITING_RETURN: {
        label: "Return Pending",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    RETURNED: { label: "Returned", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function ClientSelfPickupDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            router.replace("/catalog");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const { data: pickupData, isLoading } = useClientSelfPickupDetail(id);
    const approveQuote = useClientApproveSelfPickupQuote();
    const declineQuote = useClientDeclineSelfPickupQuote();
    const triggerReturn = useTriggerSelfPickupReturn();

    const pickup = pickupData?.data;

    if (platformLoading || !selfPickupEnabled) {
        return null;
    }

    if (isLoading) {
        return (
            <ClientNav>
                <div className="mx-auto max-w-4xl px-8 py-12 space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </ClientNav>
        );
    }

    if (!pickup) {
        return (
            <ClientNav>
                <div className="text-center py-16 text-muted-foreground">Self-pickup not found</div>
            </ClientNav>
        );
    }

    const statusConfig = PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
        label: pickup.self_pickup_status,
        color: "bg-gray-100 text-gray-700",
    };
    const pickupWindow = pickup.pickup_window as any;
    const items = pickup.items || [];

    return (
        <ClientNav>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
                <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/self-pickups">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold">{pickup.self_pickup_id}</h1>
                            </div>
                            <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                            </Badge>
                        </div>

                        <div className="flex gap-2">
                            {pickup.self_pickup_status === "QUOTED" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            declineQuote.mutate(id, {
                                                onSuccess: () => toast.success("Quote declined"),
                                                onError: (e: unknown) =>
                                                    toast.error((e as Error).message),
                                            });
                                        }}
                                        disabled={declineQuote.isPending}
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            approveQuote.mutate(id, {
                                                onSuccess: () => toast.success("Quote approved"),
                                                onError: (e: unknown) =>
                                                    toast.error((e as Error).message),
                                            });
                                        }}
                                        disabled={approveQuote.isPending}
                                    >
                                        Approve Quote
                                    </Button>
                                </>
                            )}
                            {["PICKED_UP", "IN_USE"].includes(pickup.self_pickup_status) && (
                                <Button
                                    onClick={() => {
                                        triggerReturn.mutate(id, {
                                            onSuccess: () => toast.success("Return initiated"),
                                            onError: (e: unknown) =>
                                                toast.error((e as Error).message),
                                        });
                                    }}
                                    disabled={triggerReturn.isPending}
                                >
                                    Start Return
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Collector Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Collection Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{pickup.collector_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{pickup.collector_phone}</span>
                            </div>
                            {pickup.collector_email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{pickup.collector_email}</span>
                                </div>
                            )}
                            {pickupWindow && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        {new Date(pickupWindow.start).toLocaleString()} -{" "}
                                        {new Date(pickupWindow.end).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {pickup.expected_return_at && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Expected return:{" "}
                                        {new Date(pickup.expected_return_at).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {pickup.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{pickup.notes}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Items ({items.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{item.asset_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Qty: {item.quantity} | Vol: {item.total_volume} m3
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            <Package className="h-3 w-3 mr-1" />
                                            {item.quantity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ClientNav>
    );
}
