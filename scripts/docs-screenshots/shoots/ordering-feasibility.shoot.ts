import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// RED-items feasibility check — feeds
// content/docs/ordering/red-items-and-feasibility.mdx
//
// Both captures mock the /client/v1/order/check-maintenance-feasibility
// response so we get deterministic passed / failed banners without
// having to juggle dates against the real refurb estimate every time.
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    assetRed: "00000000-0000-4000-8040-000000000013",
};

function seedScript(
    cartJson: string,
    checkoutJson: string
): (data: { cartJson: string; checkoutJson: string }) => void {
    return (data) => {
        const originalSetItem = Storage.prototype.setItem;
        const blockUntil = Date.now() + 2500;
        Storage.prototype.setItem = function patched(this: Storage, key: string, value: string) {
            if (key === "kadence_checkout_form" && Date.now() < blockUntil) {
                return;
            }
            return originalSetItem.call(this, key, value);
        } as typeof Storage.prototype.setItem;
        originalSetItem.call(window.localStorage, "asset-cart-v1", data.cartJson);
        originalSetItem.call(window.localStorage, "kadence_checkout_form", data.checkoutJson);
    };
}

function buildRedPayload(startDate: string) {
    const cart = {
        items: [
            {
                assetId: DEMO_IDS.assetRed,
                assetName: "Backdrop Panel #4",
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
                condition: "RED",
                conditionNotes: "Hinge bracket broken; replacement panel ordered.",
                refurbDaysEstimate: 5,
                conditionImages: [],
            },
        ],
        version: 1,
        lastUpdated: 1_744_550_400_000,
    };
    const checkout = {
        step: "installation",
        form: {
            event_start_date: startDate,
            event_end_date: startDate,
            requires_permit: false,
            permit_owner: "UNKNOWN",
        },
    };
    return {
        cartJson: JSON.stringify(cart),
        checkoutJson: JSON.stringify(checkout),
    };
}

test.describe("checkout — RED feasibility check", () => {
    test("feasibility passed banner (captured mid-check via delayed mock)", async ({
        page,
        context,
    }) => {
        const payload = buildRedPayload("2026-05-20");

        await context.addInitScript(seedScript(payload.cartJson, payload.checkoutJson), payload);

        // Delay the mock response by 4s so we can capture the "Checking…"
        // state, and then capture the passed banner after it resolves but
        // before the step advances.
        await context.route("**/client/v1/order/check-maintenance-feasibility", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 4000));
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    message: "Feasibility check passed",
                    data: { feasible: true, issues: [], config: {} },
                }),
            });
        });

        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation details/i })
            .waitFor({ timeout: 15_000 });

        // Fire the check.
        await page
            .getByRole("button", { name: /continue/i })
            .last()
            .click();

        // Wait for the "Checking" state to appear (amber banner) — this is
        // what we'll actually capture, since the passed banner flickers
        // for a single render before the step advances.
        await page.getByText(/checking maintenance feasibility/i).waitFor({ timeout: 5_000 });
        await page.waitForTimeout(300);

        await shoot(page, { name: "ordering/08-red-feasibility-ok" });
    });

    test("feasibility failed banner", async ({ page, context }) => {
        const payload = buildRedPayload("2026-04-14");

        await context.addInitScript(seedScript(payload.cartJson, payload.checkoutJson), payload);

        await context.route("**/client/v1/order/check-maintenance-feasibility", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    message: "Feasibility check completed",
                    data: {
                        feasible: false,
                        issues: [
                            {
                                asset_id: DEMO_IDS.assetRed,
                                asset_name: "Backdrop Panel #4",
                                refurb_days_estimate: 5,
                                earliest_feasible_date: "2026-04-19",
                                condition: "RED",
                                maintenance_mode: "MANDATORY_RED",
                                message: "Refurb timeline exceeds event start date.",
                            },
                        ],
                        config: {},
                    },
                }),
            });
        });

        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation details/i })
            .waitFor({ timeout: 15_000 });

        await page
            .getByRole("button", { name: /continue/i })
            .last()
            .click();

        // Banner copy matches a toast as well — pick the first match
        // (the inline banner element on the page, not the toast).
        await page
            .getByText(/cannot be completed/i)
            .first()
            .waitFor({ timeout: 10_000 });
        await page.waitForTimeout(500);

        await shoot(page, { name: "ordering/09-red-feasibility-fail" });
    });
});
