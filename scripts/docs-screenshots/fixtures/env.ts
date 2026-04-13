/**
 * Env helpers for the docs screenshot harness.
 *
 * Reads from `.env.docs.local` (loaded by playwright.docs.config.ts) with
 * sensible defaults that match the seeded Kadence Demo tenant.
 */
export function docsEnv() {
    return {
        baseUrl: process.env.DOCS_CLIENT_BASE_URL ?? "http://localhost:4002",
        email: process.env.DOCS_CLIENT_EMAIL ?? "alex.chen@kadence-demo.com",
        password: process.env.DOCS_CLIENT_PASSWORD ?? "DocsPass!Client1",
    };
}
