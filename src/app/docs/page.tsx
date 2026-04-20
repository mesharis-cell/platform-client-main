import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { DocsShell } from "@/components/docs/DocsShell";
import { buildNavTree, filterNavTreeByFeatures } from "@/lib/docs/nav-tree";
import { getServerPlatformContext } from "@/lib/docs/platform-context.server";
import { docArticlePath } from "@/lib/docs/slug";

// Curated on-ramp for first-time readers. Three articles that together
// cover the core journey "sign in → find something → order it". If any
// of these gets renamed or its slug changes, update here.
const START_HERE = [
    { category: "getting-started", slug: "logging-in" },
    { category: "catalog", slug: "browsing" },
    { category: "ordering", slug: "the-5-checkout-steps" },
];

export default async function DocsIndexPage() {
    const platform = await getServerPlatformContext();
    const tree = filterNavTreeByFeatures(buildNavTree(), platform.features);

    // Resolve the three "start here" stops from the tree so we get titles +
    // summaries, and so broken slugs surface visibly rather than silently.
    const startHereArticles = START_HERE.map((stop) => {
        const category = tree.categories.find((c) => c.key === stop.category);
        const article = category?.articles.find((a) => a.slug === stop.slug);
        return article ?? null;
    }).filter((a): a is NonNullable<typeof a> => a !== null);

    return (
        <DocsShell tree={tree} companyName={platform.company_name}>
            <section className="mb-14 space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Documentation
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                    Learn your way around the portal.
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                    Tutorials and step-by-step walkthroughs for logging in, browsing the catalog,
                    submitting orders, reviewing quotes, and tracking your event through delivery
                    and return.
                </p>
            </section>

            {startHereArticles.length > 0 ? (
                <section className="mb-14 space-y-4">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                New here? Start with these three.
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                A fifteen-minute on-ramp that covers the core journey — sign in,
                                find something, order it.
                            </p>
                        </div>
                    </div>
                    <ol className="grid gap-4 sm:grid-cols-3" role="list">
                        {startHereArticles.map((article, index) => (
                            <li key={`${article.category}/${article.slug}`}>
                                <Link
                                    href={docArticlePath(article.category, article.slug)}
                                    className="group block h-full rounded-lg border border-primary/20 bg-primary/5 p-5 hover:border-primary/50 hover:bg-primary/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                                            {index + 1}
                                        </span>
                                        <span>Step {index + 1}</span>
                                    </div>
                                    <p className="font-semibold text-[15px] leading-tight mb-1.5 group-hover:text-primary transition-colors">
                                        {article.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {article.summary}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ol>
                </section>
            ) : null}

            <section className="space-y-10">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Browse every topic</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        The complete library, organised by journey.
                    </p>
                </div>

                {tree.categories.map((category) => (
                    <div key={category.key} className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold tracking-tight">
                                {category.title}
                            </h3>
                            {category.description ? (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {category.description}
                                </p>
                            ) : null}
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-2" role="list">
                            {category.articles.map((article) => (
                                <li key={`${article.category}/${article.slug}`} className="group">
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
                        <BookOpen
                            className="mx-auto h-8 w-8 text-muted-foreground/40"
                            aria-hidden="true"
                        />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No tutorials are available yet. Check back soon.
                        </p>
                    </div>
                ) : null}
            </section>
        </DocsShell>
    );
}
