import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Scan Activity captures — feeds content/docs/scan-activity/*.mdx
//
// Uses:
//   ORD-DEMO-004 (DELIVERED) — has Outbound, Outbound Truck Photos,
//     On Site Capture, Derig Capture — rich source for overview,
//     single-entry anatomy, photo-grid examples.
//   ORD-DEMO-005 (CLOSED) — Return Truck Photos + Inbound with BROKEN
//     discrepancy. Source for the discrepancy screenshot.
// -----------------------------------------------------------------------------

test.describe("scan activity views", () => {
    test("01 — scan activity overview on DELIVERED order", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-004", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-004/i).first().waitFor({ timeout: 10_000 });

        // Scan Activity heading — scroll it to top of viewport.
        await page
            .getByText(/scan timeline/i)
            .first()
            .scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await shoot(page, { name: "scan-activity/01-overview" });
    });

    test("02 — single scan entry anatomy", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-004", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-004/i).first().waitFor({ timeout: 10_000 });

        // The first Derig Capture / Outbound entry is the canonical example.
        // Scroll it into frame.
        const firstScanCard = page
            .locator('[class*="scan"]')
            .first()
            .or(page.getByText(/derig capture|outbound scan/i).first());
        await firstScanCard.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(500);
        await shoot(page, { name: "scan-activity/02-entry-anatomy" });
    });

    test("03 — photo grid on a scan with attachments", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-004", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-004/i).first().waitFor({ timeout: 10_000 });

        // Derig Capture is seeded with 3 photos — scroll it into frame.
        await page
            .getByText(/derig capture/i)
            .first()
            .scrollIntoViewIfNeeded()
            .catch(() => {});
        await page.waitForTimeout(500);
        await shoot(page, { name: "scan-activity/03-photo-grid" });
    });

    test("04 — inbound with BROKEN discrepancy on CLOSED order", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-005", {
            waitUntil: "networkidle",
        });
        await page.getByText(/ORD-DEMO-005/i).first().waitFor({ timeout: 10_000 });

        // The Inbound entry + discrepancy is on the CLOSED order.
        await page
            .getByText(/discrepancy/i)
            .first()
            .scrollIntoViewIfNeeded()
            .catch(async () => {
                // Fallback: scroll to the Inbound Scan section.
                await page
                    .getByText(/inbound scan/i)
                    .first()
                    .scrollIntoViewIfNeeded()
                    .catch(() => {});
            });
        await page.waitForTimeout(500);
        await shoot(page, { name: "scan-activity/04-inbound-with-discrepancy" });
    });
});
