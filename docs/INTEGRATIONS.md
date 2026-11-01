# Archer Integrations

## Square
Purpose:
- payment collection
- payment status
- refunds where approved
- webhook-driven reconciliation

Requirements:
- verify webhook authenticity
- idempotently process events
- never trust client payment state
- store external IDs with uniqueness constraints
- log integration failures without leaking secrets

Production Square credentials must be provisioned securely.

## DocuSign
Purpose:
- Client Car Service agreements
- Driver/Client Responsibility Agreement

Requirements:
- agreement status must be server-authoritative
- dispatch must be blocked until required agreements are signed
- store only necessary metadata/status and secure document references
- webhook/event processing must be verified and idempotent where applicable

## SMS / OTP
Purpose:
- authentication and operational notifications where approved

Requirements:
- rate limit OTP attempts
- expire OTPs
- prevent replay
- do not log OTP secrets
- provider failures must be handled gracefully

## Email
Use for:
- authentication/support flows
- booking communications
- operational notifications where approved

## Maps / routing
Use only for approved address/routing/geographic functionality. API keys must remain server-side where possible.

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
All credentials/configuration must be injected via environment/secret management. Never commit secrets.
