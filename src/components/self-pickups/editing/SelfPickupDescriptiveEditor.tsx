"use client";

/**
 * Self-pickup descriptive-fields editor (order-editing Phase 4): notes, special
 * instructions, permanent placement, and PO number. Controlled by the parent
 * SelfPickupEditPanel.
 *
 * Self-pickups have NO venue / permit fields (those are order-only), so this is a
 * leaner mirror of the order DescriptiveFieldsEditor. `job_number` is admin-only
 * and is intentionally NOT here.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface SelfPickupDescriptiveDraft {
    notes: string;
    special_instructions: string;
    is_permanent_placement: boolean;
    po_number: string;
}

export function SelfPickupDescriptiveEditor({
    value,
    onChange,
    disabled,
}: {
    value: SelfPickupDescriptiveDraft;
    onChange: (patch: Partial<SelfPickupDescriptiveDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-6">
            {/* Notes */}
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-notes"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Notes
                </Label>
                <Textarea
                    id="sp-edit-notes"
                    value={value.notes}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    placeholder="Anything our team should know..."
                    rows={3}
                    disabled={disabled}
                    className="font-mono text-sm"
                />
            </div>

            {/* Special instructions */}
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-special-instructions"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Special Instructions
                </Label>
                <Textarea
                    id="sp-edit-special-instructions"
                    value={value.special_instructions}
                    onChange={(e) => onChange({ special_instructions: e.target.value })}
                    placeholder="Handling, packing, or collection instructions..."
                    rows={3}
                    disabled={disabled}
                    className="font-mono text-sm"
                />
            </div>

            {/* PO number */}
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-po-number"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    PO Number
                </Label>
                <Input
                    id="sp-edit-po-number"
                    value={value.po_number}
                    onChange={(e) => onChange({ po_number: e.target.value })}
                    placeholder="Optional purchase order reference"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>

            {/* Permanent placement */}
            <div className="space-y-2">
                <Label className="font-mono uppercase text-xs tracking-wide">
                    Permanent Placement
                </Label>
                <p className="text-xs text-muted-foreground">
                    Are these items being placed permanently? (Yes = they won&apos;t be returned; No
                    = they&apos;ll come back after use.)
                </p>
                <RadioGroup
                    value={value.is_permanent_placement ? "yes" : "no"}
                    onValueChange={(v) => onChange({ is_permanent_placement: v === "yes" })}
                    className="flex gap-3"
                    disabled={disabled}
                >
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="yes" id="sp-edit-perm-yes" />
                        <span className="text-sm font-medium">Yes — permanent</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="no" id="sp-edit-perm-no" />
                        <span className="text-sm font-medium">No — will be returned</span>
                    </label>
                </RadioGroup>
            </div>
        </div>
    );
}
