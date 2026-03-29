"use client";

/**
 * Assets Inbound Page
 */

import { useState } from "react";
import { useInboundRequests } from "@/hooks/use-inbound-requests";
import { CreateInboundRequestDialog } from "@/components/assets/create-inbound-request-dialog";
import { ClientHeader } from "@/components/client-header";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { DataTable, DataTableSearch, DataTableRow } from "@/components/ui/data-table";
import type { InboundRequestStatus } from "@/types/inbound-request";
import { ClientNav } from "@/components/client-nav";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_COLORS: Record<InboundRequestStatus, string> = {
    PRICING_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    PENDING_APPROVAL: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    QUOTED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    CONFIRMED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    DECLINED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function AssetsInboundPage() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { data, isLoading, refetch } = useInboundRequests({ search_term: search });

    return (
        <ClientNav>
            <ClientHeader
                icon={Package}
                title="New Stock Requests"
                description="Manage incoming stock requests"
                actions={
                    <Button size="lg" className="font-mono" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Request
                    </Button>
                }
            />

            <DataTable
                filters={
                    <DataTableSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by ID, item name, or company..."
                    />
                }
                columns={[
                    "Inbound ID",
                    "Company",
                    "Delivery Date",
                    "Status",
                    "Created",
                    { label: "", className: "w-[50px]" },
                ]}
                loading={isLoading}
                hasData={(data?.data.length ?? 0) > 0}
                empty={{
                    icon: Package,
                    message: search ? "No requests match your search" : "No new stock requests yet",
                    action: !search ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 font-mono"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Request
                        </Button>
                    ) : undefined,
                }}
            >
                {data?.data.map((request, index) => (
                    <DataTableRow key={request.id} index={index}>
                        <TableCell className="font-mono">{request.inbound_request_id}</TableCell>
                        <TableCell className="font-mono">{request.company?.name || "-"}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {format(request.incoming_at, "MMM dd, yyyy")}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant="outline"
                                className={`font-mono text-xs ${STATUS_COLORS[request.request_status as InboundRequestStatus] || "bg-muted text-muted-foreground"}`}
                            >
                                {request.request_status}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                            {format(request.created_at, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                            <Link href={`/assets-inbound/${request.id}`}>
                                <Button variant="default">Details</Button>
                            </Link>
                        </TableCell>
                    </DataTableRow>
                ))}
            </DataTable>

            {/* Create dialog */}
            <CreateInboundRequestDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    refetch();
                }}
            />
        </ClientNav>
    );
}
