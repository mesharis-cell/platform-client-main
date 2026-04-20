import { Info, Lightbulb, AlertTriangle, AlertCircle, Shield, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutKind = "info" | "tip" | "warning" | "heads-up" | "admin-only" | "feature-flag";

interface CalloutProps {
    kind?: CalloutKind;
    title?: string;
    children: React.ReactNode;
}

const KIND_STYLES: Record<
    CalloutKind,
    {
        icon: React.ComponentType<{ className?: string }>;
        container: string;
        iconColor: string;
        label: string;
    }
> = {
    info: {
        icon: Info,
        container: "bg-primary/5 border-primary/20",
        iconColor: "text-primary",
        label: "Note",
    },
    tip: {
        icon: Lightbulb,
        container: "bg-emerald-500/5 border-emerald-500/30",
        iconColor: "text-emerald-600",
        label: "Tip",
    },
    warning: {
        icon: AlertTriangle,
        container: "bg-amber-500/10 border-amber-500/30",
        iconColor: "text-amber-600",
        label: "Warning",
    },
    "heads-up": {
        icon: AlertCircle,
        container: "bg-sky-500/5 border-sky-500/30",
        iconColor: "text-sky-600",
        label: "Heads up",
    },
    "admin-only": {
        icon: Shield,
        container: "bg-muted/70 border-border",
        iconColor: "text-muted-foreground",
        label: "Admin only",
    },
    "feature-flag": {
        icon: Flag,
        container: "bg-violet-500/5 border-violet-500/30",
        iconColor: "text-violet-600",
        label: "Feature-gated",
    },
};

export function Callout({ kind = "info", title, children }: CalloutProps) {
    const style = KIND_STYLES[kind];
    const Icon = style.icon;
    const displayTitle = title ?? style.label;

    return (
        <aside
            className={cn(
                "my-6 rounded-lg border px-4 py-3 flex gap-3 text-sm leading-relaxed",
                style.container
            )}
            role="note"
        >
            <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", style.iconColor)} aria-hidden="true" />
            <div className="space-y-1 min-w-0">
                <p
                    className={cn(
                        "font-mono text-xs uppercase tracking-wider font-semibold",
                        style.iconColor
                    )}
                >
                    {displayTitle}
                </p>
                <div className="text-foreground [&>p]:my-0 [&>p+p]:mt-2 [&_code]:text-[0.85em]">
                    {children}
                </div>
            </div>
        </aside>
    );
}
