import type { Page, Locator } from "@playwright/test";

/**
 * Inject a visual highlight onto one or more DOM elements before capturing
 * a screenshot. Returns an async cleanup function that removes the markers.
 *
 * Use this for "look at THIS button" emphasis inside the PNG itself —
 * great when the element is subtle in the UI but important in the tutorial.
 * For richer numbered callouts with copy, use the <Screenshot annotations>
 * prop instead, which renders an SVG overlay at display time.
 */
export type HighlightShape = "outline" | "fill";

export interface HighlightOptions {
    shape?: HighlightShape;
    /** CSS color. Defaults to --primary via hsl(var(--primary)). */
    color?: string;
    /** Outline width in px. */
    thickness?: number;
    /** Extra padding around the element for the outline. */
    padding?: number;
}

let counter = 0;

export async function highlight(
    page: Page,
    locator: Locator,
    options: HighlightOptions = {}
): Promise<() => Promise<void>> {
    await locator.first().waitFor({ state: "visible", timeout: 5_000 });

    const className = `docs-hl-${++counter}`;
    const shape = options.shape ?? "outline";
    const thickness = options.thickness ?? 3;
    const padding = options.padding ?? 4;
    // Primary tenant color — pulled from the live CSS var so highlights
    // match whatever tenant we're shooting against.
    const color = options.color ?? "hsl(var(--primary))";

    // 1. Tag every matched element with our unique class.
    await locator.evaluateAll((elements, cls) => {
        for (const el of elements) {
            if (el instanceof HTMLElement) el.classList.add(cls);
        }
    }, className);

    // 2. Inject a style tag scoped to that class.
    const css =
        shape === "outline"
            ? `
              .${className} {
                  position: relative;
                  outline: ${thickness}px solid ${color} !important;
                  outline-offset: ${padding}px !important;
                  border-radius: 4px;
                  box-shadow: 0 0 0 ${thickness + 3}px rgba(0,0,0,0.04),
                              0 0 18px 4px ${color}40 !important;
                  transition: none !important;
              }
            `
            : `
              .${className} {
                  position: relative;
                  background-color: ${color}22 !important;
                  outline: ${thickness}px solid ${color} !important;
                  transition: none !important;
              }
            `;

    const styleHandle = await page.addStyleTag({ content: css });

    return async () => {
        await styleHandle.evaluate((el) => {
            if (el instanceof Element) el.remove();
        });
        await locator.evaluateAll((elements, cls) => {
            for (const el of elements) {
                if (el instanceof HTMLElement) el.classList.remove(cls);
            }
        }, className);
    };
}
