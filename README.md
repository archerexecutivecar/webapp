# Archer Executive Services Platform

Production platform for Archer Executive Services: public website, customer portal, admin/dispatch, and the Laravel API that owns all business rules.

> **Engineering policy:** read [`AGENTS.md`](AGENTS.md) first. Laravel is authoritative for pricing, authorization, dispatch and audit. The Next.js apps are presentation layers and never duplicate business rules. If a rule or formula is missing or conflicting, stop and escalate; do not guess.

## Applications

| App | Path | Stack | Dev port | Live URL |
|---|---|---|---|---|
| Public website | `src/` | Next.js | 3000 | archerexecutivecar.com (staging: staging.archerexecutivecar.com) |
| Admin & dispatch | `apps/admin/` | Next.js | 3001 | admin.archerexecutivecar.com |
| Customer portal (PWA) | `apps/client/` | Next.js | 3002 | app.archerexecutivecar.com |
| API / domain core | `backend/` | Laravel (PHP) + MySQL | 8000 | api.archerexecutivecar.com |

Mobile apps (iOS / Android) are **coming soon**. Store links and the "coming soon" flag are controlled from Admin → Page Content → `settings`.

## What is built

**Website**
- Home, Services (6 pages), Tiers of Service, Fleet, and 5 booking request forms (general, airport, point to point, Client Car, Concierge, plus EA/PA profile and weekly plan).
- After a booking, customers are invited to sign in to the customer portal.
- Legal and compliance: Privacy, Terms, Cancellation, Cookies and Accessibility pages, cookie banner, `sitemap.xml`, `robots.txt`, branded 404.
- Content is **managed in Admin** and read from `GET /api/v1/site` (refreshed every 60 seconds). If the API is unreachable, pages fall back to built-in copy.
- Client reviews appear only when at least one active testimonial exists.

**Customer portal**
- Sign in with **"Email me a code"** or **"Set a password"** (the emailed code confirms the email and sets the password in one step). Returning customers with a password can sign in with it.
- Ride list, ride detail with progress tracker, account page.

**Admin & dispatch**
- Rides & dispatch, customers (with **reset password & sign out**), drivers, vehicles, tiers, service types, add-on security.
- Website content: **Testimonials, Page Content, Website Tiers, Website Fleet, Rates**.
- Rates require `pricing.manage`; every rate change is audit-logged with old and new values.

**API**
- Opaque bearer tokens, role/permission middleware (`config/rbac.php`), throttled public endpoints, idempotent booking submission, audit log.
- Email through SMTP or **Brevo's HTTP API** (see Configuration).

## Repository layout

```text
src/                 Public website (Next.js)
apps/admin/          Admin & dispatch (Next.js)
apps/client/         Customer portal PWA (Next.js)
backend/             Laravel API (app/, routes/api.php, database/, tests/)
docs/                Architecture, business rules, RBAC, pricing, QA, decisions
docs/database/       SQL scripts (site-content.sql for phpMyAdmin)
tools/               Deploy workflow templates
deploy/              Packaged builds used for manual deployment
```

## Local development

Requirements: PHP 8.3+, Composer, Node 20+, MySQL (WAMP is fine).

```bash
# API
cd backend
cp .env.example .env          # set DB_* and APP_KEY (php artisan key:generate)
composer install
php artisan migrate
php artisan db:seed --class=DatabaseSeeder        # roles and permissions (no users)
php artisan db:seed --class=SiteContentSeeder     # current website content
php artisan serve                                 # http://127.0.0.1:8000

# Website
cd src && npm install && npm run dev              # http://localhost:3000

# Admin
cd apps/admin && npm install && npm run dev       # http://localhost:3001

# Customer portal
cd apps/client && npm install && npm run dev      # http://localhost:3002
```

Point each Next.js app at the API with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1`.

### Demo customer (local/staging only)

```bash
php artisan db:seed --class=DemoCustomerSeeder
```

Creates `demo.customer@example.com` with three sample rides. The password is read from `DEMO_CUSTOMER_PASSWORD`, or generated and printed once. It refuses to run when `APP_ENV=production`. No credentials are stored in the repo.

## Configuration (environment)

Set on each server; never commit secrets.

| Variable | App | Purpose |
|---|---|---|
| `APP_ENV`, `APP_DEBUG=false`, `APP_KEY` | API | Must be set in production |
| `DB_*` | API | MySQL connection |
| `MAIL_MAILER` | API | `brevo` for production, `log` for local |
| `BREVO_API_KEY` | API | Brevo API key (server only). From-address must be a verified Brevo sender |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | API | e.g. `no-reply@archerexecutivecar.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Website, Admin, Portal | `https://api.archerexecutivecar.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Website | Public site origin (sitemap, metadata) |
| `NEXT_PUBLIC_CUSTOMER_PORTAL_URL` | Website | Portal link on the booking success page |
| `DEMO_CUSTOMER_PASSWORD` | API (non-production) | Optional demo password |

## Database

| Table | Purpose |
|---|---|
| `ride_requests`, `assistant_profiles` | Bookings and EA/PA profiles |
| `users`, `roles`, `permissions`, `api_tokens`, `login_codes` | Accounts, RBAC, sign-in |
| `audit_logs` | Operational and financial audit trail (`subject_id` is a string to hold UUIDs) |
| `site_tiers`, `site_vehicles`, `rate_cards`, `site_content` | Admin-managed website content and display rates |
| `cms_testimonials` | Client reviews (starts empty) |

Every schema change needs a migration. For hosts without shell access, `docs/database/site-content.sql` creates and seeds the website content tables in phpMyAdmin.

## Testing

```bash
cd backend && php artisan test
```

Covers booking, customer accounts and sign-in, RBAC, admin customers (including credential reset), site content and rates, testimonials, audit logging, Brevo mail and the demo seeder.

Known issue: 4 `NavigationTest` cases fail because they expect navigation entries (payments, media, SEO) that `config/navigation.php` does not define. These predate the website-content work.

Next.js type check: `npx tsc --noEmit` inside each app (the website has older unrelated errors in `header.tsx` and `services-menu.tsx`).

## Deployment

Workflow templates are in `tools/` (`deploy-api.yml`, `deploy-admin.yml`, `deploy-client.yml`, `deploy-frontend.yml`). See [`docs/DEPLOY_FILE_MANAGER.md`](docs/DEPLOY_FILE_MANAGER.md) for the manual file-manager route.

Release order: back up the database → run migrations → seed (`DatabaseSeeder`, `SiteContentSeeder`) → deploy API → Admin → Portal → Website → run `php artisan config:cache`. Confirm mail sends before opening to customers.

## Before go-live

- Replace every `[ARCHER TO CONFIRM]` note and fleet-photo placeholder with approved content.
- Confirm the seeded rates against the approved rules package (Tier 4 mid-size vs full-size hourly looks inverted).
- Add the real cancellation terms; have counsel review the legal pages.
- Confirm Square production credentials and webhook verification.
- Set `MAIL_MAILER=brevo` with a verified sender, and `APP_ENV=production`.
- Remove any sample testimonials left in a previously seeded database.

## Documentation index

`AGENTS.md` · `docs/ARCHITECTURE.md` · `docs/BUSINESS_RULES.md` · `docs/RBAC.md` · `docs/RIDE_STATE_MACHINE.md` · `docs/PRICING_RULES.md` · `docs/PAYROLL_RULES.md` · `docs/BRAND_SYSTEM.md` · `docs/INTEGRATIONS.md` · `docs/QA_STRATEGY.md` · `docs/DECISIONS.md` · `docs/DELIVERY_MAP.md` · `docs/API_FOUNDATION.md` · `docs/AUTH_RBAC_API.md`

Exact pricing, payment and payroll formulas come from the approved Archer rules/test package. When a source is missing or conflicting, stop and escalate.
