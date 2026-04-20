import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Forgot-password flow screenshots — feeds
// content/docs/getting-started/forgot-password.mdx
//
// Both captures run as a logged-out browser. For step 2 we intercept the
// real /auth/forgot-password call with a mocked 200 so the UI transitions
// without sending a live email via Resend (keeps the docs seed quiet).
// -----------------------------------------------------------------------------

test.describe("forgot-password flow (unauthenticated)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("step 1 — email entry", async ({ page }) => {
        const env = docsEnv();
        await page.goto(env.baseUrl + "/forgot-password", {
            waitUntil: "networkidle",
        });

        // Heading on step 1 is "Password / Recovery". Wait for it to avoid
        // capturing a half-hydrated shell.
        await page.getByRole("heading", { level: 2, name: /password\s*recovery/i }).waitFor();

        await shoot(page, { name: "getting-started/03-forgot-password-email" });
    });

    test("step 2 — OTP + new password", async ({ page, context }) => {
        const env = docsEnv();

        // Intercept /auth/forgot-password so we don't trigger a real
        // Resend send and so the UI transitions to step 2 deterministically.
        await context.route("**/auth/forgot-password", async (route) => {
            if (route.request().method() !== "POST") {
                return route.continue();
            }
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    message: "OTP sent successfully",
                    data: null,
                }),
            });
        });

        await page.goto(env.baseUrl + "/forgot-password", {
            waitUntil: "networkidle",
        });

        // Fill step 1.
        await page.getByLabel(/email address/i).fill(env.email);
        await page.getByRole("button", { name: /continue/i }).click();

        // Wait for step 2 — the OTP input row is the surest signal.
        await page
            .getByRole("heading", { level: 2, name: /verify\s*&\s*reset/i })
            .waitFor({ timeout: 10_000 });

        // Dismiss the auto-appearing "OTP Sent" toast so it doesn't
        // overlap the Back to Login link in the captured frame.
        await page.waitForTimeout(3500);

        // Full page so the Reset Password button at the bottom is in the
        // frame; Step 2's form is taller than an 800-px viewport.
        await shoot(page, {
            name: "getting-started/04-forgot-password-otp",
            fullPage: true,
        });
    });
});
