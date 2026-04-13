import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { highlight } from "../fixtures/highlight";
import { docsEnv } from "../fixtures/env";

/**
 * M2 proof shot: captures the client dashboard after logging in as
 * Alex Chen (via the shared storage state) with a highlight drawn around
 * the sidebar's currently-active nav item.
 *
 * If this produces a clean PNG at
 *   public/docs/screenshots/proof/01-dashboard.png
 * the whole harness works end-to-end: auth setup → storage-state reuse →
 * navigation → highlight injection → capture → committed output.
 */
test.describe("proof — dashboard + sidebar highlight", () => {
    test("captures dashboard with highlighted nav item", async ({ page }) => {
        const env = docsEnv();

        await page.goto(env.baseUrl + "/client-dashboard", {
            waitUntil: "networkidle",
        });

        // Give the dashboard skeleton loaders a moment to resolve.
        await page.waitForLoadState("networkidle");

        // Highlight the currently-active (Dashboard) sidebar entry.
        const cleanup = await highlight(
            page,
            page.getByRole("link", { name: /dashboard/i }).first()
        );

        await shoot(page, { name: "proof/01-dashboard" });

        await cleanup();
    });
});
