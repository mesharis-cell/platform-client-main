import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { docsEnv } from "./env";

/**
 * Runs exactly once per Playwright invocation (via the `setup` project in
 * playwright.docs.config.ts). Logs in as the seeded docs CLIENT user and
 * writes the authenticated storage state to disk so every shoot script
 * starts already-authenticated without needing to re-click the form.
 */
const STORAGE_PATH = path.join(
    __dirname,
    "..",
    ".auth",
    "alex-chen.json"
);

setup("login as Alex Chen and cache storage state", async ({ page }) => {
    fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

    const env = docsEnv();

    await page.goto(env.baseUrl + "/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email address/i).fill(env.email);
    await page.getByLabel(/^password$/i).fill(env.password);
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/client-dashboard(?:\?.*)?$/, { timeout: 45_000 });

    await expect(
        page.getByRole("heading", { level: 1, name: /dashboard/i })
    ).toBeVisible({ timeout: 15_000 });

    await page.context().storageState({ path: STORAGE_PATH });
});
