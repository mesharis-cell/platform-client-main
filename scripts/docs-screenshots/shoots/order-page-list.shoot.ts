import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// /my-orders list — feeds content/docs/order-page/my-orders-list.mdx
// -----------------------------------------------------------------------------

test.describe("my orders list (authenticated)", () => {
    test("captures /my-orders with all demo orders visible", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/my-orders", { waitUntil: "networkidle" });

        // Wait for the heading AND at least one data row before shooting so
        // we don't catch the skeleton loader state.
        await page.getByRole("heading", { name: /my orders/i }).waitFor();
        await page
            .getByText(/ORD-DEMO-/i)
            .first()
            .waitFor({ timeout: 10_000 });
        await page.waitForTimeout(400);

        await shoot(page, { name: "order-page/01-my-orders" });
    });
});
