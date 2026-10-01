# Personal Assistant

A single-user local web app for running a personal life: tasks and appointments,
habits and goals, home maintenance, travel, documents, gifts, memories, and a
financial picture spanning a portfolio, subscriptions and net worth.

Next.js 14 (App Router) · TypeScript · Prisma 7 on SQLite · Tailwind · SWR.

## Running locally

```bash
npm install
npx prisma migrate deploy   # apply any pending migrations
npm run dev
```

`npm run dev` reads the port from `config.json` (currently **4100**), so open
[http://localhost:4100](http://localhost:4100). The System page can change that
port; it takes effect on the next restart.

```bash
npm test          # vitest, 260 unit tests
npx tsc --noEmit  # type check
npx next lint     # lint
npm run build     # production build (runs lint + types)
```

All four are expected to pass clean. `npm run build` is the real gate — it catches
things `tsc --noEmit` alone does not, such as a client component reading
`useSearchParams()` without a Suspense boundary.

## Layout

```
src/app/            routes; src/app/api/**/route.ts holds all 85 API handlers
src/components/     one directory per feature area
src/lib/            shared logic — this is where the rules below live
prisma/schema.prisma
prisma/migrations/  hand-written SQL, applied with `prisma migrate deploy`
```

There is no server state beyond SQLite and no auth: the app assumes one trusted
user on one machine.

## Conventions

These exist because breaking them has caused real, silent bugs. Prefer the shared
helper over a local reimplementation every time.

### Dates are `YYYY-MM-DD` strings on the local calendar

Every user-entered date column is a `String`, never a `DateTime`. Parse with
`new Date(ymd + 'T00:00:00')` so it lands on local midnight, and format with
`toLocalYMD` from `src/lib/dateUtils.ts` — never `toISOString()`, which rolls back
a day east of UTC.

Compare dates by **calendar day**, not elapsed milliseconds: `daysBetween` and
`daysInclusive` use `Date.UTC` on the parsed fields so a DST transition inside the
window cannot add or drop an hour. A raw `(a - b) / 86400000` silently broke the
net-worth "vs 30 days ago" deltas for windows straddling a transition.

`Subscription.renewalDate` and `Snapshot.date` were the last `DateTime` holdouts
and were migrated in `20261001190000_date_strings_and_snapshot_unique`.

### Money and recurrence have one implementation each

| Need | Use | Not |
|---|---|---|
| Format EUR | `fmtEur(n, decimals?)` — `netWorthUtils` | a local `Intl.NumberFormat` |
| Holding market value | `holdingValue(h)` | inline `price * qty` |
| Holding P&L / cost basis | `holdingPnl(h)`, `holdingCostBasis(h)` | anything touching `buyPrice` directly |
| Subscription per month / year | `normalizeToMonthly`, `normalizeToYearly` | `period === 'yearly' ? … : …` |
| Assets, liabilities, net worth | `computeNetWorth({holdings, entries, subscriptions})` | a local sum |
| Next occurrence of a recurrence | `addInterval(ymd, interval)` | hand-rolled month math |

`buyPrice` is the **total paid** for a position, not a per-unit price — the form
input is labelled "Total buy price". Treating it as per-unit reported a +50%
position as −85%.

`addInterval` returns `string | null`. `null` means the interval is unrecognised
or the date unparseable, and callers **must** skip scheduling rather than fall
back to the input date — returning it unchanged made recurring appointments due
today forever. Valid intervals are in `RECURRING_INTERVALS`.

A two-way `yearly ? : ` branch on a subscription period silently bills
`quarterly` at three times its real cost. There are three periods, not two.

### API routes

Wrap handlers in `route()` from `src/lib/apiUtils.ts`. It turns a thrown Prisma
error into a meaningful status with a JSON `{error}` body instead of an unhandled
rejection and an HTML 500 page — `P2025` → 404, `P2002` → 409, `P2003`/`P2014` →
409.

```ts
export const dynamic = 'force-dynamic'   // every route here is DB-backed

export const PUT = route(async (req, { params }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid id')

  const missing = requireFields(await req.json(), ['name', 'cost'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)
  // ...
})
```

- `parseId` rejects anything that is not a positive integer. Bare
  `Number(params.id)` yields `NaN` for `/api/goals/abc`, which reaches Prisma and
  throws a 500.
- `parsePositiveInt(raw, 1)` for counts: `Number('')` is `0`, so a cleared
  quantity input used to zero out a row's contribution to every total.
- **A PUT that omits a field must preserve the stored value**, using
  `x !== undefined ? x : existing.x`. `done ?? false` un-completed a finished task
  on any edit, because the edit forms don't send `done`.
- Collection GETs that feed widgets accept `?fields=summary` to return only the
  reduced-over fields instead of every row with its relations inlined.

### Client

Import `fetcher` from `src/lib/fetcher.ts` for SWR, and `mutateJson` for writes;
both throw on a non-2xx. Do not inline `fetch(url).then(r => r.json())` — it
cannot distinguish success from a 500, whose HTML error page surfaces as
`SyntaxError: Unexpected token '<'`.

SWR defaults live in `src/components/SWRProvider.tsx` (`revalidateOnFocus: false`,
30s deduping). Gate a widget's SWR key to `null` when the widget is hidden rather
than fetching unconditionally.

Use `ui/Modal` (which has a `width` prop) for dialogs. If a layout genuinely needs
its own backdrop, call `useEscapeKey` from `ui/useModalDismiss` — otherwise the
dialog won't close on Escape while every other one does.

Batch per-row fetches. `GET /api/habits/logs?habitIds=1,2,3` exists because one
request per habit row is an N+1 over HTTP.

## Database

SQLite at `prisma/dev.db`, accessed through the better-sqlite3 adapter. Note that
Prisma stores `DateTime` as **ISO-8601 text**, not epoch integers — relevant when
writing migration SQL (`date(col, 'localtime')`, not `unixepoch` arithmetic).

Migrations are hand-written SQL under `prisma/migrations/`. For a destructive one,
dry-run it against a copy first:

```bash
cp prisma/dev.db /tmp/test.db
sqlite3 /tmp/test.db < prisma/migrations/<name>/migration.sql
```

Back up before migrating; the System page writes archives to `backups/`.

## Testing

Vitest in a node environment, with `@` aliased to `src`. Tests cover the pure
logic in `src/lib` — date and recurrence math, money formulas, request-parsing
helpers. Modules that are only Prisma calls are deliberately untested rather than
mocked.

When fixing a bug, write the failing test first. Several of the bugs above were
invisible precisely because the existing tests passed exact-UTC-midnight dates,
which hid every timezone error; prefer an explicit local time like
`new Date('2026-06-15T12:00:00')` in a date test.

## Autostart on Ubuntu

To have the app start automatically when you log in, create a **systemd user service**.

### Option A — systemd user service (recommended)

1. Create the service file:

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/personal-assistant.service << 'EOF'
[Unit]
Description=Personal Assistant web app
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/than/PersonalAssistant
ExecStart=/bin/bash -c 'PORT=$(node -p "require(\"./config.json\").port || 3000") npx next dev -p $PORT'
Restart=on-failure
Environment=NODE_ENV=development

[Install]
WantedBy=default.target
EOF
```

2. Enable and start it:

```bash
systemctl --user daemon-reload
systemctl --user enable personal-assistant
systemctl --user start personal-assistant
```

3. Verify it's running:

```bash
systemctl --user status personal-assistant
```

4. To view logs:

```bash
journalctl --user -u personal-assistant -f
```

> **Note:** For `systemctl --user` services to persist after logout, run once:
> `sudo loginctl enable-linger $USER`

### Option B — GNOME autostart (desktop entry)

If you use GNOME and prefer a lighter approach, create an autostart `.desktop` file:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/personal-assistant.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Personal Assistant
Exec=bash -c 'cd /home/than/PersonalAssistant && PORT=$(node -p "require(\"./config.json\").port || 3000") npx next dev -p $PORT'
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

This runs on login and is stopped when you log out. No persistence between sessions.

### Stopping the service (Option A)

```bash
systemctl --user stop personal-assistant
systemctl --user disable personal-assistant  # remove from autostart
```
