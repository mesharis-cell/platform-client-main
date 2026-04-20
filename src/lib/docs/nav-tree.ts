import { docCategories, type DocCategoryMeta, type DocFrontmatter } from "./frontmatter";
import { loadAllArticles, type DocArticle } from "./registry";

export interface DocNavArticle {
    title: string;
    slug: string;
    category: string;
    order: number;
    summary: string;
    requiresFlag?: string;
    status: DocFrontmatter["status"];
}

export interface DocNavCategory {
    key: string;
    title: string;
    order: number;
    description?: string;
    articles: DocNavArticle[];
}

export interface DocNavTree {
    categories: DocNavCategory[];
}

/**
 * Build the full nav tree from the filesystem, unfiltered by feature flags.
 * Categories are included even when empty — consumers can filter if they
 * want a sparse view.
 */
export const buildNavTree = (): DocNavTree => {
    const articles = loadAllArticles();

    const byCategory = new Map<string, DocNavArticle[]>();
    for (const article of articles) {
        const list = byCategory.get(article.frontmatter.category) ?? [];
        list.push({
            title: article.frontmatter.title,
            slug: article.frontmatter.slug,
            category: article.frontmatter.category,
            order: article.frontmatter.order,
            summary: article.frontmatter.summary,
            requiresFlag: article.frontmatter.requiresFlag,
            status: article.frontmatter.status,
        });
        byCategory.set(article.frontmatter.category, list);
    }

    const categories: DocNavCategory[] = docCategories
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((meta: DocCategoryMeta) => ({
            key: meta.key,
            title: meta.title,
            order: meta.order,
            description: meta.description,
            articles: (byCategory.get(meta.key) ?? []).sort((a, b) => a.order - b.order),
        }));

    return { categories };
};

/**
 * Filter the tree by a tenant's active feature flags.
 * An article is hidden if it declares `requiresFlag` and the tenant's
 * `platform.features[flag]` is explicitly `false`.
 *
 * Categories with no remaining visible articles are also dropped from the
 * nav. (Their articles still resolve by URL — the feature-flag check at
 * article-render time handles that with a "not enabled for your company"
 * page.)
 */
export const filterNavTreeByFeatures = (
    tree: DocNavTree,
    features: Record<string, boolean | undefined> | null | undefined
): DocNavTree => {
    const isArticleVisible = (article: DocNavArticle): boolean => {
        if (article.status === "stub") return false;
        if (!article.requiresFlag) return true;
        const flagValue = features?.[article.requiresFlag];
        // Treat missing/undefined flag as visible. Only explicit `false`
        // hides the article — matches how the client-nav gates sidebar
        // items today.
        return flagValue !== false;
    };

    const categories = tree.categories
        .map((category) => ({
            ...category,
            articles: category.articles.filter(isArticleVisible),
        }))
        .filter((category) => category.articles.length > 0);

    return { categories };
};

/**
 * Check whether an article is accessible to a tenant given its feature
 * flags. Used by the article page itself when a user deep-links into a
 * feature-gated article via shared URL.
 */
export const isArticleEnabledForTenant = (
    article: Pick<DocFrontmatter, "requiresFlag">,
    features: Record<string, boolean | undefined> | null | undefined
): boolean => {
    if (!article.requiresFlag) return true;
    return features?.[article.requiresFlag] !== false;
};
