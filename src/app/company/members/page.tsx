"use client";

import { Users } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CompanyGate } from "../company-gate";
import { useCompanyMembers } from "@/hooks/use-company";

export default function CompanyMembersPage() {
    const { data, isLoading } = useCompanyMembers();
    const members: any[] = data?.data || [];

    return (
        <CompanyGate requiredPermission="company:view_users">
            <ClientNav>
                <ClientHeader
                    icon={Users}
                    title="Company Members"
                    description="People in your company with portal access."
                />
                <div className="px-8 py-6">
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Name
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Email
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Status
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold uppercase">
                                        Last Login
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={4}>
                                                <Skeleton className="h-6 w-full" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : members.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-10 text-muted-foreground font-mono text-sm"
                                        >
                                            No members found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    members.map((m) => (
                                        <TableRow key={m.id} className="border-border/50">
                                            <TableCell className="font-medium">{m.name}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {m.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`font-mono text-[10px] uppercase border ${
                                                        m.is_active === false
                                                            ? "bg-red-50 text-red-600 border-red-200"
                                                            : "bg-green-100 text-green-700 border-green-300"
                                                    }`}
                                                >
                                                    {m.is_active === false ? "Inactive" : "Active"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {m.last_login_at
                                                    ? new Date(m.last_login_at).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
