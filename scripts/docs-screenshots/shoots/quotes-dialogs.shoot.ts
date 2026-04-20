import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Quote approval and decline dialogs — feeds
// content/docs/quotes/approving-with-a-po-number.mdx and
// content/docs/quotes/declining-a-quote.mdx
//
// Uses ORD-DEMO-002 (QUOTED). Both tests intercept the approval and
// decline endpoints with no-op mocks so we don't actually mutate the
// demo order state during a capture.
// -----------------------------------------------------------------------------

function mockApprovalDeclineEndpoints(context: import("@playwright/test").BrowserContext) {
    return context.route("**/client/v1/order/**/(approve-quote|decline-quote)", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                success: true,
                message: "ok",
                data: null,
            }),
        });
    });
}

test.describe("quote approval dialog", () => {
    test("04 — Accept Quote dialog, empty PO", async ({ page, context }) => {
        await mockApprovalDeclineEndpoints(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-002/i)
            .first()
            .waitFor({ timeout: 10_000 });

        // Open the Accept Quote dialog.
        await page.getByRole("button", { name: /^accept quote$/i }).click();
        await page.getByRole("heading", { name: /^accept quote$/i }).waitFor({ timeout: 5_000 });
        await page.waitForTimeout(400);

        await shoot(page, { name: "quotes/04-approve-dialog-empty" });
    });

    test("05 — Accept Quote dialog, PO typed", async ({ page, context }) => {
        await mockApprovalDeclineEndpoints(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-002/i)
            .first()
            .waitFor({ timeout: 10_000 });

        await page.getByRole("button", { name: /^accept quote$/i }).click();
        await page.getByRole("heading", { name: /^accept quote$/i }).waitFor({ timeout: 5_000 });

        // Fill in a demo PO.
        await page.getByTestId("client-po-number-input").fill("PO-DEMO-2026-0042");
        await page.waitForTimeout(300);

        await shoot(page, { name: "quotes/05-approve-dialog-filled" });
    });
});

test.describe("quote decline dialog", () => {
    test("07 — Decline Quote dialog, empty reason", async ({ page, context }) => {
        await mockApprovalDeclineEndpoints(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-002/i)
            .first()
            .waitFor({ timeout: 10_000 });

        await page.getByRole("button", { name: /^decline quote$/i }).click();
        await page.getByRole("heading", { name: /^decline quote$/i }).waitFor({ timeout: 5_000 });
        await page.waitForTimeout(400);

        await shoot(page, { name: "quotes/07-decline-dialog-empty" });
    });

    test("08 — Decline Quote dialog, reason typed", async ({ page, context }) => {
        await mockApprovalDeclineEndpoints(context);
        const env = docsEnv();
        await page.goto(env.baseUrl + "/orders/ORD-DEMO-002", {
            waitUntil: "networkidle",
        });
        await page
            .getByText(/ORD-DEMO-002/i)
            .first()
            .waitFor({ timeout: 10_000 });

        await page.getByRole("button", { name: /^decline quote$/i }).click();
        await page.getByRole("heading", { name: /^decline quote$/i }).waitFor({ timeout: 5_000 });

        await page
            .getByPlaceholder(/price is higher than expected/i)
            .fill("Price came in higher than our approved budget for this event.");
        await page.waitForTimeout(300);

        await shoot(page, { name: "quotes/08-decline-dialog-filled" });
    });
});
