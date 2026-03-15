import { expect, test, type Locator, type Page } from "@playwright/test";

const clientEmail = process.env.CLIENT_EMAIL;
const clientPassword = process.env.CLIENT_PASSWORD;

const requireEnv = (value: string | undefined, name: string) => {
    if (!value) {
        throw new Error(`Missing required Playwright env: ${name}`);
    }
    return value;
};

const formatDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split("T")[0];
};

async function login(page: Page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email address/i).fill(requireEnv(clientEmail, "CLIENT_EMAIL"));
    await page.getByLabel(/^password$/i).fill(requireEnv(clientPassword, "CLIENT_PASSWORD"));
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/client-dashboard$/, { timeout: 60_000 });
}

async function openFamilyWithOrderableStock(page: Page): Promise<void> {
    await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /browse by family/i })).toBeVisible();
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
            await expect(page.getByTestId("cart-checkout")).toBeVisible();
            return;
        }

        await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    }

    throw new Error("Failed to find an orderable family stock record in the first 8 families");
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

test("client staging smoke covers family browse and order submission", async ({ page }) => {
    await login(page);
    await openFamilyWithOrderableStock(page);

    await page.getByTestId("cart-checkout").click();
    await page.waitForURL(/\/checkout$/);

    await page.getByTestId("checkout-next").click();

    await page.getByTestId("checkout-event-start").fill(formatDate(10));
    await page.getByTestId("checkout-event-end").fill(formatDate(12));
    await page.getByTestId("checkout-next").click();

    await page.getByTestId("checkout-venue-name").fill(`Playwright Venue ${Date.now()}`);
    await chooseFirstCity(page);
    await page.getByTestId("checkout-venue-address").fill("Dubai Festival City, Dubai");
    await page.getByTestId("checkout-next").click();

    await page.getByTestId("checkout-contact-name").fill("Playwright Client");
    await page.getByTestId("checkout-contact-email").fill(requireEnv(clientEmail, "CLIENT_EMAIL"));
    await page.getByTestId("checkout-contact-phone").fill("+971501234567");
    await page.getByTestId("checkout-next").click();

    await expect(page.getByRole("heading", { name: /review & submit/i })).toBeVisible();
    await page.getByTestId("checkout-submit").click();

    await page.waitForURL(/\/orders\//, { timeout: 60_000 });
    await expect(page.getByTestId("client-order-hero")).toBeVisible();

    const orderId = page.url().split("/orders/")[1]?.split("?")[0];
    if (!orderId) {
        throw new Error("Failed to capture order id from order detail URL");
    }

    await page.goto("/my-orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible();
    await expect(page.getByText(orderId).first()).toBeVisible();
});

test("client staging smoke covers existing order branches", async ({ page }) => {
    await login(page);
    await page.goto("/my-orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible();

    const quotedOrderLink = await findQuotedOrderLink(page);
    if (quotedOrderLink) {
        await quotedOrderLink.click();
        await page.waitForURL(/\/orders\//);
        await expect(page.getByTestId("client-order-quote-review")).toBeVisible();
        return;
    }

    const firstOrderLink = page.locator('a[href^="/orders/"]').first();
    await expect(firstOrderLink).toBeVisible();
    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);
    await expect(page.getByTestId("client-order-hero")).toBeVisible();
});
