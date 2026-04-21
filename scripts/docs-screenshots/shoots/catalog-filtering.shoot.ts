import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Filter bar — feeds content/docs/catalog/filtering.mdx
//
// Applies a search to bring the Clear-filters button into frame, which is
// the state the article actually explains.
// -----------------------------------------------------------------------------

test.describe("catalog filter bar (authenticated)", () => {
    test("captures /catalog with a search term applied", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog", { waitUntil: "networkidle" });

        await page.getByRole("heading", { name: /browse items/i }).waitFor();
        await page
            .locator('[data-testid="client-family-card"], [data-testid="client-collection-card"]')
            .first()
            .waitFor({ timeout: 10_000 });

        // Narrow with a search term so the Clear-filters button appears.
        await page.getByPlaceholder(/search assets or collections/i).fill("backdrop");
        await page.waitForTimeout(400); // debounce settle

        await shoot(page, { name: "catalog/02-filter-bar" });
    });
});
