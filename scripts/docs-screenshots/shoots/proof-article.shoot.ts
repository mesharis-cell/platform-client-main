import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

/**
 * Validation shots: captures every published /docs article so we can
 * eyeball the <Screenshot> compositing — PNG load, SVG annotation
 * alignment, prose rhythm.
 *
 * Walks content/docs/**\/*.mdx, filters to `status !== "stub"`, and
 * generates one full-page capture per article into proof/.
 */

const CONTENT_ROOT = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "content",
    "docs"
);

interface ArticleRef {
    category: string;
    slug: string;
    filename: string;
}

function collectArticles(): ArticleRef[] {
    const out: ArticleRef[] = [];
    if (!fs.existsSync(CONTENT_ROOT)) return out;
    for (const category of fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
        if (!category.isDirectory()) continue;
        const categoryDir = path.join(CONTENT_ROOT, category.name);
        const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith(".mdx"));
        for (const file of files) {
            const raw = fs.readFileSync(path.join(categoryDir, file), "utf8");
            const { data } = matter(raw);
            if (data.status === "stub") continue;
            const slug = String(data.slug || file.replace(/\.mdx$/, ""));
            out.push({
                category: category.name,
                slug,
                filename: `${category.name}--${slug}`,
            });
        }
    }
    return out.sort((a, b) =>
        `${a.category}/${a.slug}`.localeCompare(`${b.category}/${b.slug}`)
    );
}

const articles = collectArticles();

test.describe("proof — rendered docs articles", () => {
    for (const article of articles) {
        test(`captures /docs/${article.category}/${article.slug}`, async ({
            page,
        }) => {
            const env = docsEnv();
            await page.goto(
                env.baseUrl + `/docs/${article.category}/${article.slug}`,
                { waitUntil: "networkidle" }
            );

            // Wait for the first Screenshot figure (if any) to mount so
            // the image + SVG overlay are composited in the final layout.
            const figures = page.locator("figure");
            if (await figures.first().isVisible().catch(() => false)) {
                await page.waitForTimeout(500);
            }

            await shoot(page, { name: `proof/${article.filename}`, fullPage: true });
        });
    }
});
