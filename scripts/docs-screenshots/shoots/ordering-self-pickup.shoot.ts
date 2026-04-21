import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Self-pickup flow — feeds content/docs/ordering/choosing-delivery-or-pickup.mdx
// and content/docs/ordering/self-pickup-flow.mdx.
//
// Requires the demo tenant to have `enable_self_pickup: true` (platform or
// company override). Without that flag the mode picker never renders and
// these shoots will fail at the "mode" heading wait.
//
// Approach: pre-seed cart + a checkout checkpoint at step="mode" with
// modeConfirmed=false so we land on Step 0. For the self-pickup flow
// (3 steps), the SelfPickupCheckoutFlow component holds its own state
// in memory — we drive it by clicking Continue.
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    assetGreen: "00000000-0000-4000-8040-000000000010",
    eventChairsBatch: "00000000-0000-4000-8040-000000000001",
};

interface SeedArgs {
    cartJson: string;
    checkoutJson: string;
}

async function primeForModePicker(context: import("@playwright/test").BrowserContext) {
    const cart = {
        items: [
            {
                assetId: DEMO_IDS.assetGreen,
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
                addedAt: "2026-04-20T10:00:00.000Z",
                condition: "GREEN",
            },
            {
                assetId: DEMO_IDS.eventChairsBatch,
                assetName: "Event Chair (batch)",
                quantity: 12,
                availableQuantity: 20,
                volume: 0.12,
                weight: 5.4,
                dimensionLength: 45,
                dimensionWidth: 45,
                dimensionHeight: 90,
                category: "Furniture",
                image: "",
                addedAt: "2026-04-20T10:01:00.000Z",
                condition: "GREEN",
            },
        ],
        version: 1,
        lastUpdated: 1_745_136_000_000,
    };
    // modeConfirmed: false keeps the gate closed so restore lands on "mode".
    const checkout = { step: "mode", form: {}, modeConfirmed: false };

    await context.addInitScript(
        (data: SeedArgs) => {
            const originalSetItem = Storage.prototype.setItem;
            const blockUntil = Date.now() + 2500;

            Storage.prototype.setItem = function patchedSetItem(
                this: Storage,
                key: string,
                value: string
            ) {
                if (key === "kadence_checkout_form" && Date.now() < blockUntil) {
                    return;
                }
                return originalSetItem.call(this, key, value);
            } as typeof Storage.prototype.setItem;

            originalSetItem.call(window.localStorage, "asset-cart-v1", data.cartJson);
            originalSetItem.call(window.localStorage, "kadence_checkout_form", data.checkoutJson);
        },
        { cartJson: JSON.stringify(cart), checkoutJson: JSON.stringify(checkout) }
    );
}

test.describe("self-pickup flow — step captures", () => {
    test("mode picker — both options visible", async ({ page, context }) => {
        await primeForModePicker(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        // Mode picker heading.
        await page
            .getByRole("heading", { name: /how would you like to receive these items/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/sp-01-mode-picker" });
    });

    test("self-pickup path — items, details, review", async ({ page, context }) => {
        await primeForModePicker(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /how would you like to receive these items/i })
            .waitFor({ timeout: 15_000 });

        // Click the Self-Pickup card, then Continue.
        await page
            .getByRole("button", { name: /self-pickup/i })
            .first()
            .click();
        await page.waitForTimeout(200);
        await page.getByRole("button", { name: /continue/i }).click();

        // Step 1 — Review Items. SelfPickupCheckoutFlow renders its own
        // stepper + "Items for Collection" card. CardTitle isn't an
        // h-element so use getByText instead of getByRole("heading").
        await page.getByText(/items for collection/i).waitFor({ timeout: 10_000 });
        await page.waitForTimeout(300);
        await shoot(page, { name: "ordering/sp-02-stepper" });
        await shoot(page, { name: "ordering/sp-03-items" });

        // Advance to Step 2 — Collection Details.
        await page.getByRole("button", { name: /continue/i }).click();
        await page.getByText(/who is collecting\?/i).waitFor({ timeout: 10_000 });

        // Fill required fields so Continue becomes enabled and the form
        // looks "real" in the screenshot.
        await page.locator("#collector_phone").fill("+971501234567");
        await page.locator("#pickup_date").fill("2026-04-28");
        // Pickup From / To default to 09:00 / 11:00 — leave as-is.
        // Expected return (optional) — fill to show both date rows.
        const returnInput = page.locator('input[type="date"]').nth(1);
        await returnInput.fill("2026-04-30");
        await page.waitForTimeout(300);
        await shoot(page, { name: "ordering/sp-04-details", fullPage: true });

        // Advance to Step 3 — Review.
        await page.getByRole("button", { name: /continue/i }).click();
        await page.getByText(/review your self-pickup/i).waitFor({ timeout: 10_000 });
        await page.waitForTimeout(300);
        await shoot(page, { name: "ordering/sp-05-review", fullPage: true });
    });
});
