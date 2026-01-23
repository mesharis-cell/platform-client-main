"use client";

/**
 * Rebrand Item Badge
 * Displays rebrand request status in cart and order views
 */

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RebrandItemBadgeProps {
    targetBrandName: string;
    clientNotes: string;
    onEdit?: () => void;
    onRemove?: () => void;
    showActions?: boolean;
}

export function RebrandItemBadge({
    targetBrandName,
    clientNotes,
    onEdit,
    onRemove,
    showActions = false,
}: RebrandItemBadgeProps) {
    return (
        <div className="mt-3 border border-amber-500/30 rounded-md p-3 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    REBRANDING REQUESTED
                </span>
            </div>

            <div className="space-y-1 text-sm">
                <p>
                    <span className="text-muted-foreground">Target Brand:</span>{" "}
                    <span className="font-medium">{targetBrandName}</span>
                </p>
                <p>
                    <span className="text-muted-foreground">Instructions:</span>{" "}
                    <span className="text-sm">{clientNotes}</span>
                </p>
            </div>

            {showActions && (
                <div className="flex gap-2 mt-3">
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            Edit Rebrand
                        </Button>
                    )}
                    {onRemove && (
                        <Button variant="outline" size="sm" onClick={onRemove}>
                            Remove Rebrand
                        </Button>
                    )}
                </div>
            )}

            {!showActions && (
                <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ Rebranding cost will be added to your quote
                </p>
            )}
        </div>
    );
}
