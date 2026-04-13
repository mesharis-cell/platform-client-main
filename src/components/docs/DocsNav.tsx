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
 * Left sidebar nav. Categories are expanded by default with clear
 * hierarchy: a thin divider separates categories, category titles are
 * bold and foregrounded, articles are indented with a dot marker
 * (filled primary when active, muted when not). Active article uses a
 * pill-shaped highlight so non-technical readers immediately see where
 * they are.
 *
 * Client component because it reads `usePathname` for active-state;
 * the tree itself is built server-side and passed as a plain-data prop.
 */
export function DocsNav({ tree }: DocsNavProps) {
    const pathname = usePathname();

    return (
        <nav aria-label="Documentation" className="text-sm">
            {tree.categories.map((category, index) => (
                <div
                    key={category.key}
                    className={cn(
                        "space-y-1",
                        index > 0 && "mt-5 border-t border-border pt-5"
                    )}
                >
                    <p className="mb-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">
                        {category.title}
                    </p>
                    <ul className="space-y-px" role="list">
                        {category.articles.map((article) => {
                            const href = docArticlePath(article.category, article.slug);
                            const isActive = pathname === href;
                            return (
                                <li key={`${article.category}/${article.slug}`}>
                                    <Link
                                        href={href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={cn(
                                            "group relative flex items-center gap-2.5 rounded-md py-1.5 pl-5 pr-2 text-[13px] leading-snug transition-colors",
                                            isActive
                                                ? "bg-primary/10 font-medium text-primary"
                                                : "text-foreground/70 hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {isActive && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                                            />
                                        )}
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                "inline-block h-1 w-1 shrink-0 rounded-full transition-colors",
                                                isActive
                                                    ? "bg-primary"
                                                    : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70"
                                            )}
                                        />
                                        <span className="flex-1">{article.title}</span>
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
