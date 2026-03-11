"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityAttachments, type AttachmentEntityType } from "@/hooks/use-attachments";
import { usePlatform } from "@/contexts/platform-context";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EntityAttachmentsCard({
    entityType,
    entityId,
    title = "Attachments",
}: {
    entityType: AttachmentEntityType;
    entityId: string | null;
    title?: string;
}) {
    const { platform } = usePlatform();
    const attachmentsEnabled = platform?.features?.enable_attachments !== false;
    const { data, isLoading } = useEntityAttachments(entityType, entityId, attachmentsEnabled);
    const attachments = data?.data || [];

    if (!attachmentsEnabled) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && (
                    <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </>
                )}

                {!isLoading && attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No attachments have been added yet.
                    </p>
                )}

                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                                    {attachment.attachment_type.label}
                                </p>
                                <p className="font-medium break-all">{attachment.file_name}</p>
                                {attachment.note && (
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {attachment.note}
                                    </p>
                                )}
                            </div>
                            <Button asChild size="icon" variant="outline" className="shrink-0">
                                <a
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={attachment.file_name}
                                >
                                    <Download className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
