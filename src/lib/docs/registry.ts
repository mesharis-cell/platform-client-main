import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { docFrontmatterSchema, type DocFrontmatter } from "./frontmatter";

/**
 * A parsed docs article, ready to render.
 * `body` is the raw MDX string; rendering is done by the route handler.
 */
export interface DocArticle {
    frontmatter: DocFrontmatter;
    body: string;
    sourcePath: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs");

/**
 * Walk `content/docs/` and return every `.mdx` article with parsed
 * frontmatter. This runs server-side only; never import into a Client
 * Component.
 *
 * Validation is strict: any file whose frontmatter fails the zod schema
 * throws, so bad articles fail loud in dev/build instead of shipping broken.
 */
export const loadAllArticles = (): DocArticle[] => {
    const articles: DocArticle[] = [];

    const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
            const raw = fs.readFileSync(full, "utf8");
            const { data, content } = matter(raw);
            const parsed = docFrontmatterSchema.safeParse(data);
            if (!parsed.success) {
                throw new Error(
                    `Invalid frontmatter in ${full}: ${parsed.error.message}`
                );
            }
            articles.push({
                frontmatter: parsed.data,
                body: content,
                sourcePath: full,
            });
        }
    };

    walk(CONTENT_ROOT);
    return articles;
};

/**
 * Find one article by category + slug. Returns `null` if not found.
 * Does its own filesystem read (no shared cache) — cheap for v1, swap for
 * a build-time index later if article count balloons.
 */
export const getArticle = (category: string, slug: string): DocArticle | null => {
    const filePath = path.join(CONTENT_ROOT, category, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const parsed = docFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error(`Invalid frontmatter in ${filePath}: ${parsed.error.message}`);
    }
    return { frontmatter: parsed.data, body: content, sourcePath: filePath };
};
