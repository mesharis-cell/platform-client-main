/**
 * Client Page Header Component
 *
 * Consistent header design across all client list/index pages.
 * Simpler than AdminHeader — clean, approachable, not overwhelming.
 * Supports an optional breadcrumb trail for nested pages (e.g. Company Back
 * Office) so users have a clear "go back up" affordance.
 */

import { ChevronRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export interface Breadcrumb {
    label: string;
    /** When set, the crumb is a link; omit for the current (last) crumb. */
    href?: string;
}

interface ClientHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
    breadcrumbs?: Breadcrumb[];
}

export function ClientHeader({
    icon: Icon,
    title,
    description,
    actions,
    breadcrumbs,
}: ClientHeaderProps) {
    return (
        <div className="border-b border-border bg-card/50">
            <div className="container mx-auto px-6 py-6">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav
                        aria-label="Breadcrumb"
                        className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground"
                    >
                        {breadcrumbs.map((crumb, i) => {
                            const isLast = i === breadcrumbs.length - 1;
                            return (
                                <span
                                    key={`${crumb.label}-${i}`}
                                    className="flex items-center gap-1.5"
                                >
                                    {crumb.href && !isLast ? (
                                        <Link
                                            href={crumb.href}
                                            className="transition-colors hover:text-foreground"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={isLast ? "text-foreground" : undefined}>
                                            {crumb.label}
                                        </span>
                                    )}
                                    {!isLast && (
                                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                    )}
                                </span>
                            );
                        })}
                    </nav>
                )}
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
