import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

/**
 * Post-M2 / M3 validation shots: captures each rendered /docs article
 * so we can visually verify the <Screenshot> compositing is correct at
 * the annotation level (numbered circles over the right spots on each
 * embedded PNG) and the overall prose/typography reads cleanly.
 *
 * These are not tutorial-content screenshots — they're a regression
 * harness for the docs site itself.
 */

const articles: Array<{ slug: string; filename: string }> = [
    { slug: "logging-in", filename: "01-logging-in-rendered" },
    { slug: "forgot-password", filename: "02-forgot-password-rendered" },
    { slug: "change-password", filename: "03-change-password-rendered" },
];

test.describe("proof — rendered docs articles", () => {
    for (const { slug, filename } of articles) {
        test(`captures /docs/getting-started/${slug}`, async ({ page }) => {
            const env = docsEnv();
            await page.goto(env.baseUrl + "/docs/getting-started/" + slug, {
                waitUntil: "networkidle",
            });

            // Wait for the first article Screenshot figure to be mounted
            // so images and SVG overlays are in the final layout.
            await page.locator("figure").first().waitFor({ timeout: 10_000 });
            await page.waitForTimeout(500);

            await shoot(page, { name: `proof/${filename}`, fullPage: true });
        });
    }
});
