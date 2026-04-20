import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

interface NotEnabledPageProps {
    articleTitle: string;
    flag: string;
    companyName: string | null;
}

/**
 * Rendered when a reader deep-links to a feature-gated article whose
 * platform feature flag is `false` for the current tenant.
 *
 * The URL still resolves (shareable across tenants) but the reader sees
 * a friendly "talk to your admin" page instead of the article body.
 */
export function NotEnabledPage({ articleTitle, flag, companyName }: NotEnabledPageProps) {
    const company = companyName || "your company";
    return (
        <div className="max-w-2xl mx-auto py-16 space-y-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Feature not enabled
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">{articleTitle}</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                This tutorial covers a feature that is not currently enabled for {company}. If you
                need access, ask your administrator to enable{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{flag}</code>.
            </p>
            <div>
                <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to documentation
                </Link>
            </div>
        </div>
    );
}
