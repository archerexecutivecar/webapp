# Archer Integrations

## Stripe (payments)
Purpose:
- payment collection
- payment status
- refunds where approved
- webhook-driven reconciliation

Configuration:
- Admin → Integrations settings (`GET/PUT /api/v1/admin/integrations`) stores publishable keys in plain text and encrypts secret keys / webhook secrets at rest.
- Public client config: `GET /api/v1/integrations/public` returns only `google_maps_browser_key`, `stripe_publishable_key`, and `payment_provider` (never secrets).
- Webhooks: `POST /api/v1/webhooks/stripe` (Stripe-Signature verified, idempotent via `stripe_webhook_events`).

Requirements:
- verify webhook authenticity
- idempotently process events
- never trust client payment state
- store external IDs with uniqueness constraints
- log integration failures without leaking secrets

Production Stripe credentials must be provisioned securely (Admin Integrations UI or environment variables).

### Square (historical)
Square was the prior documented payment direction. It is superseded by Stripe per ADR-006 (CHG-2026-11-18).

## Google Maps / Places & Live Tracking
Purpose:
- Address autocomplete on public booking flows and client booking PWA
- Admin-configured country code restrictions and service territory bounds
- Real-time live chauffeur tracking for customers with route directions & dynamic ETA
- One-tap turn-by-turn navigation redirection (Google Maps, Apple Maps, Waze) for chauffeurs

Configuration:
- **Browser key** (`google_maps_browser_key`): publishable; exposed via `/api/v1/integrations/public` for client map and autocomplete widgets.
- **Server key** (`google_maps_server_key`): secret; encrypted at rest; server-side geocoding/routing only.
- **Country codes** (`google_maps_country_codes`): comma-separated ISO country codes (e.g. `us`, `us,ae`) restricting autocomplete suggestions.
- **Service Area & Geofence** (`google_maps_service_area_label`, `center_lat`, `center_lng`, `radius_km`, `strict_bounds`): defines center coordinates and radius for location biasing or strict boundary enforcement.

## DocuSign
Purpose:
- Client Car Service agreements
- Driver/Client Responsibility Agreement

Requirements:
- agreement status must be server-authoritative
- dispatch must be blocked until required agreements are signed
- store only necessary metadata/status and secure document references
- webhook/event processing must be verified and idempotent where applicable

Integration keys are managed in Admin → Integrations settings (`docusign_*` fields).

## SMS / OTP
Purpose:
- authentication and operational notifications where approved

Requirements:
- rate limit OTP attempts
- expire OTPs
- prevent replay
- do not log OTP secrets
- provider failures must be handled gracefully

Provider and API key are configured in Admin → Integrations settings (`sms_provider`, `sms_api_key` encrypted).

## Email
Use for:
- authentication/support flows
- booking communications
- operational notifications where approved

## Maps / routing
Use only for approved address/routing/geographic functionality. API keys must remain server-side where possible (see Google Maps above).

## Apple App Store / Google Play
Archer owns publisher accounts. Engineering handles:
- build configuration
- packaging
- assets/metadata preparation
- device testing
- submission support
- reasonable resubmission support

Store approval/timing is controlled by Apple/Google and cannot be guaranteed.

## S3-compatible storage
Use for private documents/assets that require controlled access. Never make sensitive documents public by default.

## Environment variables
All credentials/configuration must be injected via environment/secret management or Admin Integrations settings (encrypted fields). Never commit secrets.

Fallback environment variables (optional):
- `STRIPE_WEBHOOK_SECRET` — used when webhook secret is not stored in the database (webhook handler only).