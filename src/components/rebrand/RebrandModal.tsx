"use client";

/**
 * Rebranding Modal
 * Reusable modal for adding/editing rebrand requests
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { RefreshCw, Loader2 } from "lucide-react";

export interface RebrandData {
  isReskinRequest: boolean;
  reskinTargetBrandId?: string;
  reskinTargetBrandCustom?: string;
  reskinNotes?: string;
}

interface RebrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  brands: Array<{ id: string; name: string }>;
  initialData?: RebrandData;
  onSubmit: (data: RebrandData) => void;
  mode?: "add" | "edit";
  isLoading?: boolean;
}

export function RebrandModal({
  open,
  onOpenChange,
  assetName,
  brands,
  initialData,
  onSubmit,
  mode = "add",
  isLoading = false,
}: RebrandModalProps) {
  const [targetBrand, setTargetBrand] = useState("");
  const [customBrandName, setCustomBrandName] = useState("");
  const [instructions, setInstructions] = useState("");

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Edit mode - populate existing data
        if (initialData.reskinTargetBrandId) {
          setTargetBrand(initialData.reskinTargetBrandId);
        } else if (initialData.reskinTargetBrandCustom) {
          setTargetBrand("custom");
          setCustomBrandName(initialData.reskinTargetBrandCustom);
        }
        setInstructions(initialData.reskinNotes || "");
      } else {
        // Add mode - reset form
        resetForm();
      }
    }
  }, [open, initialData]);

  const resetForm = () => {
    setTargetBrand("");
    setCustomBrandName("");
    setInstructions("");
  };

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

    // Build rebrand data
    const rebrandData: RebrandData = {
      isReskinRequest: true,
      reskinTargetBrandId: targetBrand !== "custom" ? targetBrand : undefined,
      reskinTargetBrandCustom: targetBrand === "custom" ? customBrandName.trim() : undefined,
      reskinNotes: instructions.trim(),
    };

    onSubmit(rebrandData);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  // Get brand name for display
  const getBrandName = (brandId: string) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand?.name || brandId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-500" />
            {mode === "add" ? "Add with Rebranding" : "Edit Rebranding"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Request this asset to be rebranded for your event"
              : "Update the rebranding details for this item"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Asset Name Display */}
          <div className="p-3 bg-muted rounded-md border border-border">
            <p className="text-sm font-semibold">{assetName}</p>
          </div>

          {/* Target Brand Select */}
          <div className="space-y-2">
            <Label>
              Target Brand <span className="text-destructive">*</span>
            </Label>
            <Select value={targetBrand} onValueChange={setTargetBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Select target brand..." />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Other (custom brand)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Brand Name (shown only when custom selected) */}
          {targetBrand === "custom" && (
            <div className="space-y-2">
              <Label>
                Custom Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={customBrandName}
                onChange={(e) => setCustomBrandName(e.target.value)}
                placeholder="e.g., Dubai Tourism Board"
                maxLength={100}
              />
            </div>
          )}

          {/* Rebranding Instructions */}
          <div className="space-y-2">
            <Label>
              Rebranding Instructions <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the changes you need (e.g., change all logos, replace fabric color, update signage...)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required ({instructions.length}/10)
            </p>
          </div>

          {/* Info Note */}
          <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
            <p className="text-xs text-primary">
              ℹ️ Rebranding costs will be quoted during order review. Final price may
              be higher than the standard estimate.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "add" ? "Add to Cart" : "Update Rebranding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
