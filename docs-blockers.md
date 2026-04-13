# Docs Blockers

Running log of portal issues encountered while building the public `/docs` tutorials site. Per project direction, **these are NOT being fixed inside this docs effort** — they're surfaced here for the product team to triage.

Each entry: where it lives, what happens, impact on the docs flow, proposed disposition.

---

## Known before M0 started

### DB-001 — Self-Pickups missing from sidebar
- **Where:** `client/src/components/client-nav.tsx:42-66` (the `clientNav` array has 8 items; `/self-pickups` is not one of them).
- **What happens:** the route `/self-pickups` exists and renders, but nothing in the UI links to it. Users reach it only via the post-submit redirect when a self-pickup order is created.
- **Impact on docs:** self-pickup is explicitly out-of-scope for v1, so no immediate impact. Flag for when self-pickup tutorials land.
- **Disposition:** [ ] fix in portal   [ ] document around   [x] defer (parked with self-pickup revival)

### DB-002 — Signup "Back to Login" link points at `/login` which doesn't exist
- **Where:** `client/src/app/(auth)/signup/page.tsx:32` — `<Link href="/login" …>`.
- **What happens:** login is actually mounted at `/` (root). `/login` returns 404.
- **Impact on docs:** minor. The signup page exists only to tell users "accounts are admin-provisioned"; broken back-link is a bad detail but not a blocker for any of the 6 flows we're documenting.
- **Disposition:** [ ] fix in portal   [x] document around   [ ] defer

### DB-003 — No client-facing order cancellation
- **Where:** order detail page (`client/src/app/orders/[orderId]/page.tsx`) has no cancel button for CLIENT role; per `CLAUDE.md`, `CANCELLED` is Admin-only.
- **What happens:** clients cannot self-serve cancel an order after submission.
- **Impact on docs:** every tutorial that talks about "if you change your mind" has to say "contact your admin."
- **Disposition:** [x] document around   [ ] fix in portal   [ ] defer

### DB-004 — No in-app notifications / bell / tray
- **Where:** verified absent across `client/src/components/**` (no `NotificationCenter`, `bell`, `inbox`, `notification` etc.).
- **What happens:** clients rely entirely on email for status updates.
- **Impact on docs:** the "Emails You Receive" reference article has to double as the notifications guide, and the Order Page tutorial needs a "refresh to see status changes" callout.
- **Disposition:** [x] document around   [ ] fix in portal   [ ] defer

---

## Found during M0 smoke-test (2026-04-13)

### DB-005 — Scan activity photos do not render (API/component field mismatch) — **PORTAL BUG**
- **Where:** `client/src/components/scanning/scan-activity-timeline.tsx:112-140` (`getPhotoEntries`). Hook `useOrderScanEvents` in `client/src/hooks/use-scanning.ts:234-251` does no transformation.
- **What happens:** the API returns scan-event photos under the field **`event_media[]`** (confirmed via raw response on ORD-DEMO-004: `event_media: [{ url, note, media_kind, sort_order }, …]`). The component's photo extractor falls through three readers:
  1. `event.media` — **not set by the API**
  2. `event.damage_report_entries` / `event.damageReportEntries` — not set
  3. `event.photos` — not set
  Result: `getPhotoEntries` returns `[]` every time. **Zero photos render on any scan event**, even though the seed attaches 1–3 photos per event on placehold.co.
- **Impact on docs:** the entire Scan Activity flow (~18 screenshots) includes a Photos & Lightbox article that cannot be shot until this is fixed. The other scan-event info (type badge, Jordan Maxwell actor name, discrepancy reason, asset name, timestamp, condition) all renders correctly — verified via the component's defensive fallback chain.
- **Recommended fix:** one-line change in `scan-activity-timeline.tsx:113` — add `event.event_media` to the precedence chain:
  ```ts
  const mediaEntries = event.media || event.event_media;
  ```
  Safe forward-compat; doesn't remove existing readers. Would also benefit the admin portal if they share this component (check).
- **Disposition:** [x] **needs portal fix before Flow 6 (Scan Activity) can ship**   [ ] document around   [ ] defer

### DB-005b — Multi-asset scan events show only one asset in the header (degraded)
- **Where:** `scan-activity-timeline.tsx:211-220` reads `event.asset.name` (top-level convenience field) instead of iterating `event.event_assets[]`.
- **What happens:** for scans that cover multiple assets (e.g. the OUTBOUND on ORD-DEMO-004 covers 5 Event Chairs + 1 LED Screen), the header shows only one asset. The `event_assets[]` array with per-asset quantities is ignored in the render.
- **Impact on docs:** workable — the "Reading a scan entry" article can feature a single-asset scan (e.g. DERIG_CAPTURE or ON_SITE_CAPTURE) as its hero example. Worth mentioning in the "Scan types explained" article that each header summarizes the scan and that some events cover multiple assets.
- **Disposition:** [ ] fix in portal (iterate `event_assets` with quantities)   [x] document around   [ ] defer

### DB-007 — No seeded order with VAT > 0
- **Where:** all 6 demo orders return `vat.percent = 0`, so the "VAT (X%)" row never renders in `PricingBreakdown`.
- **What happens:** docs can't screenshot the VAT row as it would appear for a company that has VAT configured.
- **Impact on docs:** minor — the "Reading the Pricing Breakdown" article will show the VAT row via an inline MDX mock (static render of the same component with mock data) rather than via a real screenshot.
- **Disposition:** [x] document around (inline MDX mock)   [ ] fix in portal   [ ] defer

### DB-008 — `ORD-DEMO-001` is `PRICING_REVIEW`, not `SUBMITTED` — **resolved, keeping as reference**
- **What happens:** the demo seed creates the "just submitted" order directly in `PRICING_REVIEW`. In practice, `SUBMITTED → PRICING_REVIEW` is an automatic system transition, so this matches what a real client sees immediately after submitting.
- **Impact on docs:** none. The "What you see right after submitting" article will describe `PRICING_REVIEW` as the canonical post-submit state. ORD-DEMO-003 remains the `CONFIRMED` reference order for the Order Page tutorial.
- **Disposition:** [x] document around (treat `PRICING_REVIEW` as post-submit state)

---

## Summary

| # | Severity | Blocks v1? | Action |
|---|---|---|---|
| DB-001 | low | no | defer with self-pickup |
| DB-002 | cosmetic | no | document around |
| DB-003 | product decision | no | document around (tell users to contact admin) |
| DB-004 | product decision | no | document around (use email reference article) |
| **DB-005** | **portal bug** | **yes — Flow 6 (Scan Activity Photos)** | **needs 1-line fix** |
| DB-005b | degraded UX | no | document around |
| DB-007 | seed gap | no | inline MDX mock |
| DB-008 | none | no | document as-is |

Only **DB-005** (scan-activity photos not rendering) is a true blocker for a specific flow. Everything else is workable from docs alone.
