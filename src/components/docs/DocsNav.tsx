"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DocNavTree } from "@/lib/docs/nav-tree";
import { docArticlePath } from "@/lib/docs/slug";

interface DocsNavProps {
    tree: DocNavTree;
}

/**
 * Left sidebar nav. Categories are expanded by default; articles under
 * each show with status-aware styling. Active article is highlighted by
 * route match.
 *
 * Client component because it reads `usePathname` for active-state; the
 * tree itself is built server-side and passed as a plain-data prop.
 */
export function DocsNav({ tree }: DocsNavProps) {
    const pathname = usePathname();

    return (
        <nav aria-label="Documentation" className="space-y-6">
            {tree.categories.map((category) => (
                <div key={category.key} className="space-y-1">
                    <p className="px-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                        {category.title}
                    </p>
                    <ul className="space-y-0.5" role="list">
                        {category.articles.map((article) => {
                            const href = docArticlePath(article.category, article.slug);
                            const isActive = pathname === href;
                            return (
                                <li key={`${article.category}/${article.slug}`}>
                                    <Link
                                        href={href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={cn(
                                            "block rounded-md px-2 py-1.5 text-sm transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-foreground/75 hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {article.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
