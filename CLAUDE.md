\# My Lads



Local business directory (JustDial-style). Next.js 16 App Router, Prisma 7, Supabase Postgres.



Repo: `github.com/s4marth-tech/Justdial`, branch `main`.



\## Domain model



\- 3 categories: Lawyers, Accountants, Doctors

\- 4 cities: Delhi, Noida, Ghaziabad, Faridabad

\- Every `Business` row carries a `Specialty` — a sub-classification under its category (e.g. Cardiologist under Doctors)



`Specialty` is a \*\*controlled vocabulary\*\*, not free text. The 30 valid terms are defined in the `SPECIALTIES` block in `prisma/seed.ts`. Do not introduce a specialty string that isn't in that block, and do not let a form or importer write one. If a new specialty is genuinely needed, add it to `SPECIALTIES` first.



\## Dashboards



| Route | Audience | Scope |

|---|---|---|

| `/account` | Customer | Profile, password, notifications, claims, delete |

| `/dashboard` | Business owner | Manage listings, leads inbox |

| `/admin` | Admin | Approve businesses, review claims (`/admin/claims`), all leads (`/admin/leads`) |



Three separate audiences with different auth expectations. When touching a page, confirm which dashboard it belongs to before assuming what the user is allowed to see.



\## Where things live



\- `src/lib/queries/business.ts` — search and filter logic

\- `src/lib/actions/\*.ts` — server actions (business, lead, claim)

\- `src/components/search-filters.tsx`, `src/components/business-form.tsx` — cascading category → specialty Selects

\- `src/lib/cities.ts` — 57-city geolocation, haversine distance

\- `prisma/import-scraped.ts` — Apify / Google Maps scrape importer; matches by `searchString` → category

\- `prisma/backfill-specialty.ts` — one-off specialty tagging for existing rows



\## Gotchas



These have each cost real debugging time. Read them before touching the relevant area.



\*\*Prisma seeding.\*\* Prisma 7 uses `@prisma/adapter-pg`, and `prisma.config.ts` is what loads dotenv. Run the seed as `npx prisma db seed`. Running `npx tsx prisma/seed.ts` directly skips the config load and fails with ECONNREFUSED — the database is fine, the env just isn't there.



\*\*`base-ui/react` Select.\*\* `onValueChange` has the signature `(value: string | null, ...) => void`. The value is nullable — coalesce with `?? ""` or you will write nulls into state.



\*\*Verifying Select contents.\*\* Select popup content is portal-rendered and never appears in SSR HTML, whether the dropdown is open or not. Dialog behaves the same way. Do not curl the page and grep for option text to check whether a dropdown is populated — it will always look empty. Check the compiled JS, or exercise the filter behavior directly.



\*\*Turbopack.\*\* Known local filesystem-cache-corruption bug. `turbopackFileSystemCacheForDev: false` is already set in the config. Leave it off.



\*\*Hydration warnings.\*\* Console hydration mismatches are browser-extension DOM injection (Grammarly, Bitdefender), not app bugs. `suppressHydrationWarning` is already applied to `html` and `body` in `src/app/layout.tsx`. That is as far as suppression goes — don't chase these, and don't add more suppression trying to silence them.



\## Conventions



\- Category and specialty must stay consistent: a specialty is only valid under its own category. The cascading Selects enforce this in the UI; server actions and importers must enforce it too.

\- The importer maps scraped rows to categories via `searchString`. Any new scrape source needs its `searchString` values mapped, or rows land uncategorized.

