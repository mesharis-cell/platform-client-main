"use client";

/**
 * Descriptive-fields editor (order-editing). Venue name / city / address,
 * special instructions, permanent placement, and PO number. Controlled by the
 * parent.
 *
 * NOTE: `job_number` is intentionally NOT here — it is admin-only and must never
 * be exposed or sent from the client.
 *
 * Permit requirements + venue access notes are NO LONGER here. They render via
 * the shared <PermitSection> (the SAME component checkout uses) so the two
 * surfaces stay 1:1 — a prior hand-rewrite of the permit inputs caused the two
 * to drift. The `PermitDraft` type is still exported from here for back-compat
 * with the parent's draft shape.
 */

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCountries } from "@/hooks/use-countries";

export interface PermitDraft {
    requires_permit: boolean;
    permit_owner: "CLIENT" | "PLATFORM" | "UNKNOWN";
    requires_vehicle_docs: boolean;
    requires_staff_ids: boolean;
    notes: string;
}

export interface DescriptiveDraft {
    venue_name: string;
    venue_city_id: string;
    venue_address: string;
    venue_access_notes: string;
    special_instructions: string;
    is_permanent_placement: boolean;
    po_number: string;
    permit: PermitDraft;
}

export function DescriptiveFieldsEditor({
    value,
    onChange,
    disabled,
}: {
    value: DescriptiveDraft;
    onChange: (patch: Partial<DescriptiveDraft>) => void;
    disabled?: boolean;
}) {
    const { data: countriesData } = useCountries();

    // Flatten every city across countries so the current venue_city_id resolves
    // regardless of which country it belongs to (the order detail doesn't expose
    // the country id, only the city name string).
    const cities = useMemo(() => {
        const all: { id: string; name: string }[] = [];
        for (const country of countriesData?.data ?? []) {
            for (const city of country.cities ?? []) all.push(city);
        }
        return all;
    }, [countriesData?.data]);

    return (
        <div className="space-y-6">
            {/* Venue name */}
            <div className="space-y-2">
                <Label
                    htmlFor="edit-venue-name"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Venue Name
                </Label>
                <Input
                    id="edit-venue-name"
                    value={value.venue_name}
                    onChange={(e) => onChange({ venue_name: e.target.value })}
                    placeholder="e.g., Dubai Festival City"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>

            {/* City */}
            <div className="space-y-2">
                <Label className="font-mono uppercase text-xs tracking-wide">City</Label>
                <Select
                    value={value.venue_city_id || undefined}
                    onValueChange={(v) => onChange({ venue_city_id: v })}
                    disabled={disabled}
                >
                    <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                        {cities.map((city) => (
                            <SelectItem key={city.id} value={city.id} className="font-mono">
                                {city.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Address */}
            <div className="space-y-2">
                <Label
                    htmlFor="edit-venue-address"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Full Address
                </Label>
                <Textarea
                    id="edit-venue-address"
                    value={value.venue_address}
                    onChange={(e) => onChange({ venue_address: e.target.value })}
                    placeholder="Complete venue address"
                    rows={3}
                    disabled={disabled}
                    className="font-mono text-sm"
                />
            </div>

            {/* Special instructions */}
            <div className="space-y-2">
                <Label
                    htmlFor="edit-special-instructions"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Special Instructions
                </Label>
                <Textarea
                    id="edit-special-instructions"
                    value={value.special_instructions}
                    onChange={(e) => onChange({ special_instructions: e.target.value })}
                    placeholder="Anything our team should know..."
                    rows={3}
                    disabled={disabled}
                    className="font-mono text-sm"
                />
            </div>

            {/* PO number */}
            <div className="space-y-2">
                <Label
                    htmlFor="edit-po-number"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    PO Number
                </Label>
                <Input
                    id="edit-po-number"
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
                    = they&apos;ll come back after the event.)
                </p>
                <RadioGroup
                    value={value.is_permanent_placement ? "yes" : "no"}
                    onValueChange={(v) => onChange({ is_permanent_placement: v === "yes" })}
                    className="flex gap-3"
                    disabled={disabled}
                >
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="yes" id="edit-perm-yes" />
                        <span className="text-sm font-medium">Yes — permanent</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="no" id="edit-perm-no" />
                        <span className="text-sm font-medium">No — will be returned</span>
                    </label>
                </RadioGroup>
            </div>
        </div>
    );
}
