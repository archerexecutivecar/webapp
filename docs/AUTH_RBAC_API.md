# Auth, RBAC & Admin Dashboard API (v1)

Base path `/api/v1`. Matrix source: `docs/RBAC_PROPOSAL_9_ROLES.md` (approved 2026-10-29) → `backend/config/rbac.php` → seeded into MySQL by `php artisan db:seed`. **TODO:** fold the approved matrix into `RBAC.md` (still lists only Admin/Driver/Client).

## Response envelope
- Success: `{ "data": ..., "meta": {...}? }`
- Error: `{ "error": { "code": "...", "message": "...", "details": {...}? } }`
- Codes: `VALIDATION_FAILED` 422, `INVALID_CREDENTIALS` 401, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `INVALID_RESET_TOKEN` 422, `TOO_MANY_REQUESTS` 429, `INTERNAL_ERROR` 500 (no internals leaked).

## Endpoints
| Method & path | Auth | Notes |
|---|---|---|
| `POST /auth/login` | none, 5/min per email+IP | `{email,password}` → `{token,token_type,expires_at,user{roles,permissions}}`. Unknown user, bad password and suspended user all return the same 401. |
| `POST /auth/logout` | Bearer | Revokes only the presented token. |
| `GET /auth/me` | Bearer | Roles/permissions are computed server-side. |
| `POST /auth/password/forgot` | none, 3/min | Always `202` (no account enumeration). Link: `ADMIN_APP_URL/reset-password?token=..&email=..`. |
| `POST /auth/password/reset` | none, 3/min | Password: min 12, mixed case, number, confirmed. Revokes all of the user's tokens. |
| `GET /admin/dashboard` | Bearer + `dashboard.view` | Users by status/role, 24h login counts, recent audit events (only with `audit.view`; Finance/Payroll sees `payment.*`/`payroll.*` events only). |

## Design notes
- Tokens: 64-char opaque bearer; only SHA-256 is stored; TTL `API_TOKEN_TTL_MINUTES` (default 480); rejected if expired or user not `active`. No Sanctum dependency (Composer is not required for the module).
- Permissions are the union across a user's roles; a suspended user has none.
- `users.status` and roles are not mass assignable.
- Audit (`audit_logs`, append-only; Eloquent update/delete throws): `auth.login`, `auth.login_failed`, `auth.logout`, `auth.password_reset_requested|password_reset|password_reset_failed`, `access.denied`, `user.created`. Secrets/emails are never logged in clear (emails hashed).
- Dashboard v1 intentionally has no ride/driver/payment metrics: those tables belong to later modules.
- First Super Admin: `php artisan archer:create-super-admin you@domain.com` (password is prompted, never an argument).

## Local MySQL
The server default engine on this WAMP install is MyISAM, which silently ignores foreign keys. `config/database.php` forces `'engine' => 'InnoDB'`; verify the same on Hostinger.

## Hostinger Business Hosting — staging deployment
Hostinger capabilities (PHP version/extensions, SSH, Composer, MySQL version, cron) are **unverified** (AUDIT_REPORT §5). Check each step against the real plan first.

1. **Prerequisites:** PHP ≥ 8.2 with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `ctype`, `tokenizer`, `xml`; SSH access; MySQL (note version and `sql_mode`).
2. **Database (hPanel → Databases):** create `archer_staging` DB + dedicated user with a generated password. Confirm InnoDB, `utf8mb4`.
3. **Upload** `backend/` to e.g. `~/archer-api/` (outside `public_html`; git pull over SSH, or upload a zip built from the repo, never including `.env` or `vendor` from your PC unless Composer is unavailable on the host).
4. **Install deps** (SSH): `composer install --no-dev --optimize-autoloader`. If Composer is unavailable, run it locally with the same PHP version and upload `vendor/`.
5. **Web root:** point the API subdomain (e.g. `api-staging.<domain>`) document root to `~/archer-api/public`. If hPanel cannot, symlink `public_html/<subdomain>` → `~/archer-api/public`. Never expose the Laravel root.
6. **Environment:** `cp .env.example .env`, then set: `APP_ENV=staging`, `APP_DEBUG=false`, `APP_URL`, `ADMIN_APP_URL`, `DB_*` (staging credentials entered on the server only), `SESSION_DRIVER=database`, `CACHE_STORE=database`, `QUEUE_CONNECTION=sync` (no worker assumed), `MAIL_*` from hPanel SMTP (credentials via secure channel). Run `php artisan key:generate --force`.
7. **Migrate and seed:** `php artisan migrate --force` then `php artisan db:seed --force` (rehearse rollback once: `migrate:rollback`, re-migrate).
8. **Create first admin:** `php artisan archer:create-super-admin <email>`.
9. **Optimize:** `php artisan config:cache && php artisan route:cache`; ensure `storage/` and `bootstrap/cache/` are writable.
10. **Cron (if available):** `* * * * * php ~/archer-api/artisan schedule:run`.
11. **Verify:** `GET /api/v1/health` → 200; login → dashboard → logout; unauthenticated dashboard → 401; run the staging checklist in `QA_STRATEGY.md` (migrations tested, logging available).
12. **CORS/HTTPS:** force HTTPS; the Admin origin must be allowed explicitly once the Admin app is deployed (not configured yet).
13. **Rollback:** keep a DB export before each migrate (hPanel backup/phpMyAdmin); `migrate:rollback` only for the latest batch.
