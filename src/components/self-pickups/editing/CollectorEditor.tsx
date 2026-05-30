"use client";

/**
 * Collector contact editor (order-editing Phase 4, self-pickup). Controlled
 * inputs — the parent SelfPickupEditPanel owns draft state and diffing.
 * Mirrors the order ContactEditor; the email is optional/clearable for SPs.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CollectorDraft {
    collector_name: string;
    collector_phone: string;
    collector_email: string;
}

export function CollectorEditor({
    value,
    onChange,
    disabled,
}: {
    value: CollectorDraft;
    onChange: (patch: Partial<CollectorDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-collector-name"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Name
                </Label>
                <Input
                    id="sp-edit-collector-name"
                    value={value.collector_name}
                    onChange={(e) => onChange({ collector_name: e.target.value })}
                    placeholder="Collector name"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-collector-phone"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Phone
                </Label>
                <Input
                    id="sp-edit-collector-phone"
                    value={value.collector_phone}
                    onChange={(e) => onChange({ collector_phone: e.target.value })}
                    placeholder="+971 ..."
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
            <div className="space-y-2">
                <Label
                    htmlFor="sp-edit-collector-email"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Email
                </Label>
                <Input
                    id="sp-edit-collector-email"
                    type="email"
                    value={value.collector_email}
                    onChange={(e) => onChange({ collector_email: e.target.value })}
                    placeholder="collector@company.com (optional)"
                    disabled={disabled}
                    className="font-mono"
                />
            </div>
        </div>
    );
}
