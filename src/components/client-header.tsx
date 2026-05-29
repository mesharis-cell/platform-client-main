"use client";

/**
 * Client Page Header Component
 *
 * Consistent header across every client page: icon + title + description, with
 * a breadcrumb that is ALWAYS present and rooted at "Home" (the client
 * dashboard). Top-level pages render "Home › <Page>"; nested pages pass a
 * deeper `breadcrumbs` trail (e.g. Company › Orders) which is appended after
 * Home. The dashboard itself is Home, so it shows no breadcrumb.
 *
 * The rule, in one line: Home is the root everywhere; `breadcrumbs` (if given)
 * is the path under Home, otherwise the page title is the single crumb.
 */

import { ChevronRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export interface Breadcrumb {
    label: string;
    /** When set, the crumb is a link; omit for the current (last) crumb. */
    href?: string;
}

const HOME_HREF = "/client-dashboard";

interface ClientHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
    /** Path under Home. Omit on top-level pages (the title becomes the crumb). */
    breadcrumbs?: Breadcrumb[];
}

export function ClientHeader({
    icon: Icon,
    title,
    description,
    actions,
    breadcrumbs,
}: ClientHeaderProps) {
    const pathname = usePathname();
    const isHome = pathname === HOME_HREF;

    // Always rooted at Home; append the page's trail (explicit, or just title).
    const crumbs: Breadcrumb[] = isHome
        ? []
        : [{ label: "Home", href: HOME_HREF }, ...(breadcrumbs ?? [{ label: title }])];

    return (
        <div className="border-b border-border bg-card/50">
            <div className="container mx-auto px-6 py-6">
                {crumbs.length > 0 && (
                    <nav
                        aria-label="Breadcrumb"
                        className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground"
                    >
                        {crumbs.map((crumb, i) => {
                            const isLast = i === crumbs.length - 1;
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
