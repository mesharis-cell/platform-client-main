"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Workflow, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import {
    useEntityWorkflows,
    useUpdateWorkflowRequest,
    type EntityWorkflowEntityType,
} from "@/hooks/use-entity-workflows";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { usePlatform } from "@/contexts/platform-context";
import { toast } from "sonner";

type Props = {
    entityType: EntityWorkflowEntityType;
    entityId: string | null;
    title?: string;
};

// Item 4 client-portal surface — read-only summary of workflow_requests on
// the entity, with a "Submit" action when the workflow is in an OPEN-style
// status. Attachments live inside the workflow via the existing
// EntityAttachmentsCard scoped to entity_type=WORKFLOW_REQUEST. Per
// CLAUDE.md, clients only see workflows where their role is in
// viewer_roles or actor_roles (server-filtered).
export function ClientWorkflowRequestsCard({
    entityType,
    entityId,
    title = "Action Required",
}: Props) {
    const { platform } = usePlatform();
    const workflowsEnabled = platform?.features?.enable_workflows !== false;
    const { data, isLoading } = useEntityWorkflows(entityType, entityId, workflowsEnabled);
    const updateMutation = useUpdateWorkflowRequest();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!workflowsEnabled) return null;

    const workflows = data?.data || [];
    // Only render the card when there's at least one workflow the client
    // can see — otherwise the section is noise.
    if (!isLoading && workflows.length === 0) return null;

    const handleSubmit = async (id: string, current: string) => {
        try {
            const nextStatus = current === "OPEN" ? "SUBMITTED" : "SUBMITTED";
            await updateMutation.mutateAsync({
                id,
                payload: { status: nextStatus },
            });
            toast.success("Submitted for review");
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && <Skeleton className="h-16 w-full" />}
                {workflows.map((workflow) => {
                    const isOpen = ["OPEN", "REQUESTED", "PENDING"].includes(workflow.status);
                    const isTerminal = ["COMPLETED", "CANCELLED", "APPROVED"].includes(
                        workflow.status
                    );
                    const isExpanded = expandedId === workflow.id;

                    return (
                        <div
                            key={workflow.id}
                            className={`rounded-lg border p-4 ${
                                isTerminal
                                    ? "border-border/40 bg-muted/10 opacity-80"
                                    : "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {!isTerminal && (
                                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                        )}
                                        <p className="font-medium">{workflow.workflow_label}</p>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {workflow.status}
                                        </Badge>
                                    </div>
                                    {workflow.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {workflow.description}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        setExpandedId(isExpanded ? null : workflow.id)
                                    }
                                >
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {isExpanded && (
                                <div className="mt-4 space-y-3 border-t pt-3">
                                    {/* Attachments on the workflow — uses the same component
                                        used elsewhere; entity_type='WORKFLOW_REQUEST' was
                                        unblocked by item 3's hook fix. */}
                                    <EntityAttachmentsCard
                                        entityType="WORKFLOW_REQUEST"
                                        entityId={workflow.id}
                                        title="Files"
                                    />

                                    {/* Action button — only shown for non-terminal statuses. */}
                                    {isOpen && (
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() =>
                                                    handleSubmit(workflow.id, workflow.status)
                                                }
                                                disabled={updateMutation.isPending}
                                                size="sm"
                                            >
                                                Submit for review
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
