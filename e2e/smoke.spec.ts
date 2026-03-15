import { test, expect, requireEnv, formatDate } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openFamilyWithOrderableStock(page: Page): Promise<void> {
    await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /browse items/i })).toBeVisible();
    await expect(page.getByTestId("client-family-browser")).toBeVisible();

    const familyLinks = page.locator('a[href^="/catalog/families/"]');
    const familyCount = await familyLinks.count();

    for (let index = 0; index < Math.min(familyCount, 8); index += 1) {
        await familyLinks.nth(index).click();
        await page.waitForURL(/\/catalog\/families\//);
        await expect(page.getByTestId("family-stock-list")).toBeVisible();

        const stockCards = page.getByTestId("family-stock-card");
        const stockCount = await stockCards.count();
        for (let stockIndex = 0; stockIndex < stockCount; stockIndex += 1) {
            const card = stockCards.nth(stockIndex);
            const text = (await card.textContent()) || "";
            if (text.includes("RED") || text.includes("ORANGE")) continue;
            const addButton = card.getByTestId("family-stock-add");
            if (await addButton.isDisabled()) continue;
            await addButton.click();
            // The cart drawer has a checkout button — wait for it
            await expect(page.getByTestId("cart-checkout")).toBeVisible({ timeout: 15_000 });
            return;
        }

        await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    }

    throw new Error("Failed to find an orderable stock record in the first 8 families");
}

async function chooseFirstCity(page: Page) {
    await page.getByTestId("checkout-venue-city").click();
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    await option.click();
}

async function findQuotedOrderLink(page: Page): Promise<Locator | null> {
    const quotedBadge = page.getByText(/^Quoted$/).first();
    if ((await quotedBadge.count()) === 0) return null;
    const card = quotedBadge.locator("xpath=ancestor::a[1]");
    return (await card.count()) > 0 ? card.first() : null;
}

async function approveQuotedOrder(page: Page) {
    const poNumber = `PW-PO-${Date.now()}`;

    await expect(page.getByTestId("client-order-quote-review")).toBeVisible();
    await page.getByRole("button", { name: /accept quote/i }).click();
    await page.getByTestId("client-po-number-input").fill(poNumber);
    await page.getByRole("button", { name: /confirm & accept quote/i }).click();

    await expect(page.getByTestId("client-order-po-number")).toContainText(poNumber, {
        timeout: 30_000,
    });
}

// ---------------------------------------------------------------------------
// Catalog Browsing
// ---------------------------------------------------------------------------

test.describe("Catalog", () => {
    test("family browser loads and shows families", async ({ authedPage: page }) => {
        await page.goto("/catalog", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /browse items/i })).toBeVisible();
        await expect(page.getByTestId("client-family-browser")).toBeVisible();
        await expect(page.locator('a[href^="/catalog/families/"]').first()).toBeVisible();
    });

    test("family detail shows stock list", async ({ authedPage: page }) => {
        await page.goto("/catalog", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/catalog/families/"]').first().click();
        await page.waitForURL(/\/catalog\/families\//);
        await expect(page.getByTestId("family-stock-list")).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Order Submission
// ---------------------------------------------------------------------------

test.describe("Order Submission", () => {
    test("full checkout flow from family browse to order confirmation", async ({
        authedPage: page,
    }) => {
        await openFamilyWithOrderableStock(page);

        await page.getByTestId("cart-checkout").click();
        await page.waitForURL(/\/checkout$/);

        // Step 1: Items review
        await page.getByTestId("checkout-next").click();

        // Step 2: Event dates
        await page.getByTestId("checkout-event-start").fill(formatDate(10));
        await page.getByTestId("checkout-event-end").fill(formatDate(12));
        await page.getByTestId("checkout-next").click();

        // Step 3: Venue
        await page.getByTestId("checkout-venue-name").fill(`Playwright Venue ${Date.now()}`);
        await chooseFirstCity(page);
        await page.getByTestId("checkout-venue-address").fill("Dubai Festival City, Dubai");
        await page.getByTestId("checkout-next").click();

        // Step 4: Contact
        await page.getByTestId("checkout-contact-name").fill("Playwright Client");
        await page.getByTestId("checkout-contact-email").fill(requireEnv("CLIENT_EMAIL"));
        await page.getByTestId("checkout-contact-phone").fill("+971501234567");
        await page.getByTestId("checkout-next").click();

        // Step 5: Review & Submit
        await expect(page.getByRole("heading", { name: /review & submit/i })).toBeVisible();
        await page.getByTestId("checkout-submit").click();

        // Verify order created
        await page.waitForURL(/\/orders\//, { timeout: 60_000 });
        await expect(page.getByTestId("client-order-hero")).toBeVisible();

        const orderId = page.url().split("/orders/")[1]?.split("?")[0];
        if (!orderId) throw new Error("Failed to capture order id from URL");

        // Verify order appears in list
        await page.goto("/my-orders", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible();
        await expect(page.getByText(orderId).first()).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Existing Orders
// ---------------------------------------------------------------------------

test.describe("Existing Orders", () => {
    test("order list and detail navigation", async ({ authedPage: page }) => {
        await page.goto("/my-orders", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible();

        // Check for quoted orders first
        const quotedOrderLink = await findQuotedOrderLink(page);
        if (quotedOrderLink) {
            await quotedOrderLink.click();
            await page.waitForURL(/\/orders\//);
            await approveQuotedOrder(page);
            return;
        }

        // Fall back to any order
        const orderLinks = page.locator('a[href^="/orders/"]');
        const emptyState = page.getByText(/no orders found/i);

        await expect
            .poll(async () => {
                const linkCount = await orderLinks.count();
                const emptyCount = await emptyState.count();
                return linkCount > 0 || emptyCount > 0;
            })
            .toBe(true);

        if ((await orderLinks.count()) === 0) {
            await expect(page.getByText(/no orders found/i)).toBeVisible();
            return;
        }

        await orderLinks.first().click();
        await page.waitForURL(/\/orders\//);
        await expect(page.getByTestId("client-order-hero")).toBeVisible();
    });
});
