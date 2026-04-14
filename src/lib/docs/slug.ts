/**
 * URL + slug helpers for the docs site.
 *
 * An article URL is `/docs/<category>/<slug>`, mirroring the on-disk layout
 * `/content/docs/<category>/<slug>.mdx`.
 */

export const docArticlePath = (category: string, slug: string): string =>
    `/docs/${category}/${slug}`;

export const docCategoryPath = (category: string): string => `/docs/${category}`;

/**
 * Join the catch-all `[...slug]` param back into a usable pair.
 * Returns `null` if the segments don't look like a docs article URL.
 */
export const parseArticleSegments = (
    segments: string[] | undefined
): { category: string; slug: string } | null => {
    if (!segments || segments.length !== 2) return null;
    const [category, slug] = segments;
    if (!category || !slug) return null;
    return { category, slug };
};
