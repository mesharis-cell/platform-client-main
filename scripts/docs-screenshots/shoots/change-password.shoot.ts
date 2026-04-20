import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Authenticated change-password form — feeds
// content/docs/getting-started/change-password.mdx
// -----------------------------------------------------------------------------

test.describe("change password page (authenticated)", () => {
    test("captures /reset-password with empty form", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/reset-password", {
            waitUntil: "networkidle",
        });

        // The page uses "CHANGE PASSWORD" as its inner heading, uppercase.
        await page
            .getByRole("heading", { name: /change password/i })
            .first()
            .waitFor();

        // Wait for useCompany() to resolve so the sidebar shows the real
        // "Kadence Demo" branding instead of Skeleton placeholders.
        await page.getByRole("heading", { name: /kadence demo/i }).waitFor({ timeout: 10_000 });

        await shoot(page, { name: "getting-started/05-change-password" });
    });
});
