import { z } from "zod";

/**
 * Zod schema for docs article frontmatter.
 * Every .mdx file under /content/docs/**\/*.mdx must parse cleanly against this
 * schema or registry building will fail loudly at dev/build time.
 */
export const docFrontmatterSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    category: z.string().min(1),
    order: z.number().int().nonnegative(),
    summary: z.string().min(1),
    readMinutes: z.number().positive(),
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated must be YYYY-MM-DD"),
    requiresFlag: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    relatedArticles: z.array(z.string()).optional(),
    status: z.enum(["stub", "draft", "published"]).default("draft"),
});

export type DocFrontmatter = z.infer<typeof docFrontmatterSchema>;

/**
 * Category ordering and display metadata. The category key matches the folder
 * name under /content/docs. Add a new key here to surface a new section.
 */
export interface DocCategoryMeta {
    key: string;
    title: string;
    order: number;
    description?: string;
    requiresFlag?: string;
}

export const docCategories: DocCategoryMeta[] = [
    {
        key: "getting-started",
        title: "Getting Started",
        order: 0,
        description: "Log in, orient yourself, and make your first move.",
    },
    {
        key: "catalog",
        title: "Browsing the Catalog",
        order: 10,
        description: "Find what you need, understand availability, and add items to your cart.",
    },
    {
        key: "ordering",
        title: "Placing an Order",
        order: 20,
        description: "The five-step checkout, from cart to submission.",
    },
    {
        key: "order-page",
        title: "Tracking Your Orders",
        order: 30,
        description: "Read your order page at every stage of its lifecycle.",
    },
    {
        key: "quotes",
        title: "Quotes, Estimates & PO Numbers",
        order: 40,
        description: "Review a quote, approve with a PO number, and download the cost estimate.",
    },
    {
        key: "scan-activity",
        title: "Scan Activity",
        order: 50,
        description: "Understand the outbound, on-site, and return scans that document your order.",
    },
    {
        key: "reference",
        title: "Reference",
        order: 100,
        description: "Glossary, emails you receive, feature flags, and troubleshooting.",
    },
];

export const getCategoryMeta = (key: string): DocCategoryMeta | undefined =>
    docCategories.find((c) => c.key === key);
