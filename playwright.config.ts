import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.playwright.local" });

export default defineConfig({
    testDir: "./e2e",
    timeout: 90_000,
    expect: {
        timeout: 15_000,
    },
    fullyParallel: false,
    retries: 1,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: process.env.CLIENT_BASE_URL || "https://staging.pernod-ricard.kadence.ae",
        headless: true,
        ignoreHTTPSErrors: false,
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
});
