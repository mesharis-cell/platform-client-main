type CatalogueImageEntry = { url?: string | null; source?: string | null };

/**
 * Resolve the catalogue thumbnail URL for an asset image array.
 *
 * `assets.images` holds BOTH client-curated catalogue photos (source !== "SCAN")
 * and operational return-scan imagery (source === "SCAN") in one column. SCAN
 * photos are internal and must NEVER surface to the ordering client, so this
 * deliberately does NOT fall back to a scan photo: an asset with no catalogue
 * photo returns `undefined` and the caller renders its placeholder — surface a
 * missing image, never leak an internal one.
 *
 * Untagged legacy entries (no `source`) are treated as catalogue, matching the
 * API resolver `imageUrlFromAsset` (catalog.services.ts).
 */
export const catalogueThumbUrl = (
    images?: ReadonlyArray<CatalogueImageEntry> | null
): string | undefined => {
    const client = (images ?? []).find(
        (img) => img?.source !== "SCAN" && typeof img?.url === "string" && img.url.length > 0
    );
    return client?.url ?? undefined;
};
