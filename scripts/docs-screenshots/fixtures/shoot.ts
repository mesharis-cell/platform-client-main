import type { Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Path conventions for committed screenshots.
 *
 *   public/docs/screenshots/<flow>/<article>/<n>-<label>.png
 *
 * Filenames sort naturally in `ls` and match the <Screenshot src="..."> prop
 * authors use in MDX. Resolution is viewport × deviceScaleFactor from the
 * Playwright config (typically 1280x800 × 2).
 */
const SCREENSHOT_ROOT = path.join(__dirname, "..", "..", "..", "public", "docs", "screenshots");

export interface ShootOptions {
    /** `<flow>/<article>/<n>-<label>` (no extension). Required. */
    name: string;
    /** Capture only a region. Omit for viewport. */
    clip?: { x: number; y: number; width: number; height: number };
    /** Capture the full scrollable page instead of the viewport. */
    fullPage?: boolean;
    /**
     * If set, also disables all CSS animations/transitions before shooting
     * so no half-animated frames sneak in. Defaults to true.
     */
    freezeAnimations?: boolean;
}

async function freeze(page: Page): Promise<void> {
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
                scroll-behavior: auto !important;
            }

            /* Hide the Next.js 15 dev overlay and its badge — the "N" mark +
               "N Issues" pill occlude the bottom-left avatar in our shots.
               These elements only exist in dev mode; the rule is a no-op
               otherwise. */
            nextjs-portal,
            [data-next-badge-root],
            [data-nextjs-dev-tools-button],
            [data-nextjs-toast],
            #__next-build-watcher,
            #__next-dev-indicator {
                display: none !important;
            }
        `,
    });
}

export async function shoot(page: Page, options: ShootOptions): Promise<string> {
    if (options.freezeAnimations !== false) await freeze(page);

    const filePath = path.join(SCREENSHOT_ROOT, `${options.name}.png`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    await page.screenshot({
        path: filePath,
        clip: options.clip,
        fullPage: options.fullPage ?? false,
        type: "png",
        animations: "disabled",
        scale: "css",
    });

    return filePath;
}
