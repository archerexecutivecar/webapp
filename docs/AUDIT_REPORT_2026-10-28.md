# Backend Readiness Audit — 2026-10-28

## Scope and sources reviewed

This audit reviews the current repository and the engineering source-of-truth documents listed in `README.md`, including `AGENTS.md`, architecture, business-rule, RBAC, state-machine, pricing, payroll, integration, QA, decision, and delivery-map documents. It also reviews the public Next.js implementation, Prisma schema, and all currently implemented route handlers.

This is an audit, not approval to invent missing operational or financial policy.

## 1. Current repository and application structure

The repository currently contains one Next.js 16 application at `src/`; it is not in the target monorepo layout (`apps/*`, `backend/laravel`, and `packages/*`) specified by `AGENTS.md`.

| Area | Current state |
| --- | --- |
| Public website | Implemented as a single Next.js App Router home page with Archer-branded component sections. |
| API | Four Next.js route handlers: `/api`, `/api/quote`, `/api/bookings`, and `/api/flight`. |
| Database | Prisma 6 with SQLite (`src/prisma/schema.prisma`) and one `Booking` model. |
| Laravel | Not present. There is no `backend/laravel`, `composer.json`, PHP test suite, migration set, or Laravel configuration. |
| Admin, Customer PWA, Driver PWA | Not present as routes or distinct applications. |
| Tests | No application test suite was found. The included shell scripts under `src/tests/` are runtime-oriented helper scripts, not feature or API tests. |
| CI/CD, deployment configuration | No GitHub Actions workflow, container compose configuration, or Laravel deployment configuration was found. |

The current Git repository has no commits on `master`; the parent directory is a separate repository boundary, so repository history cannot be used to establish implementation provenance.

## 2. Existing frontend routes and modules

### Public routes

Only the home route (`/`) is implemented. It composes marketing sections for the hero, services, chauffeur experience, airport/aviation, Client Car Service, fleet, city discovery, security, FAQ, footer, and a booking modal.

### Implemented client workflows

- Booking UI collects a request, then calls `POST /api/quote` and `POST /api/bookings`.
- Flight tracker calls `POST /api/flight`.
- WhatsApp links are used as a contact/booking escape path.
- State in the booking flow is transient Zustand client state; it is not an authenticated account or operational workflow.

### Stubbed or unsafe-for-production integrations

| Component | Evidence | Required disposition |
| --- | --- | --- |
| Quote API | Uses invented class rates, route hashing, fees, tax, and adjustments in `src/src/app/api/quote/route.ts`. | Retire/replace with Laravel quote endpoint only after the approved rules/test package is supplied. Do not carry formulas forward. |
| Booking API | Accepts browser-supplied `estimateTotal`, persists it as a `Float`, uses SQLite, and has no identity, authorization, availability, quote lock, audit, or idempotency controls. | Replace with authenticated/validated Laravel booking-request workflow and immutable server quote snapshot. |
| Flight API | Serves `SAMPLE_FLIGHTS` and intentionally simulates latency. | Keep explicitly demo-only or replace behind an approved, credentialed flight-data integration. |
| Content and fleet data | `archer-data.ts` contains hardcoded prototype/sample services, fleet, cities, airports, testimonials, contacts, and related content. | Move approved public content to a CMS/public API in a later controlled slice; do not treat sample values as production data. |

## 3. Existing Laravel status

Laravel is absent. PHP 8.2.26 is installed locally, but Composer is not installed or available on `PATH`; therefore a reproducible Laravel installation cannot currently be created in this environment.

No authorization, staff/customer/driver identity, policies, migrations, queues, audit records, storage abstraction, webhook verification, or Laravel test harness exists.

## 4. Database compatibility assessment

The current implementation uses SQLite and has not implemented either proposed production database. The approved architecture (`ARCHITECTURE.md` and ADR-003 in `DECISIONS.md`) declares PostgreSQL as the system of record. The pasted master brief proposes MySQL on Hostinger.

The project owner confirmed MySQL on 2026-10-28, and ADR-003 in `DECISIONS.md` now supersedes the earlier PostgreSQL decision. No production database migration should start until the actual Hostinger MySQL version, `sql_mode`, character set/collation, transaction/isolation support, JSON/index capabilities, connection limits, storage limits, backup/restore capability, and a migration rehearsal are verified.

If MySQL is approved, the Laravel schema should use portable migrations where possible, `decimal`/minor units for money, UTC timestamp storage, foreign keys, unique provider/idempotency keys, and indexes for operational queries. The existing SQLite `Booking.estimateTotal Float` is not suitable as a financial source of truth.

## 5. Hostinger deployment feasibility

Hostinger Business Web Hosting feasibility is **unverified**. The repository contains no account access, hosting plan specifications, PHP-extension inventory, MySQL version/limits, SSH/Composer availability, cron characteristics, queue worker capability, document-root controls, Node deployment constraints, or backup evidence.

Laravel may be feasible only if the host supports the approved PHP/Laravel version and extensions, Composer/SSH (or a controlled build/deploy process), a document root pointing exclusively to Laravel's `public/`, writable non-public storage/cache paths, cron, secure environment configuration, and a safe queue strategy. Long-running workers may not be viable on shared hosting; that decision must be based on host evidence rather than assumed.

No deployment or DNS changes are authorized by this audit. WordPress remains live under ADR-004.

## 6. Required backend modules and API contract groups

The following contract groups are justified by the reviewed documentation; their detailed fields and mutation semantics remain subject to the approved rules/handoff package.

| Module | Contract group | Critical server responsibilities |
| --- | --- | --- |
| Platform | `/api/v1/health`, authenticated profile, error format | health only; no private diagnostics. |
| Identity/RBAC | `/api/v1/auth`, staff/role administration | authentication, rate limits, policy checks, audit. |
| Customer | `/api/v1/customer`, `/api/v1/my-trips` | account isolation, profile, own-trip access/cancellation policy. |
| Booking/Pricing | `/api/v1/quotes`, `/api/v1/bookings` | approved calculation, quote locking, validation, availability recheck. |
| Dispatch/Rides | `/api/v1/admin/rides`, `/api/v1/driver/rides` | valid transitions, concurrency-safe allocation, status history, audit. |
| Drivers/Fleet | `/api/v1/admin/drivers`, `/api/v1/admin/fleet`, `/api/v1/driver` | eligibility, documents, availability, vehicle conflict protection. |
| CMS | `/api/v1/admin/cms`, `/api/v1/public/content` | draft/publish authorization, revision/audit, approved public fields only. |
| Finance | `/api/v1/admin/payments`, webhook endpoints, payroll routes | provider verification, idempotency, approved financial logic only. |

All collections require pagination/filtering, all mutations require request validation and authorization, and financial/dispatch mutations require transactions, idempotency or concurrency controls as applicable.

## 7. Proposed conceptual schema and relationships

This is a relationship inventory, not a migration specification. Exact fields and constraints must be driven by approved requirements.

```text
User ── 0..1 CustomerProfile
     ├─ 0..1 DriverProfile ── DriverDocument
     └─ Role / Permission

CustomerProfile ── Booking ── QuoteSnapshot
Booking ── Ride ── RideStatusHistory
Ride ── RideAssignment ── DriverProfile
Ride ── Vehicle
DriverProfile ── Availability / Eligibility / DriverVehicleEligibility
Vehicle ── ServiceBlockout / MaintenanceRecord

Ride ── PaymentTransaction / Tip / Closeout / PayrollEntry
WebhookEvent ── PaymentTransaction or Agreement

CmsPage ── CmsRevision
MediaAsset ── CmsPage or DriverDocument (private as applicable)
AuditEvent ── actor + auditable entity
```

The database must separately represent operational history, immutable quote/price snapshots, payment provider references, webhook idempotency records, and audit events. It must not overwrite historical ride, pricing, approval, or financial states.

## 8. RBAC and security gaps

The current application has no authentication, roles, policies, ownership checks, rate limiting, server-side authorization, secure document access, audit log, or webhook verification. `GET /api/bookings` exposes an unauthenticated aggregate count; while low sensitivity, it does not belong in a production public API without an explicit use case and authorization design.

The reviewed `RBAC.md` defines only Admin, Driver, and Client. The pasted brief additionally names Super Admin, Operations Manager, Dispatcher, Driver Manager, Finance/Payroll, Content Editor, and Content Publisher. This conflict must be resolved in the authoritative RBAC source before permissions are implemented.

## 9. Risks, unresolved decisions, and dependencies

### Blocking clarifications

1. **MySQL compatibility evidence:** confirm the actual Hostinger MySQL capabilities and complete a staging migration rehearsal.
2. **Rules/test package:** provide approved exact pricing, fees, taxes, quote expiry/locking, cancellation, booking notice, ride exception, payroll, rounding, and eligibility formulas/tests.
3. **RBAC source:** reconcile the three documented roles with the expanded role list in the master brief.
4. **External credentials/configuration:** provision Square, DocuSign, SMS/email, maps, object storage, and flight-data credentials through secure secret management; do not send credentials in chat or commit them.
5. **Hosting facts:** provide Hostinger plan capabilities and staging/deployment access evidence.
6. **Frontend boundaries:** confirm the target monorepo migration plan and whether this public Next.js application remains `apps/web` or is moved without history loss.

### Important risks

- Existing Next.js quote logic contains unapproved financial calculations and must never reach production authority.
- Existing booking flow has no authentication, server availability validation, quote lock, rate limit, or audit trail.
- `Float` is unsuitable for financial persistence.
- No source currently establishes production service coverage, fleet inventory, marketing copy, phone numbers, or flight data.
- The repo has no test/CI baseline and dependency installation is incomplete: `bun run lint` cannot locate ESLint.

## 10. Phased plan aligned to the delivery map

| Delivery weeks | Controlled backend outcome | Entry condition |
| --- | --- | --- |
| 1 | Confirm ADR/database, create Laravel in `backend/laravel`, health endpoint, CI, environment/deployment baseline, API conventions. | Database/hosting decision and Composer available. |
| 2 | Identity, authentication, reconciled RBAC, audit foundation. | Approved role matrix and auth/session decision. |
| 3–4 | Driver/fleet records, applications, basic rides, lifecycle/dispatch audit. | Approved eligibility and exception rules. |
| 5–6 | Fleet availability, approved pricing engine, preferred driver/broadcast/reassignment. | Exact pricing/availability rules and test vectors. |
| 7–8 | Ride clock, Square integration, closeout, payroll, Client Car/DocuSign. | Provider credentials plus approved financial/payroll rules. |
| 9–10 | Customer account, bookings, quote locks, My Trips, payments/history. | Customer policy, cancellation/notice rules, approved UX contracts. |
| 11–12 | Security hardening, deployment rehearsal, packaging support, UAT, launch handover. | Staging, monitoring, backups/recovery, UAT acceptance. |

Each item is a vertical slice: migration + model/service + policy + request/resource + audit + automated tests + frontend integration + reviewer/QA evidence.

## 11. Recommended first end-to-end vertical slice

After the database decision and Laravel tooling are unblocked, implement **Platform Foundation: unauthenticated API health/version endpoint**:

1. Create the Laravel application at `backend/laravel` without modifying the public website.
2. Add `GET /api/v1/health` with a stable, minimal response and a feature test.
3. Add API error response conventions, environment-safe configuration, CORS configuration limited to approved staging/local origins, and deployment documentation stubs.
4. Run Laravel tests and a clean frontend lint/build after dependencies are installed.

This slice contains no invented business policy, money calculations, roles, or production data. The next slice must be RBAC/audit only after the role conflict is resolved.

## Audit command results

- `php -v`: passed (PHP 8.2.26).
- `composer --version`: failed; Composer is unavailable on `PATH`.
- `bun run lint` in `src/`: failed because the `eslint` executable is not installed/available.

## Implementation update — Laravel foundation

Following owner confirmation that MySQL is the production database, a Laravel 12.70.2 application was created at `backend/laravel`. The foundation now contains the tested, versioned `GET /api/v1/health` liveness endpoint and MySQL configuration templates. No migration, model, business rule, production credential, or production database connection has been created or run.

Verification after implementation:

- `php artisan test`: passed — 3 tests, 4 assertions.
- `vendor/bin/pint --test`: passed.

