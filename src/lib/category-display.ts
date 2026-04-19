/**
 * Safely resolve a display string from whatever shape a `category` field
 * arrives in. Multiple entities carry a `category`:
 *
 *   - assets: `category: string | null` (legacy varchar, still on `assets`)
 *   - asset_families: `category: { id, name, slug, color } | null` (structured)
 *   - collections: `category: string | null`
 *
 * Any JSX that tries to render `{x.category}` without unwrapping is a latent
 * React error #31 ("objects are not valid as a React child"). Use this
 * helper everywhere a category label is rendered as a string.
 */

export type CategoryLike =
    | string
    | null
    | undefined
    | { name?: string | null; [k: string]: unknown };

export function categoryLabel(category: CategoryLike, fallback = ""): string {
    if (!category) return fallback;
    if (typeof category === "string") return category;
    if (typeof category === "object" && category !== null) {
        const name = (category as { name?: unknown }).name;
        if (typeof name === "string" && name.length) return name;
    }
    return fallback;
}

