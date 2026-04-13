import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// ORANGE-items Maintenance Decision Center — feeds
// content/docs/ordering/maintenance-decisions.mdx
//
// Uses the same localStorage-patch pre-seed pattern as ordering-steps
// to land directly on the Review step with an ORANGE item in the cart.
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    assetOrange: "00000000-0000-4000-8040-000000000012",
};

test.describe("checkout — maintenance decisions (ORANGE)", () => {
    test("decision center at review step", async ({ page, context }) => {
        const cart = {
            items: [
                {
                    assetId: DEMO_IDS.assetOrange,
                    assetName: "Backdrop Panel #3",
                    quantity: 1,
                    availableQuantity: 1,
                    volume: 5,
                    weight: 12,
                    dimensionLength: 200,
                    dimensionWidth: 10,
                    dimensionHeight: 250,
                    category: "Decor",
                    image: "",
                    addedAt: "2026-04-13T10:00:00.000Z",
                    condition: "ORANGE",
                    conditionNotes:
                        "Minor scuff on lower corner. Cosmetic only; structurally fine.",
                    refurbDaysEstimate: 2,
                    conditionImages: [],
                },
            ],
            version: 1,
            lastUpdated: 1_744_550_400_000,
        };
        const checkout = {
            step: "review",
            form: {
                event_start_date: "2026-04-27",
                event_end_date: "2026-04-28",
                venue_name: "Dubai Exhibition Centre",
                venue_country_name: "United Arab Emirates",
                venue_city_name: "Dubai",
                venue_address: "Hall 3, Expo City",
                venue_contact_name: "Priya Kapoor",
                venue_contact_email: "priya@venue.example",
                venue_contact_phone: "+971504567890",
                contact_name: "Alex Chen",
                contact_email: "alex.chen@kadence-demo.com",
                contact_phone: "+971501234567",
                requires_permit: false,
                permit_owner: "UNKNOWN",
                special_instructions: "",
            },
        };

        await context.addInitScript(
            (data: { cartJson: string; checkoutJson: string }) => {
                const originalSetItem = Storage.prototype.setItem;
                const blockUntil = Date.now() + 2500;
                Storage.prototype.setItem = function patched(
                    this: Storage,
                    key: string,
                    value: string
                ) {
                    if (
                        key === "kadence_checkout_form" &&
                        Date.now() < blockUntil
                    ) {
                        return;
                    }
                    return originalSetItem.call(this, key, value);
                } as typeof Storage.prototype.setItem;
                originalSetItem.call(
                    window.localStorage,
                    "asset-cart-v1",
                    data.cartJson
                );
                originalSetItem.call(
                    window.localStorage,
                    "kadence_checkout_form",
                    data.checkoutJson
                );
            },
            {
                cartJson: JSON.stringify(cart),
                checkoutJson: JSON.stringify(checkout),
            }
        );

        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /review & submit/i })
            .waitFor({ timeout: 15_000 });

        // Scroll the Maintenance Decision Center into frame.
        await page
            .getByText(/maintenance decision center/i)
            .scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);

        await shoot(page, { name: "ordering/07-maintenance-decisions" });
    });
});
