import { DocsHeader } from "./DocsHeader";
import { DocsNav } from "./DocsNav";
import type { DocNavTree } from "@/lib/docs/nav-tree";

interface DocsShellProps {
    tree: DocNavTree;
    companyName: string | null;
    /** Optional right-rail content (e.g. TableOfContents). */
    aside?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Three-column layout frame used by every /docs/* page.
 *   [  left nav  ][  article body  ][  right aside  ]
 * On narrow screens, the side columns collapse and the article stacks.
 */
export function DocsShell({ tree, companyName, aside, children }: DocsShellProps) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocsHeader companyName={companyName} />
            <div className="mx-auto max-w-screen-2xl px-6 py-10">
                <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
                    <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2">
                        <DocsNav tree={tree} />
                    </aside>
                    <main className="min-w-0">{children}</main>
                    <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
                        {aside}
                    </aside>
                </div>
            </div>
        </div>
    );
}
