import { test } from "@playwright/test";
import { shoot } from "../fixtures/shoot";
import { docsEnv } from "../fixtures/env";

// -----------------------------------------------------------------------------
// Checkout steps 2 - 5 — feeds content/docs/ordering/*.mdx
//
// Pre-seeds cart + checkout form into localStorage before the page
// loads, and installs a short-lived Storage.prototype.setItem patch
// that blocks writes to the checkout key for 2.5s. This is enough to
// survive the checkout component's on-mount persist effect, which
// otherwise clobbers the pre-seed before the restore effect reads it.
// Once the restore has run, the patch unblocks and normal persistence
// resumes with the restored state.
// -----------------------------------------------------------------------------

const DEMO_IDS = {
    assetGreen: "00000000-0000-4000-8040-000000000010",
    eventChairsBatch: "00000000-0000-4000-8040-000000000001",
    assetOrange: "00000000-0000-4000-8040-000000000012",
};

interface SeedArgs {
    cartJson: string;
    checkoutJson: string;
}

async function primeCheckout(
    context: import("@playwright/test").BrowserContext,
    args: {
        step: "installation" | "venue" | "contact" | "review";
        form: Record<string, unknown>;
        cart?: Array<Record<string, unknown>>;
    }
) {
    const defaultCart = [
        {
            assetId: DEMO_IDS.assetGreen,
            assetName: "Backdrop Panel #1",
            quantity: 1,
            availableQuantity: 1,
            volume: 5,
            weight: 12,
            dimensionLength: 200,
            dimensionWidth: 10,
            dimensionHeight: 250,
            category: "Decor",
            image: "",
            addedAt: "2026-04-13T10:00:00.000Z",
            condition: "GREEN",
        },
        {
            assetId: DEMO_IDS.eventChairsBatch,
            assetName: "Event Chair (batch)",
            quantity: 12,
            availableQuantity: 20,
            volume: 0.12,
            weight: 5.4,
            dimensionLength: 45,
            dimensionWidth: 45,
            dimensionHeight: 90,
            category: "Furniture",
            image: "",
            addedAt: "2026-04-13T10:01:00.000Z",
            condition: "GREEN",
        },
    ];
    const cart = {
        items: args.cart ?? defaultCart,
        version: 1,
        lastUpdated: 1_744_550_400_000,
    };
    const checkout = { step: args.step, form: args.form };

    await context.addInitScript((data: SeedArgs) => {
        const originalSetItem = Storage.prototype.setItem;
        const blockUntil = Date.now() + 2500;

        // Patch BEFORE the page's own scripts run.
        Storage.prototype.setItem = function patchedSetItem(
            this: Storage,
            key: string,
            value: string
        ) {
            if (key === "kadence_checkout_form" && Date.now() < blockUntil) {
                // Swallow early writes — specifically the checkout
                // component's mount-time persist effect that would
                // overwrite our pre-seed.
                return;
            }
            return originalSetItem.call(this, key, value);
        } as typeof Storage.prototype.setItem;

        // Seed the keys directly via the original setItem.
        originalSetItem.call(
            window.localStorage,
            "asset-cart-v1",
            data.cartJson
        );
        originalSetItem.call(
            window.localStorage,
            "kadence_checkout_form",
            data.checkoutJson
        );
    }, { cartJson: JSON.stringify(cart), checkoutJson: JSON.stringify(checkout) });
}

const COMMON_DATES = {
    event_start_date: "2026-04-27",
    event_end_date: "2026-04-28",
};

const COMMON_VENUE = {
    venue_name: "Dubai Exhibition Centre",
    venue_country_id: "",
    venue_country_name: "United Arab Emirates",
    venue_city_id: "",
    venue_city_name: "Dubai",
    venue_address: "Hall 3, Dubai Exhibition Centre, Expo City",
    venue_access_notes: "",
    venue_contact_name: "Priya Kapoor",
    venue_contact_email: "priya@venue.example",
    venue_contact_phone: "+971504567890",
};

const COMMON_CONTACT = {
    contact_name: "Alex Chen",
    contact_email: "alex.chen@kadence-demo.com",
    contact_phone: "+971501234567",
    special_instructions:
        "Please arrive at the north loading dock. Setup window is 07:00 - 09:00.",
};

// -----------------------------------------------------------------------------
// Tests — each starts fresh, each pre-seeds for exactly its target step.
// -----------------------------------------------------------------------------

test.describe("checkout — step captures", () => {
    test("Step 2 — empty dates + stepper", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "installation",
            form: {
                brand_id: undefined,
                event_start_date: "",
                event_end_date: "",
                requires_permit: false,
                permit_owner: "UNKNOWN",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation details/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/01-stepper" });
        await shoot(page, { name: "ordering/02-dates-empty" });
    });

    test("Step 2 — dates filled + preferred delivery", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "installation",
            form: {
                brand_id: undefined,
                ...COMMON_DATES,
                requested_delivery_date: "2026-04-26",
                requested_delivery_time_start: "07:00",
                requested_delivery_time_end: "09:00",
                requires_permit: false,
                permit_owner: "UNKNOWN",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation details/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/03-dates-filled" });
    });

    test("Step 3 — venue basics", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "venue",
            form: {
                ...COMMON_DATES,
                ...COMMON_VENUE,
                requires_permit: false,
                permit_owner: "UNKNOWN",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation information/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/04-venue-basics" });
    });

    test("Step 3 — permits expanded", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "venue",
            form: {
                ...COMMON_DATES,
                ...COMMON_VENUE,
                requires_permit: true,
                permit_owner: "PLATFORM",
                permit_venue_contact_name: "Fahd Al-Mansoori",
                permit_venue_contact_email: "operations@venue.example",
                permit_venue_contact_phone: "+971509998877",
                requires_vehicle_docs: true,
                requires_staff_ids: true,
                permit_notes:
                    "Loading dock access before 09:00 only. Staff IDs required 48h in advance.",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /installation information/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/05-permits-expanded", fullPage: true });
    });

    test("Step 4 — contact autofilled", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "contact",
            form: {
                ...COMMON_DATES,
                ...COMMON_VENUE,
                ...COMMON_CONTACT,
                requires_permit: false,
                permit_owner: "UNKNOWN",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /point of contact/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(400);
        await shoot(page, { name: "ordering/06-contact" });
    });

    test("Step 5 — review summary", async ({ page, context }) => {
        await primeCheckout(context, {
            step: "review",
            form: {
                ...COMMON_DATES,
                ...COMMON_VENUE,
                ...COMMON_CONTACT,
                requires_permit: false,
                permit_owner: "UNKNOWN",
            },
        });
        const env = docsEnv();
        await page.goto(env.baseUrl + "/checkout", { waitUntil: "networkidle" });
        await page
            .getByRole("heading", { name: /review & submit/i })
            .waitFor({ timeout: 15_000 });
        await page.waitForTimeout(600);
        await shoot(page, { name: "ordering/10-review", fullPage: true });
    });
});
