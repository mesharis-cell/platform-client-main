"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AttachmentEntityType =
    | "ORDER"
    | "INBOUND_REQUEST"
    | "SERVICE_REQUEST"
    | "SELF_PICKUP"
    | "WORKFLOW_REQUEST";

export interface EntityAttachment {
    id: string;
    entity_type: AttachmentEntityType;
    entity_id: string;
    file_url: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number | null;
    note: string | null;
    visible_to_client: boolean;
    created_at: string;
    attachment_type: {
        id: string;
        code: string;
        label: string;
        required_note?: boolean;
    };
    uploaded_by_user: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
}

export interface AttachmentTypeRecord {
    id: string;
    code: string;
    label: string;
    allowed_entity_types: AttachmentEntityType[];
    upload_roles: ("ADMIN" | "LOGISTICS" | "CLIENT")[];
    view_roles: ("ADMIN" | "LOGISTICS" | "CLIENT")[];
    default_visible_to_client: boolean;
    required_note?: boolean;
    is_active: boolean;
    sort_order: number;
}

type CreateAttachmentInput = {
    attachment_type_id: string;
    file_url: string;
    file_name: string;
    mime_type: string;
    file_size_bytes?: number;
    note?: string;
    visible_to_client?: boolean;
};

type AttachmentTypeQueryParams = {
    entityType?: AttachmentEntityType;
    mode?: "view" | "upload";
    entityId?: string | null;
    contextEntityType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP";
    contextEntityId?: string | null;
    enabled?: boolean;
};

const pathByEntityType: Record<AttachmentEntityType, string> = {
    ORDER: "order",
    INBOUND_REQUEST: "inbound-request",
    SERVICE_REQUEST: "service-request",
    SELF_PICKUP: "self-pickup",
    WORKFLOW_REQUEST: "workflow-request",
};

export function useAttachmentTypes(params?: AttachmentTypeQueryParams) {
    return useQuery({
        queryKey: [
            "attachment-types",
            params?.entityType || "all",
            params?.mode || "view",
            params?.entityId || null,
            params?.contextEntityType || null,
            params?.contextEntityId || null,
        ],
        queryFn: async (): Promise<{ data: AttachmentTypeRecord[] }> => {
            try {
                const searchParams = new URLSearchParams();
                if (params?.entityType) searchParams.set("entity_type", params.entityType);
                if (params?.mode) searchParams.set("mode", params.mode);
                if (params?.entityId) searchParams.set("entity_id", params.entityId);
                if (params?.contextEntityType) {
                    searchParams.set("context_entity_type", params.contextEntityType);
                }
                if (params?.contextEntityId) {
                    searchParams.set("context_entity_id", params.contextEntityId);
                }
                const query = searchParams.toString();
                const response = await apiClient.get(
                    `/operations/v1/attachment-types${query ? `?${query}` : ""}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: params?.enabled ?? true,
    });
}

export function useEntityAttachments(
    entityType: AttachmentEntityType,
    entityId: string | null,
    enabled = true
) {
    return useQuery({
        queryKey: ["entity-attachments", entityType, entityId],
        queryFn: async (): Promise<{ data: EntityAttachment[] }> => {
            if (!entityId) return { data: [] };
            try {
                const response = await apiClient.get(
                    `/operations/v1/${pathByEntityType[entityType]}/${entityId}/attachments`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!entityId && enabled,
    });
}

export function useCreateEntityAttachments(
    entityType: AttachmentEntityType,
    entityId: string | null
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (attachments: CreateAttachmentInput[]) => {
            if (!entityId) throw new Error("Entity id is required");
            try {
                const response = await apiClient.post(
                    `/operations/v1/${pathByEntityType[entityType]}/${entityId}/attachments`,
                    { attachments }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["entity-attachments", entityType, entityId],
            });
        },
    });
}
