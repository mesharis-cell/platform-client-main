"use client";

/**
 * Transport Selector Component
 * Allows clients to select trip type (one-way vs round-trip)
 * Vehicle type is read-only (determined during review)
 */

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { TripType } from "@/types/hybrid-pricing";

interface TransportSelectorProps {
    tripType: TripType;
    onTripTypeChange: (tripType: TripType) => void;
}

export function TransportSelector({ tripType, onTripTypeChange }: TransportSelectorProps) {
    return (
        <div className="space-y-4">
            <div>
                <Label className="text-base font-semibold mb-3 block">
                    Transport Type <span className="text-destructive">*</span>
                </Label>
                <RadioGroup value={tripType} onValueChange={(v) => onTripTypeChange(v as TripType)}>
                    <div className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="ONE_WAY" id="one-way" />
                        <Label htmlFor="one-way" className="flex-1 cursor-pointer">
                            <div>
                                <p className="font-semibold">One-way (Delivery Only)</p>
                                <p className="text-sm text-muted-foreground">
                                    Items will be delivered to your venue. You arrange return
                                    pickup.
                                </p>
                            </div>
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="ROUND_TRIP" id="round-trip" />
                        <Label htmlFor="round-trip" className="flex-1 cursor-pointer">
                            <div>
                                <p className="font-semibold">Round-trip (Delivery + Pickup)</p>
                                <p className="text-sm text-muted-foreground">
                                    Items delivered and picked up by logistics partner.
                                </p>
                            </div>
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            <div>
                <Label className="text-base font-semibold mb-2 block">Vehicle Type</Label>
                <Input value="Standard" disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-2">
                    Vehicle type is set to standard by default. Final vehicle requirements will be
                    determined during order review and may affect pricing.
                </p>
            </div>
        </div>
    );
}
