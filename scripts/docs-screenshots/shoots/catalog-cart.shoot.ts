import { test, expect } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Add-to-cart + cart panel — feeds content/docs/catalog/adding-to-cart.mdx
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    // Backdrop Panel #1 — GREEN, serialized, visually clean for docs
    assetGreen: "00000000-0000-4000-8040-000000000010",
    // Event Chairs batch — POOLED, second cart line so the panel has more
    // than one row
    eventChairsBatch: "00000000-0000-4000-8040-000000000001",
};

test.describe("cart interactions (authenticated)", () => {
    test("asset detail with quantity stepper + add-to-cart button", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/catalog/assets/" + DEMO_IDS.assetGreen, {
            waitUntil: "networkidle",
        });
        await page.getByRole("heading", { name: /backdrop panel #1/i }).waitFor();

        await shoot(page, { name: "catalog/08-add-to-cart" });
    });

    test("cart panel with items", async ({ page, context }) => {
        const env = docsEnv();

        // Pre-seed the cart in localStorage before the page loads. This is
        // deterministic and sidesteps any race between the click-to-add
        // effect and the subsequent render of the cart panel. The shape
        // matches LocalCartItem in src/lib/cart/localStorage.ts.
        await context.addInitScript((ids) => {
            const payload = {
                items: [
                    {
                        assetId: ids.assetGreen,
                        assetName: "Backdrop Panel #1",
                        quantity: 1,
                        availableQuantity: 1,
                        volume: 5,
                        weight: 12,
                        dimensionLength: 200,
                        dimensionWidth: 10,
                        dimensionHeight: 250,
                        category: "Decor",
                        image: "",
                        addedAt: new Date("2026-04-13T10:00:00Z").toISOString(),
                        condition: "GREEN",
                    },
                    {
                        assetId: ids.eventChairsBatch,
                        assetName: "Event Chair (batch)",
                        quantity: 8,
                        availableQuantity: 20,
                        volume: 0.12,
                        weight: 5.4,
                        dimensionLength: 45,
                        dimensionWidth: 45,
                        dimensionHeight: 90,
                        category: "Furniture",
                        image: "",
                        addedAt: new Date("2026-04-13T10:01:00Z").toISOString(),
                        condition: "GREEN",
                    },
                ],
                version: 1,
                lastUpdated: Date.now(),
            };
            window.localStorage.setItem("asset-cart-v1", JSON.stringify(payload));
        }, DEMO_IDS);

        // Landing on /catalog is enough — the ClientNav wrapper mounts the
        // CartProvider, which reads localStorage on init.
        await page.goto(env.baseUrl + "/catalog", { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: /browse items/i }).waitFor();

        // Confirm the cart badge shows the expected item count before
        // opening the panel.
        const cartBadge = page.locator(
            'button[class*="fixed"][class*="bottom-8"][class*="right-8"] div'
        ).filter({ hasText: /^\d+$/ });
        await expect(cartBadge).toHaveText(/^[1-9]\d*$/, { timeout: 5_000 });

        // Open the floating cart panel.
        await page
            .locator('button[class*="fixed"][class*="bottom-8"][class*="right-8"]')
            .first()
            .click();

        // Wait for the slide-in panel heading.
        await page.getByRole("heading", { name: /your order/i }).waitFor({ timeout: 5_000 });

        // Confirm the panel actually shows items (not the empty state).
        await expect(page.getByText(/your order is empty/i)).toHaveCount(0);

        await page.waitForTimeout(400);

        await shoot(page, { name: "catalog/09-cart-panel" });
    });
});
