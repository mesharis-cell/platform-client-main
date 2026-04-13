import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { DocsShell } from "@/components/docs/DocsShell";
import { buildNavTree, filterNavTreeByFeatures } from "@/lib/docs/nav-tree";
import { getServerPlatformContext } from "@/lib/docs/platform-context.server";
import { docArticlePath } from "@/lib/docs/slug";

export default async function DocsIndexPage() {
    const platform = await getServerPlatformContext();
    const tree = filterNavTreeByFeatures(buildNavTree(), platform.features);
    const firstArticle = tree.categories[0]?.articles[0];
    const quickStartHref = firstArticle
        ? docArticlePath(firstArticle.category, firstArticle.slug)
        : null;

    return (
        <DocsShell tree={tree} companyName={platform.company_name}>
            <section className="mb-12 space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Documentation
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                    Learn your way around the portal.
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                    Tutorials and step-by-step walkthroughs for logging in, browsing the catalog,
                    submitting orders, reviewing quotes, and tracking your event through
                    delivery and return.
                </p>
                {quickStartHref ? (
                    <div className="pt-2">
                        <Link
                            href={quickStartHref}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-mono font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Start here
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                ) : null}
            </section>

            <section className="space-y-10">
                {tree.categories.map((category) => (
                    <div key={category.key} className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                {category.title}
                            </h2>
                            {category.description ? (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {category.description}
                                </p>
                            ) : null}
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-2" role="list">
                            {category.articles.map((article) => (
                                <li
                                    key={`${article.category}/${article.slug}`}
                                    className="group"
                                >
                                    <Link
                                        href={docArticlePath(article.category, article.slug)}
                                        className="block h-full rounded-lg border border-border bg-card/40 p-4 hover:border-primary/50 hover:bg-card/80 transition-colors"
                                    >
                                        <p className="font-medium text-sm leading-tight mb-1">
                                            {article.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {article.summary}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {tree.categories.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-10 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No tutorials are available yet. Check back soon.
                        </p>
                    </div>
                ) : null}
            </section>
        </DocsShell>
    );
}
