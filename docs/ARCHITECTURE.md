# Archer Architecture

## System boundary

```text
Archer Platform
├── Next.js Public Website
├── Next.js Admin / Operations
├── Next.js Client PWA
├── Next.js Driver PWA
│
└── Laravel API / Domain Core
    ├── Identity / Auth / Permissions
    ├── Rides
    ├── Dispatch
    ├── Drivers
    ├── Fleet
    ├── Pricing
    ├── Payments
    ├── Payroll
    ├── Security
    ├── Client Car
    ├── Notifications
    └── Audit
            ↓
       PostgreSQL
            ↓
    S3-compatible storage
```

## Authority
Laravel is the single source of truth for:
- authorization and permissions
- ride state transitions
- driver eligibility
- dispatch
- fleet availability
- pricing and quote locking
- owner-operator eligibility and compensation
- security workflows
- payments and financial state
- payroll
- Client Car Service gating
- audit events
- operational configuration

PostgreSQL is the system of record.

## Frontend rule
Next.js may:
- render screens
- manage local UI state
- orchestrate user workflows
- validate obvious UX input before submission
- consume typed API contracts

Next.js must not become authoritative for:
- prices
- totals
- taxes
- fees
- driver eligibility
- vehicle availability
- permissions
- ride state transitions
- payment state
- payroll

## Domain organization

Laravel should organize business logic into domain modules:
- Identity
- Driver
- Fleet
- Ride
- Dispatch
- Pricing
- Payment
- Payroll
- Security
- ClientCar
- Platform

Use services/actions/policies/value objects where they improve testability. Avoid a giant controller/service containing unrelated business policy.

## API principles
- REST resource naming.
- Request validation objects.
- Response resources/transformers.
- Pagination for collections.
- Stable error codes.
- Idempotency keys for financial mutations where appropriate.
- Transactions for multi-record state/financial transitions.
- Optimistic/pessimistic concurrency controls where required.
- Never expose raw privileged database records unnecessarily.

## Storage
Private documents must use private object storage with controlled access. Do not expose signed URLs or document identifiers without authorization checks.

## Environment separation
Use separate development, staging/UAT, and production environments. Production credentials must never be placed in source control or shared in chat.
