import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Dedicated Playwright config for the /docs tutorials screenshot harness.
// Lives separately from the E2E smoke tests (playwright.config.ts +
// e2e/) so the two suites can never collide on reporters, test patterns,
// or storage state files.

dotenv.config({ path: ".env.docs.local" });

const SCRIPTS_DIR = path.join(__dirname, "scripts", "docs-screenshots");
const STORAGE_PATH = path.join(SCRIPTS_DIR, ".auth", "alex-chen.json");

export default defineConfig({
    testDir: SCRIPTS_DIR,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    outputDir: path.join(SCRIPTS_DIR, ".output"),

    use: {
        baseURL: process.env.DOCS_CLIENT_BASE_URL || "http://localhost:4002",
        headless: true,
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2, // capture at 2x so screenshots look sharp on retina
        trace: "retain-on-failure",
    },

    projects: [
        {
            name: "setup",
            testMatch: /.*auth\.setup\.ts/,
        },
        {
            name: "shots",
            testMatch: /.*\.shoot\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1280, height: 800 },
                deviceScaleFactor: 2,
                storageState: STORAGE_PATH,
            },
            dependencies: ["setup"],
        },
    ],
});
