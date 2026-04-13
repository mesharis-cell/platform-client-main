import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Condition-surfacing on catalog cards — feeds
// content/docs/catalog/conditions.mdx
//
// The Backdrop Panels family has GREEN+ORANGE+RED mix, so its card on the
// catalog index surfaces a "N need repair" red badge. We filter the
// catalog down to this one card so the condition-flag card is the
// subject of the shot rather than buried in the grid.
// -----------------------------------------------------------------------------

test.describe("catalog condition badges (authenticated)", () => {
    test("card with condition flag", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog", { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: /browse items/i }).waitFor();

        // Narrow to just the Backdrop Panels family so the condition card
        // is front and centre instead of mixed in with other results.
        await page.getByPlaceholder(/search families or collections/i).fill("backdrop");
        await page.waitForTimeout(400);

        await shoot(page, { name: "catalog/06-card-condition" });
    });
});
