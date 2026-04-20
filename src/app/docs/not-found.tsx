import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function DocsNotFound() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
                    <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        404 · Article not found
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        We couldn&apos;t find that page
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        The article may have moved, been renamed, or never existed. Head back to the
                        docs index and try again.
                    </p>
                </div>
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
