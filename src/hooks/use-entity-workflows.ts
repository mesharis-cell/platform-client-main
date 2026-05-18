"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type EntityWorkflowEntityType = "ORDER" | "SELF_PICKUP";
export type WorkflowIntakeFieldType = "text" | "textarea" | "date" | "number";

export interface WorkflowIntakeField {
    key: string;
    label: string;
    type: WorkflowIntakeFieldType;
    required?: boolean;
}

export interface WorkflowIntakeSchema {
    fields?: WorkflowIntakeField[];
    required_attachment_type_ids?: string[];
}

const entityBasePath: Record<EntityWorkflowEntityType, string> = {
    ORDER: "order",
    SELF_PICKUP: "self-pickup",
};

export type WorkflowRequest = {
    id: string;
    platform_id: string;
    entity_type: EntityWorkflowEntityType;
    entity_id: string;
    workflow_definition_id: string;
    workflow_code: string;
    workflow_label: string;
    workflow_family: string;
    status_model_key: string;
    status: string;
    lifecycle_state: "OPEN" | "ACTIVE" | "DONE" | "CANCELLED";
    title: string;
    description: string | null;
    requested_by: string;
    requested_by_role: "ADMIN" | "LOGISTICS" | "CLIENT";
    metadata: Record<string, unknown>;
    intake_schema: WorkflowIntakeSchema;
    requested_at: string;
    acknowledged_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
    status_history?: Array<{
        id: string;
        workflow_request_id: string;
        from_status: string | null;
        to_status: string;
        changed_by: string | null;
        changed_at: string;
        note: string | null;
        changed_by_user?: {
            id: string;
            name: string | null;
            email: string | null;
        } | null;
    }>;
};

export function useEntityWorkflows(
    entityType: EntityWorkflowEntityType,
    entityId: string | null,
    enabled = true
) {
    return useQuery({
        queryKey: ["entity-workflows", entityType, entityId],
        queryFn: async (): Promise<{ data: WorkflowRequest[] }> => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/${entityBasePath[entityType]}/${entityId}/workflow-requests`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: enabled && !!entityId,
        staleTime: 30000,
    });
}

export function useUpdateWorkflowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: {
                status?: string;
                metadata?: Record<string, unknown>;
                title?: string;
                description?: string | null;
                transition_note?: string;
            };
        }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/workflow-request/${id}`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["entity-workflows"] });
        },
    });
}
