import { cn } from "@/lib/utils";

interface StepListProps {
    children: React.ReactNode;
    className?: string;
}

interface StepProps {
    n: number;
    title: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Numbered, vertically-connected list of steps. Use inside tutorial bodies
 * for anything the reader has to do in order.
 */
export function StepList({ children, className }: StepListProps) {
    return (
        <ol className={cn("my-6 space-y-6 relative", className)} role="list">
            {children}
        </ol>
    );
}

/**
 * A single step inside <StepList>. Pass a `n` (display number), a `title`,
 * and arbitrary MDX children for the step body.
 */
export function Step({ n, title, children, className }: StepProps) {
    return (
        <li className={cn("relative pl-12", className)}>
            <span
                aria-hidden="true"
                className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold"
            >
                {n}
            </span>
            <div className="space-y-2">
                <h3 className="text-base font-semibold leading-tight">{title}</h3>
                <div className="text-sm leading-relaxed text-foreground [&>p]:my-2 [&>p:first-child]:mt-0">
                    {children}
                </div>
            </div>
        </li>
    );
}
