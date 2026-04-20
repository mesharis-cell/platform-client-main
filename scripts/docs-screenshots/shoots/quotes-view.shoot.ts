import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Static quote views — feeds content/docs/quotes/*.mdx
//
// Uses deterministic demo orders:
//   ORD-DEMO-002 — QUOTED (canonical quote review surface)
//   ORD-DEMO-003 — CONFIRMED (post-approval reference)
// -----------------------------------------------------------------------------

test.describe("quote views", () => {
    test("01 — order at QUOTED", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-002/i).first().waitFor({ timeout: 10_000 });
        await page.waitForTimeout(500);
        await shoot(page, { name: "quotes/01-order-at-quoted" });
    });

    test("02 — pricing breakdown (scrolled into frame)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-002/i).first().waitFor({ timeout: 10_000 });

        // Cost Breakdown heading sits at the top of the pricing card.
        await page
            .getByRole("heading", { name: /cost breakdown/i })
            .first()
            .scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await shoot(page, { name: "quotes/02-pricing-breakdown" });
    });

    test("03 — cost estimate download button in sidebar", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-002/i).first().waitFor({ timeout: 10_000 });

        await page
            .getByRole("button", { name: /download cost estimate/i })
            .first()
            .scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await shoot(page, { name: "quotes/03-cost-estimate-download" });
    });

    test("06 — post-approval state (CONFIRMED)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-003", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-003/i).first().waitFor({ timeout: 10_000 });
        await page.waitForTimeout(500);
        await shoot(page, { name: "quotes/06-post-approval" });
    });
});
