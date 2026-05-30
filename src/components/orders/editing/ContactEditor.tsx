"use client";

/**
 * Execution contact editor (order-editing P1). Controlled inputs — the parent
 * OrderEditPanel owns draft state and diffing.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactDraft {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
}

export function ContactEditor({
    value,
    onChange,
    disabled,
}: {
    value: ContactDraft;
    onChange: (patch: Partial<ContactDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label
                    htmlFor="edit-contact-name"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Name
                </Label>
                <Input
                    id="edit-contact-name"
                    value={value.contact_name}
                    onChange={(e) => onChange({ contact_name: e.target.value })}
                    placeholder="Contact name"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
            <div className="space-y-2">
                <Label
                    htmlFor="edit-contact-email"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Email
                </Label>
                <Input
                    id="edit-contact-email"
                    type="email"
                    value={value.contact_email}
                    onChange={(e) => onChange({ contact_email: e.target.value })}
                    placeholder="contact@company.com"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
            <div className="space-y-2">
                <Label
                    htmlFor="edit-contact-phone"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Phone
                </Label>
                <Input
                    id="edit-contact-phone"
                    value={value.contact_phone}
                    onChange={(e) => onChange({ contact_phone: e.target.value })}
                    placeholder="+971 ..."
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
        </div>
    );
}
