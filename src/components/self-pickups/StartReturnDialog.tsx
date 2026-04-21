"use client";

/**
 * Start Return Dialog (self-pickup).
 * Simple confirmation dialog shown when client initiates a return. Replaces
 * the bare "Start Return" button to match the order flow's deliberate
 * confirmation pattern. See SP6 in .claude/plans/tender-knitting-avalanche.md.
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

interface StartReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}

export function StartReturnDialog({ open, onOpenChange, onConfirm }: StartReturnDialogProps) {
    const [pending, setPending] = useState(false);

    const handleConfirm = async () => {
        setPending(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to initiate return");
        } finally {
            setPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Undo2 className="h-5 w-5 text-primary" />
                        Start Return
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <p className="text-sm text-muted-foreground">
                        This will notify our team that you're ready to return items. Please
                        coordinate directly with the warehouse for return logistics.
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={pending}>
                        {pending ? "Initiating…" : "Yes, Start Return"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
