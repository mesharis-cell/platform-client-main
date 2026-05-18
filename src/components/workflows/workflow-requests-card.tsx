"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Workflow, ChevronDown, ChevronUp, AlertCircle, Upload } from "lucide-react";
import {
    useEntityWorkflows,
    useUpdateWorkflowRequest,
    type WorkflowRequest,
    type EntityWorkflowEntityType,
    type WorkflowIntakeField,
} from "@/hooks/use-entity-workflows";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { usePlatform } from "@/contexts/platform-context";
import { toast } from "sonner";
import { useAttachmentTypes, useCreateEntityAttachments } from "@/hooks/use-attachments";
import { uploadDocuments } from "@/lib/utils/upload-documents";

type Props = {
    entityType: EntityWorkflowEntityType;
    entityId: string | null;
    title?: string;
};

const getClientSubmitStatus = (workflow: WorkflowRequest) => {
    if (workflow.status_model_key === "document_collection") {
        return "UNDER_REVIEW";
    }
    if (workflow.status_model_key === "approval") {
        return "IN_REVIEW";
    }
    return "IN_PROGRESS";
};
const INTAKE_VALUES_KEY = "intake_values";

const getIntakeFields = (workflow: WorkflowRequest): WorkflowIntakeField[] => {
    const fields = workflow.intake_schema?.fields || [];
    return Array.isArray(fields) ? fields : [];
};

const getWorkflowIntakeValues = (workflow: WorkflowRequest) => {
    const values = workflow.metadata?.[INTAKE_VALUES_KEY];
    return values && typeof values === "object" && !Array.isArray(values)
        ? (values as Record<string, string | number | null>)
        : {};
};

const isClientEditableWorkflow = (workflow: WorkflowRequest) =>
    workflow.lifecycle_state === "OPEN" ||
    ["REQUESTED", "COLLECTING", "OPEN", "PENDING"].includes(workflow.status);

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
    const [selectedAttachmentTypeId, setSelectedAttachmentTypeId] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [attachmentNote, setAttachmentNote] = useState("");
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [draftIntakeValues, setDraftIntakeValues] = useState<
        Record<string, Record<string, string>>
    >({});

    const workflows = useMemo(() => {
        const rows = data?.data || [];
        return [...rows].sort((a, b) => {
            const aOpen = isClientEditableWorkflow(a) ? 0 : 1;
            const bOpen = isClientEditableWorkflow(b) ? 0 : 1;
            if (aOpen !== bOpen) return aOpen - bOpen;
            return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
        });
    }, [data?.data]);
    const expandedWorkflow = useMemo(
        () => workflows.find((workflow) => workflow.id === expandedId) || null,
        [expandedId, workflows]
    );
    const { data: attachmentTypesData } = useAttachmentTypes({
        entityType: "WORKFLOW_REQUEST",
        mode: "upload",
        contextEntityType: entityType,
        contextEntityId: entityId,
        enabled: workflowsEnabled && !!expandedWorkflow,
    });
    const createAttachments = useCreateEntityAttachments("WORKFLOW_REQUEST", expandedId);
    const workflowAttachmentTypes = useMemo(
        () => (attachmentTypesData?.data || []).filter((type) => type.is_active),
        [attachmentTypesData?.data]
    );

    if (!workflowsEnabled) return null;

    // Only render the card when there's at least one workflow the client
    // can see — otherwise the section is noise.
    if (!isLoading && workflows.length === 0) return null;

    const resetUploadDraft = () => {
        setSelectedFiles([]);
        setAttachmentNote("");
        setSelectedAttachmentTypeId("");
    };

    const handleIntakeValueChange = (workflowId: string, key: string, value: string) => {
        setDraftIntakeValues((prev) => ({
            ...prev,
            [workflowId]: {
                ...(prev[workflowId] || {}),
                [key]: value,
            },
        }));
    };

    const handleUpload = async (workflow: WorkflowRequest) => {
        if (selectedFiles.length === 0) {
            toast.error("Select files to upload");
            return false;
        }

        const attachmentTypeId = selectedAttachmentTypeId || workflowAttachmentTypes[0]?.id;
        if (!attachmentTypeId) {
            toast.error("No uploadable attachment type is available");
            return false;
        }

        try {
            setActiveUploadId(workflow.id);
            const uploaded = await uploadDocuments({ files: selectedFiles });
            await createAttachments.mutateAsync(
                uploaded.map((file) => ({
                    attachment_type_id: attachmentTypeId,
                    file_url: file.fileUrl,
                    file_name: file.fileName,
                    mime_type: file.mimeType,
                    file_size_bytes: file.fileSizeBytes,
                    ...(attachmentNote.trim() ? { note: attachmentNote.trim() } : {}),
                    visible_to_client: true,
                }))
            );
            toast.success("Files uploaded");
            resetUploadDraft();
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to upload files");
            return false;
        } finally {
            setActiveUploadId(null);
        }
    };

    const handleSubmit = async (workflow: WorkflowRequest) => {
        try {
            const intakeDraft = draftIntakeValues[workflow.id] || {};
            const currentIntakeValues = getWorkflowIntakeValues(workflow);
            const nextIntakeValues = { ...currentIntakeValues, ...intakeDraft };
            const missingField = getIntakeFields(workflow).find(
                (field) => field.required && !String(nextIntakeValues[field.key] ?? "").trim()
            );
            if (missingField) {
                toast.error(`${missingField.label} is required`);
                return;
            }

            if (selectedFiles.length > 0) {
                const uploaded = await handleUpload(workflow);
                if (!uploaded) return;
            }

            const nextStatus = getClientSubmitStatus(workflow);
            await updateMutation.mutateAsync({
                id: workflow.id,
                payload: {
                    status: nextStatus,
                    metadata: {
                        ...workflow.metadata,
                        [INTAKE_VALUES_KEY]: nextIntakeValues,
                    },
                    transition_note: "Submitted by client for review",
                },
            });
            setDraftIntakeValues((prev) => {
                const next = { ...prev };
                delete next[workflow.id];
                return next;
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
                    const isOpen = isClientEditableWorkflow(workflow);
                    const isTerminal =
                        workflow.lifecycle_state === "DONE" ||
                        workflow.lifecycle_state === "CANCELLED" ||
                        ["COMPLETED", "CANCELLED", "APPROVED"].includes(workflow.status);
                    const isExpanded = expandedId === workflow.id;
                    const intakeFields = getIntakeFields(workflow);
                    const intakeValues = getWorkflowIntakeValues(workflow);

                    return (
                        <div
                            key={workflow.id}
                            className={`rounded-lg border p-4 ${
                                isTerminal
                                    ? "border-border/40 bg-muted/10 opacity-80"
                                    : "border-amber-500/40 bg-amber-50/40"
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
                                    onClick={() => {
                                        setExpandedId(isExpanded ? null : workflow.id);
                                        resetUploadDraft();
                                    }}
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

                                    {isOpen && (
                                        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                                            {intakeFields.length > 0 && (
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    {intakeFields.map((field) => {
                                                        const value =
                                                            draftIntakeValues[workflow.id]?.[
                                                                field.key
                                                            ] ??
                                                            String(intakeValues[field.key] ?? "");
                                                        const inputId = `${workflow.id}-${field.key}`;
                                                        return (
                                                            <div
                                                                key={field.key}
                                                                className={
                                                                    field.type === "textarea"
                                                                        ? "md:col-span-2"
                                                                        : ""
                                                                }
                                                            >
                                                                <Label
                                                                    htmlFor={inputId}
                                                                    className="text-xs font-mono"
                                                                >
                                                                    {field.label}
                                                                    {field.required ? (
                                                                        <span className="ml-1 text-destructive">
                                                                            *
                                                                        </span>
                                                                    ) : null}
                                                                </Label>
                                                                {field.type === "textarea" ? (
                                                                    <Textarea
                                                                        id={inputId}
                                                                        value={value}
                                                                        rows={3}
                                                                        className="mt-1"
                                                                        onChange={(event) =>
                                                                            handleIntakeValueChange(
                                                                                workflow.id,
                                                                                field.key,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <Input
                                                                        id={inputId}
                                                                        type={field.type}
                                                                        value={value}
                                                                        className="mt-1"
                                                                        onChange={(event) =>
                                                                            handleIntakeValueChange(
                                                                                workflow.id,
                                                                                field.key,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor={`workflow-files-${workflow.id}`}
                                                    >
                                                        Upload files
                                                    </Label>
                                                    <Input
                                                        id={`workflow-files-${workflow.id}`}
                                                        type="file"
                                                        multiple
                                                        onChange={(event) =>
                                                            setSelectedFiles(
                                                                Array.from(event.target.files || [])
                                                            )
                                                        }
                                                    />
                                                </div>
                                                {workflowAttachmentTypes.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label>File type</Label>
                                                        <Select
                                                            value={
                                                                selectedAttachmentTypeId ||
                                                                workflowAttachmentTypes[0]?.id ||
                                                                ""
                                                            }
                                                            onValueChange={
                                                                setSelectedAttachmentTypeId
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {workflowAttachmentTypes.map(
                                                                    (type) => (
                                                                        <SelectItem
                                                                            key={type.id}
                                                                            value={type.id}
                                                                        >
                                                                            {type.label}
                                                                        </SelectItem>
                                                                    )
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`workflow-note-${workflow.id}`}>
                                                    Note
                                                </Label>
                                                <Textarea
                                                    id={`workflow-note-${workflow.id}`}
                                                    value={attachmentNote}
                                                    onChange={(event) =>
                                                        setAttachmentNote(event.target.value)
                                                    }
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleUpload(workflow)}
                                                    disabled={
                                                        selectedFiles.length === 0 ||
                                                        createAttachments.isPending ||
                                                        activeUploadId === workflow.id
                                                    }
                                                    size="sm"
                                                >
                                                    <Upload className="mr-1 h-4 w-4" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    onClick={() => handleSubmit(workflow)}
                                                    disabled={
                                                        updateMutation.isPending ||
                                                        createAttachments.isPending ||
                                                        activeUploadId === workflow.id
                                                    }
                                                    size="sm"
                                                >
                                                    Submit for review
                                                </Button>
                                            </div>
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
