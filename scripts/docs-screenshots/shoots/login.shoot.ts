import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { highlight } from "../fixtures/highlight";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Login flow screenshots — feeds content/docs/getting-started/logging-in.mdx
// -----------------------------------------------------------------------------

test.describe("login landing page (unauthenticated)", () => {
    // Reset the shared storage state — we want a fresh, logged-out browser
    // so the landing form is visible rather than a dashboard redirect.
    test.use({ storageState: { cookies: [], origins: [] } });

    test("captures / with the sign-in form", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/", { waitUntil: "networkidle" });

        // Wait for the tenant-resolved heading to mount so the Kadence Demo
        // branding is in the frame, not the loading state.
        await page.getByRole("heading", { level: 2, name: /access/i }).waitFor();

        await shoot(page, { name: "getting-started/01-login-landing" });
    });
});

test.describe("post-login dashboard (authenticated)", () => {
    test("captures /client-dashboard with highlighted Dashboard nav", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/client-dashboard", {
            waitUntil: "networkidle",
        });

        const cleanup = await highlight(
            page,
            page.getByRole("link", { name: /dashboard/i }).first()
        );

        await shoot(page, { name: "getting-started/02-dashboard" });
        await cleanup();
    });
});
