import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Family + asset + collection detail pages — feeds
// content/docs/catalog/family-vs-collection-vs-asset.mdx and
// content/docs/catalog/conditions.mdx
//
// Uses deterministic IDs from api/src/db/seeds/demo-deterministic.ts.
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    familyPooled: "00000000-0000-4000-8030-000000000001", // Event Chairs
    familySerialized: "00000000-0000-4000-8030-000000000002", // Backdrop Panels (mixed)
    assetGreen: "00000000-0000-4000-8040-000000000010", // Backdrop Panel #1 GREEN
    assetOrange: "00000000-0000-4000-8040-000000000012", // Backdrop Panel #3 ORANGE
    assetRed: "00000000-0000-4000-8040-000000000013", // Backdrop Panel #4 RED
    collection: "00000000-0000-4000-8045-000000000001", // Corporate Event Package
};

test.describe("catalog detail pages (authenticated)", () => {
    test("pooled family detail", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog/families/" + DEMO_IDS.familyPooled, {
            waitUntil: "networkidle",
        });
        await page.getByRole("heading", { name: /event chairs/i }).waitFor();
        await shoot(page, { name: "catalog/03-family-pooled" });
    });

    test("serialized family detail (condition-mixed)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog/families/" + DEMO_IDS.familySerialized, {
            waitUntil: "networkidle",
        });
        await page.getByRole("heading", { name: /backdrop panels/i }).waitFor();
        await shoot(page, { name: "catalog/04-family-serialized", fullPage: true });
    });

    test("collection detail", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog/collections/" + DEMO_IDS.collection, {
            waitUntil: "networkidle",
        });
        await page.getByRole("heading", { name: /corporate event package/i }).waitFor();
        await shoot(page, { name: "catalog/05-collection", fullPage: true });
    });

    test("asset detail — ORANGE condition", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog/assets/" + DEMO_IDS.assetOrange, {
            waitUntil: "networkidle",
        });
        await page.getByRole("heading", { name: /backdrop panel #3/i }).waitFor();
        await shoot(page, { name: "catalog/07-asset-orange" });
    });
});
