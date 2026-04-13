# Docs Blockers

Running log of portal issues encountered while building the public `/docs` tutorials site. Per project direction, **these are NOT being fixed inside this docs effort** — they're surfaced here for the product team to triage.

Each entry lists where it is, what happens, why it matters for docs, and a proposed disposition (fix in portal / document around / defer).

---

## Known before M0 started

### DB-001 — Self-Pickups missing from sidebar
- **Where:** `client/src/components/client-nav.tsx:42-66` (the `clientNav` array has 8 items; `/self-pickups` is not one of them).
- **What happens:** the route `/self-pickups` exists and renders, but nothing in the UI links to it. Users reach it only via the post-submit redirect when a self-pickup order is created.
- **Why it matters for docs:** self-pickup is explicitly out-of-scope for v1, so no immediate impact. Flag for when self-pickup tutorials land.
- **Disposition:** [ ] fix in portal   [ ] document around   [x] defer (parked with self-pickup revival)

### DB-002 — Signup "Back to Login" link points at `/login` which doesn't exist
- **Where:** `client/src/app/(auth)/signup/page.tsx:32` — `<Link href="/login" …>`.
- **What happens:** login is actually mounted at `/` (root). `/login` returns 404.
- **Why it matters for docs:** minor. The signup page exists only to tell users "accounts are admin-provisioned"; broken back-link is a bad detail but not a blocker for any of the 6 flows we're documenting.
- **Disposition:** [ ] fix in portal   [x] document around   [ ] defer

### DB-003 — No client-facing order cancellation
- **Where:** order detail page (`client/src/app/orders/[orderId]/page.tsx`) has no cancel button for CLIENT role; per `CLAUDE.md`, `CANCELLED` is Admin-only.
- **What happens:** clients cannot self-serve cancel an order after submission.
- **Why it matters for docs:** every tutorial that talks about "if you change your mind" has to say "contact your admin."
- **Disposition:** [x] document around   [ ] fix in portal   [ ] defer

### DB-004 — No in-app notifications / bell / tray
- **Where:** verified absent across `client/src/components/**` (no `NotificationCenter`, `bell`, `inbox`, `notification` etc.).
- **What happens:** clients rely entirely on email for status updates.
- **Why it matters for docs:** the "Emails You Receive" reference article has to double as the notifications guide, and the Order Page tutorial needs a "refresh to see status changes" callout.
- **Disposition:** [x] document around   [ ] fix in portal   [ ] defer

---

## Found during M0 smoke-test (2026-04-13)

### DB-005 — Scan events API returns nested shape; timeline component may expect flat
- **Where:** API response from `GET /client/v1/order/{id}/scan-events` — see example shape below. Timeline renders via `client/src/components/scanning/scan-activity-timeline.tsx`.
- **What happens:** API returns nested objects (`scanned_by_user.name`, `asset.name`, `event_assets[]`, `event_media[]`). My earlier review of the timeline component (before running the stack) noted references to flat fields (`actor_name`, `asset_name`, `photos`). If the component was not updated to consume the nested shape, every scan entry will show the placeholder `System` as the actor and no asset name despite the seed setting them to "Jordan Maxwell" / real asset names.
- **Why it matters for docs:** the entire Scan Activity tutorial flow (~18 screenshots) hinges on the timeline rendering readable content. If actors/assets silently display as empty, screenshots are useless.
- **What I need to verify in M2+:** render the timeline against ORD-DEMO-004 and check that "Jordan Maxwell", "Event Chair (batch)", "LED Screen #1" actually appear. If they don't, this flips from a docs-blocker to a portal bug requiring fix before the Scan Activity flow can be shot.
- **Sample API response** (for future reference):
  ```json
  {
    "scan_type": "DERIG_CAPTURE",
    "scanned_by_user": { "name": "Jordan Maxwell" },
    "asset": { "name": "Event Chair (batch)" },
    "event_assets": [{ "asset": { "name": "..." }, "quantity": 5 }],
    "event_media": [{ "url": "...", "note": "...", "media_kind": "DERIG" }]
  }
  ```
- **Disposition:** [ ] fix in portal   [ ] document around   [x] verify at M2 render time

### DB-006 — `BASE_OPS` system line shows label only (no amount) in client pricing breakdown
- **Where:** API response `order_pricing.breakdown_lines` — the `BASE_OPS` / "Picking & Handling" line arrives with `total: null`. `PricingBreakdown.tsx:75-77` filters out lines with null/undefined totals, so the label appears without a price.
- **What happens:** the quote shows "Basic Assembly · 187.50 AED", "Loading / Unloading · 225.00 AED", then "Picking & Handling (7.030 m³)" with no number beside it, then "Subtotal · 500.38 AED" (which includes the hidden BASE_OPS amount).
- **Why it matters for docs:** the "Reading the Pricing Breakdown" tutorial needs to explain this or clients will ask "why is there an unpriced line?" Either the API should emit the per-line total for BASE_OPS or docs need a callout clarifying that base ops is rolled into the subtotal.
- **Disposition:** [ ] fix in portal (emit BASE_OPS total)   [x] document around (callout in pricing tutorial)   [ ] defer — check with product; if decision is "it's by design", document-around stands.

### DB-007 — No seeded order with VAT > 0
- **Where:** all 6 demo orders return `vat.percent = 0`, so the "VAT (X%)" row never renders in `PricingBreakdown`.
- **What happens:** docs can't screenshot the VAT row as it would appear for a company that has VAT configured.
- **Why it matters for docs:** minor — the "Reading the Pricing Breakdown" article should still show the VAT row, either by (a) temporarily seeding an order with VAT > 0 for a single shot, (b) mocking a VAT order specifically for docs, or (c) using a rendered mock inline in the MDX.
- **Disposition:** [ ] ask other agent to add a VAT order to seed   [x] render an inline mock in MDX   [ ] defer — defaulting to (b) unless it turns out weird in practice.

### DB-008 — ORD-DEMO-001 is `PRICING_REVIEW`, not `SUBMITTED`
- **Where:** demo seed creates the "just submitted" order in the `PRICING_REVIEW` state directly.
- **What happens:** the "What you see right after submitting" article would ideally include a pure `SUBMITTED` screenshot where no review has begun yet. The seed skips that transient state.
- **Why it matters for docs:** `SUBMITTED → PRICING_REVIEW` is an automatic system transition per CLAUDE.md; in practice a real client may never see their order in `SUBMITTED`. Documenting `PRICING_REVIEW` as the post-submit state is actually more accurate. Minor — may not be a blocker at all.
- **Disposition:** [x] document around — treat `PRICING_REVIEW` as the canonical post-submit state in docs; if product wants a `SUBMITTED` shot, seed can add one later.
