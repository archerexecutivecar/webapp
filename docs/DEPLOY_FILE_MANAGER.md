# Deploying by file manager (no command line)

Four things ship: the **API** (Laravel), the **website**, the **admin**, and the new **customer app (PWA)**.
Order matters: database first, then API, then the three front ends.

## 0. Before anything
- Back up the production database and the current API folder.
- Decide the four addresses, for example `api.`, `www.`, `admin.`, `app.` (customer app). They go into the settings below.

## 1. Database (phpMyAdmin)
Import/run `backend/database/manual/2026_11_12_booking_and_customer_accounts.sql` once.
It adds the new columns/tables **and** records the three migrations in the `migrations` table, so a later
`php artisan migrate` will not repeat them. Do not run it if migrations were already run another way.

Confirm the customer role exists (accounts are created with it):

```sql
SELECT `key`, `name` FROM `roles` WHERE `key` = 'customer';
```
No row means the roles were never seeded on this database. Stop and ask before continuing.

## 2. API (Laravel)
Upload these files (same paths under `backend/`). Everything else is unchanged.

| Path | What it is |
|---|---|
| `app/Http/Controllers/PublicBookingController.php` | public booking + EA/PA profile intake |
| `app/Http/Controllers/Customer/CustomerAuthController.php` | emailed code sign-in, set password |
| `app/Http/Controllers/Customer/CustomerPortalController.php` | customer's own rides |
| `app/Http/Controllers/Admin/CustomerController.php` | admin Customers list/detail |
| `app/Models/AssistantProfile.php`, `LoginCode.php` | new models |
| `app/Models/RideRequest.php`, `User.php` | new fields and relations |
| `app/Support/CustomerAccounts.php` | creates the customer account at booking |
| `app/Providers/AppServiceProvider.php` | rate limits for public forms and codes |
| `routes/api.php` | new routes |
| `config/cors.php` | allows the `Idempotency-Key` header |
| `config/navigation.php` | adds Customers to the admin menu |
| `database/migrations/2026_11_12_*` (3 files) | for the record; already applied by the SQL above |

Then:
1. Delete the cached files in `bootstrap/cache/` (`config.php`, `routes-v7.php`, `services.php`, `packages.php`). Laravel rebuilds them. Without this the new routes and settings may not appear.
2. `vendor/` must already exist on the server. No new packages were added.
3. Edit the server `.env` (never upload your local one):

```
APP_URL=https://api.example.com
# Every front end that calls the API, comma separated, no trailing slashes
CORS_ALLOWED_ORIGINS=https://www.example.com,https://admin.example.com,https://app.example.com

# REQUIRED for customer sign-in codes. With MAIL_MAILER=log nobody receives a code.
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=no-reply@example.com
MAIL_FROM_NAME="Archer Executive"
```
4. Check `https://api.example.com/api/v1/health`.

## 3. Front ends
These are Next.js apps. The three `NEXT_PUBLIC_*` values are baked in **when the app is built**, so set them
before building, not on the server afterwards.

| App | Folder | Build-time settings |
|---|---|---|
| Website | `src/` | `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1` |
| Admin | `apps/admin/` | `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1` |
| Customer app | `apps/client/` | `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1` and `NEXT_PUBLIC_SITE_URL=https://www.example.com` |

- The website already has a packaging script (`src/scripts/package-deploy.mjs`) that produces a ready-to-upload bundle.
  The admin and customer app have no such script yet: upload their source and let the host's Node/Next.js
  preset run `npm install && npm run build`, or ask for packaging scripts to be added.
- Customer app must be served over **HTTPS** or browsers will not offer "install" and the service worker will not run.
- The admin links "Live Website" to a fixed `http://localhost:3000`; change it if you want it to open the real site.

## 4. Smoke test (about five minutes)
1. Website: make a Point to Point booking. You should get a reference like `P2P-XXXXXX`.
2. Admin: sign in, open **Rides & Dispatch** (the booking is there) and **Customers** (the person is there).
3. Customer app: enter the booking email, receive the code by email, sign in, see the ride.
4. Customer app: Account, add a password, sign out, sign in with email + password.

## Known limits at this release
- No live map or chauffeur location. Customers see a status timeline only (no location data exists yet).
- Prices on the website forms are display-only estimates; dispatch confirms the real price. The approved pricing rules still need to be implemented in Laravel.
- Card on file (Square) is not connected.
- Booking-confirmation emails are not sent; only sign-in codes are.
