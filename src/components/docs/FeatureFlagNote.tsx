import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureFlagNoteProps {
    /** Platform feature flag key, e.g. "enable_service_requests". */
    flag: string;
    /** Optional override copy. Defaults to a sensible generic note. */
    children?: React.ReactNode;
    className?: string;
}

/**
 * Inline callout indicating a section depends on a platform feature flag.
 *
 * Does not check the flag itself — that's handled by article-level gating
 * (`requiresFlag` in frontmatter + NotEnabledPage for deep links). This
 * component is for authors to mark feature-dependent sections *inside* an
 * always-visible article. Use sparingly.
 */
export function FeatureFlagNote({ flag, children, className }: FeatureFlagNoteProps) {
    return (
        <aside
            className={cn(
                "my-4 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs leading-relaxed text-foreground flex items-start gap-2",
                className
            )}
            role="note"
        >
            <Flag className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider font-semibold text-violet-600">
                    Feature-gated: <code className="font-mono">{flag}</code>
                </p>
                <div className="[&>p]:my-0">
                    {children ?? (
                        <>
                            This section only applies if your company has{" "}
                            <code className="font-mono text-[0.9em]">{flag}</code> enabled. Ask your
                            administrator if you need access.
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
