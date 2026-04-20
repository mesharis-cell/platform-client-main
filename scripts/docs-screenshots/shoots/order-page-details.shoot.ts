import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Order detail captures — feeds all order-page/*.mdx tutorials except
// my-orders-list. One canonical order per article section, chosen for
// the data that makes each section most explainable:
//
//  - ORD-DEMO-003 (CONFIRMED) — canonical "everything is normal" page
//  - ORD-DEMO-001 (PRICING_REVIEW) — status-hero variant
//  - ORD-DEMO-004 (DELIVERED) — rich 10-entry status timeline
//  - ORD-DEMO-005 (CLOSED) — has the SR-DEMO-001 linked service request
// -----------------------------------------------------------------------------

test.describe("order page anatomy + sections", () => {
    test("02 — anatomy of the order page (CONFIRMED)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-003", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-003/i)
            .first()
            .waitFor({ timeout: 10_000 });
        await page.waitForTimeout(500);
        await shoot(page, { name: "order-page/02-order-anatomy" });
    });

    test("03 — status hero (PRICING_REVIEW)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-001", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-001/i)
            .first()
            .waitFor({ timeout: 10_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "order-page/03-status-submitted" });
    });

    test("04 — status timeline (DELIVERED — richest history)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-004", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-004/i)
            .first()
            .waitFor({ timeout: 10_000 });

        // Scroll the timeline into frame.
        await page
            .getByText(/order timeline/i)
            .first()
            .scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await shoot(page, { name: "order-page/04-status-timeline" });
    });

    test("05 — linked service requests (CLOSED order with SR)", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-005", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-005/i)
            .first()
            .waitFor({ timeout: 10_000 });

        // The linked service requests card has its own heading.
        const srCard = page.getByText(/linked service requests/i).first();
        if (await srCard.isVisible().catch(() => false)) {
            await srCard.scrollIntoViewIfNeeded();
            await page.waitForTimeout(400);
        }
        await shoot(page, { name: "order-page/05-linked-srs" });
    });

    test("06 — supporting documents card", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-003", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-003/i)
            .first()
            .waitFor({ timeout: 10_000 });

        const attachmentsCard = page.getByText(/supporting documents/i).first();
        if (await attachmentsCard.isVisible().catch(() => false)) {
            await attachmentsCard.scrollIntoViewIfNeeded();
            await page.waitForTimeout(400);
            await shoot(page, { name: "order-page/06-attachments" });
        } else {
            // Feature flag is off for this tenant — capture a full order page
            // anyway as a fallback so the article has something to show.
            await shoot(page, { name: "order-page/06-attachments", fullPage: true });
        }
    });
});
