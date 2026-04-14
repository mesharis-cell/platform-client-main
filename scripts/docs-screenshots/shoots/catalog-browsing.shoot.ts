import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Catalog index — feeds content/docs/catalog/browsing.mdx
// -----------------------------------------------------------------------------

test.describe("catalog index (authenticated)", () => {
    test("captures /catalog with the All tab active", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog", {
            waitUntil: "networkidle",
        });

        // Wait until at least one catalog card has rendered so the grid
        // isn't caught mid-skeleton.
        await page.getByRole("heading", { name: /browse items/i }).waitFor();
        await page
            .locator('[data-testid="client-family-card"], [data-testid="client-collection-card"]')
            .first()
            .waitFor({ timeout: 10_000 });

        await shoot(page, { name: "catalog/01-index" });
    });
});
