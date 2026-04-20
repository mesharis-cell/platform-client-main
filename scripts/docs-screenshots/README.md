# Docs Screenshot Harness

Playwright-based capture pipeline for the public `/docs` tutorials site.
Produces deterministic, committed PNGs at
`client/public/docs/screenshots/<flow>/<article>/<n>-<label>.png` that
MDX articles reference via `<Screenshot src="..." />`.

## Why script-driven

Screenshots go stale the moment UI changes. A hand-captured library is a
full-rewrite every release. This harness lets us regenerate every image
in the tutorials from a fresh seed in one command, so docs stay accurate
without manual reshoots.

## Prereqs

1. **Test stack running** — the API is seeded and `dev:test` is live on
   port 9100 (see `api/test/README.md`). From the `api/` repo:

    ```bash
    bun run db:seed:test      # if you're coming off a test:e2e run
    bun run dev:test          # API on http://localhost:9100
    ```

2. **Client dev server wired to the test stack.** Copy the env template
   and start the client on port 4002:

    ```bash
    # in client/
    cp .env.docs.example .env.docs.local      # template for the shoot runner
    cp .env.docs.example .env.local           # Next.js reads .env.local at boot
    # edit .env.local — set
    #   NEXT_PUBLIC_API_URL=http://localhost:9100
    #   NEXT_PUBLIC_DEV_HOST_OVERRIDE=demo.kadence.test
    # (leave DOCS_CLIENT_* defaults as-is unless the seed changed)
    bun run dev
    ```

3. **Playwright browsers + system deps installed** (once per machine):

    ```bash
    bunx playwright install chromium
    # WSL / fresh Ubuntu: Chrome needs libgbm1 / libnss3 etc. — run once:
    sudo bunx playwright install-deps chromium
    ```

## Running

```bash
# Reseed if anyone ran bun run test:e2e against the DB since you last captured
cd ../api && bun run db:seed:test && cd -

# Make sure API and client dev server are both running, then:
bun run docs:shoot

# Or for a single shoot script during iteration:
bunx playwright test --config=playwright.docs.config.ts shoots/proof-dashboard.shoot.ts
```

Output PNGs land under `client/public/docs/screenshots/`. They're
committed to the repo so `/docs` pages render the same content for
everyone whether or not they have the harness set up.

## Directory layout

```
scripts/docs-screenshots/
├── fixtures/
│   ├── auth.setup.ts       # one-time login, writes .auth/alex-chen.json
│   ├── env.ts              # .env.docs.local reader with defaults
│   ├── highlight.ts        # CSS outline injector for "look here" emphasis
│   └── shoot.ts            # page.screenshot wrapper + path conventions
├── shoots/
│   └── proof-dashboard.shoot.ts   # M2 proof — expand during M3+
├── .auth/                  # storage state cache — gitignored
├── .output/                # Playwright traces — gitignored
└── README.md               # this file
```

## Annotations

Two mechanisms, used together:

- **Highlights** are baked into the PNG at capture time via
  `highlight(page, locator, { shape: "outline" })` — subtle primary-
  colour ring around the targeted element. Good for "this is the button."
- **Callouts** are rendered at display time by `<Screenshot>` in MDX via
  its `annotations` prop — numbered badges with caption text stay as
  code so they're easy to localise, edit, and diff without reshooting.

## Determinism

The seed uses a pinned epoch (`2026-04-01T00:00:00Z`) and fixed UUIDs
and order numbers. That means reshooting after a UI change produces diffs
for only the UI change — not "every ID in the DB rolled over".

## Troubleshooting

- **Login fails** — the seed has been wiped. Reseed.
- **PNG looks stale** — you rebuilt the client but forgot to reseed; or
  the test:e2e suite ran and truncated the demo orders. Reseed.
- **Playwright can't find elements** — you're shooting against a
  different tenant. Verify `.env.local` has
  `NEXT_PUBLIC_DEV_HOST_OVERRIDE=demo.kadence.test`.
- **Port conflict** — the docs API binds 9100 (`dev:test`), the smoke
  test API uses 6001. If your regular dev session is on 9100 already,
  override with `PORT=9200 bun run dev:test` on the API side and match
  `NEXT_PUBLIC_API_URL` in `.env.local`.
