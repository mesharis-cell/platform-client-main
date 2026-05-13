"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type EntityWorkflowEntityType = "ORDER" | "SELF_PICKUP";

const entityBasePath: Record<EntityWorkflowEntityType, string> = {
    ORDER: "order",
    SELF_PICKUP: "self-pickup",
};

export type WorkflowRequest = {
    id: string;
    workflow_code: string;
    workflow_label: string;
    workflow_family: string;
    status: string;
    title: string;
    description: string | null;
    metadata: Record<string, unknown>;
    requested_at: string;
    acknowledged_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
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
