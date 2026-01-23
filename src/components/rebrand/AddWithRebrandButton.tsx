"use client";

/**
 * Add with Rebranding Button & Modal
 * Allows clients to request asset rebranding during add-to-cart
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface AddWithRebrandButtonProps {
    asset: {
        id: string;
        name: string;
    };
    companyBrands: Array<{ id: string; name: string }>;
    onAddToCart: (rebrandData: {
        isReskinRequest: boolean;
        reskinTargetBrandId?: string;
        reskinTargetBrandCustom?: string;
        reskinNotes?: string;
    }) => void;
}

export function AddWithRebrandButton({
    asset,
    companyBrands,
    onAddToCart,
}: AddWithRebrandButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetBrand, setTargetBrand] = useState("");
    const [customBrandName, setCustomBrandName] = useState("");
    const [instructions, setInstructions] = useState("");

    const handleSubmit = () => {
        // Validation
        if (!targetBrand) {
            toast.error("Please select a target brand");
            return;
        }

        if (targetBrand === "custom" && !customBrandName.trim()) {
            toast.error("Please enter custom brand name");
            return;
        }

        if (!instructions.trim() || instructions.trim().length < 10) {
            toast.error("Please provide rebranding instructions (min 10 characters)");
            return;
        }

        // Call parent handler with rebrand data
        const rebrandData = {
            isReskinRequest: true,
            reskinTargetBrandId: targetBrand !== "custom" ? targetBrand : undefined,
            reskinTargetBrandCustom: targetBrand === "custom" ? customBrandName.trim() : undefined,
            reskinNotes: instructions.trim(),
        };

        onAddToCart(rebrandData);
        setDialogOpen(false);
        resetForm();
        toast.success("Item added to cart with rebranding request");
    };

    const resetForm = () => {
        setTargetBrand("");
        setCustomBrandName("");
        setInstructions("");
    };

    return (
        <>
            <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Add with Rebranding
            </Button>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add with Rebranding</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm font-semibold">{asset.name}</p>
                        </div>

                        <div>
                            <Label>
                                Target Brand <span className="text-destructive">*</span>
                            </Label>
                            <Select value={targetBrand} onValueChange={setTargetBrand}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select brand..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companyBrands.map((brand) => (
                                        <SelectItem key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">+ Other (custom brand)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {targetBrand === "custom" && (
                            <div>
                                <Label>
                                    Custom Brand Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={customBrandName}
                                    onChange={(e) => setCustomBrandName(e.target.value)}
                                    placeholder="e.g., Dubai Tourism Board"
                                />
                            </div>
                        )}

                        <div>
                            <Label>
                                Rebranding Instructions <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Describe the changes you need (e.g., change all logos, replace fabric color...)"
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Minimum 10 characters required
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                                ℹ️ Rebranding costs will be quoted during order review. Final price
                                may be higher than the standard estimate.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>Add to Cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
