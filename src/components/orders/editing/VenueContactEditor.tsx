"use client";

/**
 * Venue (on-site) contact editor (order-editing P1). These three fields are
 * TOP-LEVEL order columns (venue_contact_name/email/phone) — NOT nested inside
 * permit_requirements. Controlled by the parent OrderEditPanel.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VenueContactDraft {
    venue_contact_name: string;
    venue_contact_email: string;
    venue_contact_phone: string;
}

export function VenueContactEditor({
    value,
    onChange,
    disabled,
}: {
    value: VenueContactDraft;
    onChange: (patch: Partial<VenueContactDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                The person at the venue who can coordinate arrival, access, unloading, or handover.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <Label
                        htmlFor="edit-venue-contact-name"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Name
                    </Label>
                    <Input
                        id="edit-venue-contact-name"
                        value={value.venue_contact_name}
                        onChange={(e) => onChange({ venue_contact_name: e.target.value })}
                        placeholder="Contact name"
                        disabled={disabled}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label
                        htmlFor="edit-venue-contact-email"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Email
                    </Label>
                    <Input
                        id="edit-venue-contact-email"
                        type="email"
                        value={value.venue_contact_email}
                        onChange={(e) => onChange({ venue_contact_email: e.target.value })}
                        placeholder="contact@venue.com"
                        disabled={disabled}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label
                        htmlFor="edit-venue-contact-phone"
                        className="font-mono uppercase text-xs tracking-wide"
                    >
                        Phone
                    </Label>
                    <Input
                        id="edit-venue-contact-phone"
                        value={value.venue_contact_phone}
                        onChange={(e) => onChange({ venue_contact_phone: e.target.value })}
                        placeholder="+971 ..."
                        disabled={disabled}
                        className="font-mono"
                    />
                </div>
            </div>
        </div>
    );
}
