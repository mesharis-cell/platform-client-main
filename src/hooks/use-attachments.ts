"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useQuery } from "@tanstack/react-query";

export type AttachmentEntityType = "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";

export interface EntityAttachment {
    id: string;
    entity_type: AttachmentEntityType | "WORKFLOW_REQUEST";
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

const pathByEntityType: Record<AttachmentEntityType, string> = {
    ORDER: "order",
    INBOUND_REQUEST: "inbound-request",
    SERVICE_REQUEST: "service-request",
};

export function useEntityAttachments(entityType: AttachmentEntityType, entityId: string | null) {
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
        enabled: !!entityId,
    });
}
