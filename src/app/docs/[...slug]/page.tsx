import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { DocsShell } from "@/components/docs/DocsShell";
import { NotEnabledPage } from "@/components/docs/NotEnabledPage";
import { docsMdxComponents } from "@/components/docs/mdx-components";
import { extractHeadings, TableOfContents } from "@/components/docs/TableOfContents";
import {
    buildNavTree,
    filterNavTreeByFeatures,
    isArticleEnabledForTenant,
} from "@/lib/docs/nav-tree";
import { getArticle, loadAllArticles } from "@/lib/docs/registry";
import { parseArticleSegments } from "@/lib/docs/slug";
import { getServerPlatformContext } from "@/lib/docs/platform-context.server";

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
    const articles = loadAllArticles();
    return articles.map((article) => ({
        slug: [article.frontmatter.category, article.frontmatter.slug],
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug: segments } = await params;
    const parsed = parseArticleSegments(segments);
    if (!parsed) return {};
    const article = getArticle(parsed.category, parsed.slug);
    if (!article) return {};
    return {
        title: article.frontmatter.title,
        description: article.frontmatter.summary,
    };
}

export default async function DocsArticlePage({ params }: PageProps) {
    const { slug: segments } = await params;
    const parsed = parseArticleSegments(segments);
    if (!parsed) notFound();

    const article = getArticle(parsed.category, parsed.slug);
    if (!article) notFound();

    const platform = await getServerPlatformContext();
    const tree = filterNavTreeByFeatures(buildNavTree(), platform.features);

    const isEnabled = isArticleEnabledForTenant(article.frontmatter, platform.features);

    if (!isEnabled) {
        return (
            <DocsShell tree={tree} companyName={platform.company_name}>
                <NotEnabledPage
                    articleTitle={article.frontmatter.title}
                    flag={article.frontmatter.requiresFlag ?? ""}
                    companyName={platform.company_name}
                />
            </DocsShell>
        );
    }

    const headings = extractHeadings(article.body);

    return (
        <DocsShell
            tree={tree}
            companyName={platform.company_name}
            aside={<TableOfContents headings={headings} />}
        >
            <article>
                <div className="mb-8 space-y-3 pb-6 border-b border-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                        {article.frontmatter.category.replace(/-/g, " ")}
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {article.frontmatter.title}
                    </h1>
                    <p className="text-base text-muted-foreground leading-relaxed">
                        {article.frontmatter.summary}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground pt-1">
                        <span>{article.frontmatter.readMinutes}-minute read</span>
                        <span aria-hidden="true">·</span>
                        <span>Updated {article.frontmatter.updated}</span>
                    </div>
                </div>
                <div className="prose-docs">
                    <MDXRemote
                        source={article.body}
                        components={docsMdxComponents}
                        options={{
                            mdxOptions: {
                                remarkPlugins: [remarkGfm],
                                rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
                            },
                        }}
                    />
                </div>
            </article>
        </DocsShell>
    );
}
