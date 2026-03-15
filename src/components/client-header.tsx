/**
 * Client Page Header Component
 *
 * Consistent header design across all client list/index pages.
 * Simpler than AdminHeader — clean, approachable, not overwhelming.
 */

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ClientHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
}

export function ClientHeader({ icon: Icon, title, description, actions }: ClientHeaderProps) {
    return (
        <div className="border-b border-border bg-card/50">
            <div className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" strokeWidth={2} />
                        <div>
                            <h1 className="text-2xl font-bold font-mono tracking-tight">{title}</h1>
                            {description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </div>
            </div>
        </div>
    );
}
