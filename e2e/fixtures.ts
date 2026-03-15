import { test as base, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

export function formatDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Auth fixture — logs in once per worker, reuses auth state across tests
// ---------------------------------------------------------------------------

async function loginClient(page: Page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email address/i).fill(requireEnv("CLIENT_EMAIL"));
    await page.getByLabel(/^password$/i).fill(requireEnv("CLIENT_PASSWORD"));
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/client-dashboard$/, { timeout: 60_000 });
}

// Extend the base test with an authenticated page
export const test = base.extend<{ authedPage: Page }>({
    authedPage: async ({ page }, use) => {
        await loginClient(page);
        await use(page);
    },
});

export { expect };
