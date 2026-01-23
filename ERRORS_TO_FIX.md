## Client Dashboard Errors To Fix

## Typecheck Errors

- [x] Missing `@/db` and `@/db/schema` modules (multiple services)
- [x] `catalog/assets/[id]/page.tsx`: `CatalogAssetDetails.company` missing
- [x] `catalog/collections/[id]/page.tsx`: response uses `data`, page reads `collection`
- [x] `checkout/page.tsx`: `formData` used before declaration
- [x] `create-asset-dialog.tsx`: camelCase form data vs snake_case types
- [x] `asset-service.ts`: camelCase usage vs snake_case types
- [x] `catalog-service.ts`: `CatalogListParams.search` missing (type uses `search_term`)
- [x] `BrandListResponse` uses `data` but UI expects `brands`
- [x] `tailwind.config.ts`: `darkMode` type mismatch

## Lint Errors

- [x] Client-only hooks/components and browser globals
