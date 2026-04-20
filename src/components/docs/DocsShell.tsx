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
            <div className="w-full px-6 py-10">
                <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)_220px]">
                    <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-border lg:pr-6">
                        <DocsNav tree={tree} />
                    </aside>
                    <main className="mx-auto w-full min-w-0 max-w-4xl">{children}</main>
                    <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
                        {aside}
                    </aside>
                </div>
            </div>
        </div>
    );
}
