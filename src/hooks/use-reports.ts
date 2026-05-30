"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type ReportFilterType =
    | "company"
    | "date"
    | "category-include-exclude"
    | "group"
    | "status"
    | "team";

export interface ReportFilterMeta {
    key: string;
    label: string;
    type: ReportFilterType;
    required: boolean;
    scope?: "document" | "item";
    mode?: "include-only" | "include-exclude";
    options?: { value: string; label: string }[];
}

export type ReportSection = "INVENTORY" | "OPERATIONS" | "FINANCIAL";

export interface ReportCardMeta {
    key: string;
    label: string;
    description: string;
    section: ReportSection;
    audience: "ADMIN" | "ADMIN_CLIENT";
    filters: ReportFilterMeta[];
}

/**
 * Client-portal report registry — fetches the audience-filtered subset
 * (ADMIN_CLIENT only). company_id is forced to the caller's company server-side,
 * so the client never sends or sees a company picker.
 */
export function useClientReports() {
    return useQuery({
        queryKey: ["reports", "registry", "client"],
        queryFn: async () => {
            const res = await apiClient.get("/client/v1/reports");
            return (res.data?.data?.reports ?? []) as ReportCardMeta[];
        },
        staleTime: 5 * 60 * 1000,
    });
}
