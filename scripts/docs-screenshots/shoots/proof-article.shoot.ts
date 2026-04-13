import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

/**
 * M2 validation shot #2: captures the rendered /docs article itself so
 * we can visually confirm the <Screenshot> component compositing is
 * correct — PNG loading, numbered SVG annotations overlaying the image,
 * legend beneath.
 *
 * This is not a tutorial screenshot; it's a post-M2 sanity check.
 */
test.describe("proof — rendered docs article", () => {
    test("captures /docs/getting-started/logging-in with Screenshot component", async ({
        page,
    }) => {
        const env = docsEnv();

        // The docs article is public — no auth needed. We still reuse the
        // shared storage state (harmless here) so the shoot matches how
        // every other tutorial capture runs.
        await page.goto(env.baseUrl + "/docs/getting-started/logging-in", {
            waitUntil: "networkidle",
        });

        // Scroll the <Screenshot> block roughly centred in view so the
        // capture focuses on the annotation compositing.
        const figure = page.locator("figure").filter({
            hasText: /Left sidebar/i,
        });
        await figure.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);

        await shoot(page, { name: "proof/02-article-rendering", fullPage: true });
    });
});
