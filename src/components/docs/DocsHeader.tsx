import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";

interface DocsHeaderProps {
    companyName: string | null;
}

/**
 * Top bar shown on every /docs/* page. Minimal: docs logo/title on the left,
 * "Back to portal" on the right. The portal link routes through the login
 * flow so unauth readers get a graceful on-ramp.
 */
export function DocsHeader({ companyName }: DocsHeaderProps) {
    const brand = companyName ? `${companyName} Docs` : "Kadence Docs";

    return (
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider"
                >
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{brand}</span>
                </Link>
                <Link
                    href="/?next=/client-dashboard"
                    className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                    Open portal
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>
        </header>
    );
}
