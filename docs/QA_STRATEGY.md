# Archer QA Strategy

## Test layers

### Unit/domain
Test Laravel business rules in isolation:
- pricing
- dispatch eligibility
- fleet availability
- ride transitions
- owner-operator
- security credentials
- payroll
- payment state handling

### Feature/API
Test:
- authentication
- authorization
- validation
- resources
- state transitions
- idempotency
- concurrency
- audit

### E2E
Critical end-to-end path:
Admin → Driver → Ride → Closeout → Payment → Payroll

Also cover:
- Client booking → quote lock → trip
- preferred driver → decline/timeout → broadcast
- fleet conflict
- Client Car agreement gate
- mobile critical flows

### Mobile
Validate:
- PWA installability/behavior where applicable
- touch targets
- responsive layouts
- network interruptions
- auth/session persistence
- packaged iOS
- packaged Android

## Required business test matrix

| Area | Required coverage |
|---|---|
| Pricing | Formula, boundary, minimum, promo, fee, tax, quote lock |
| Dispatch | Tier match, preferred driver, decline, timeout, broadcast, reassignment |
| Fleet | Overlap, 60-min buffer, blockout, service status, class/size, concurrency |
| Owner Operator | Fallback, qualification, fee, tip, audit |
| Security | Credential states, overlap, swaps, rates, payroll |
| Client Car | Agreement gate, walk-around, condition records |
| Payments | Success, failure, retry, webhook, refund, duplicate event |
| Payroll | Pay period, cash/card/Venmo, adjustments, payout state |
| RBAC | Every privileged endpoint/action |
| E2E | Admin → Driver → Ride → Closeout → Payment → Payroll |
| Mobile | PWA + packaged iOS/Android critical workflows |

## Regression policy
Every bug fix should include a regression test when practical.

Business-critical defects should not be marked fixed without:
- reproduction
- test coverage
- root cause
- affected workflows reviewed

## Release gates
Before UAT:
- automated suite passes
- no critical security defects
- no known financial calculation defects
- no broken authorization
- migrations tested
- monitoring/logging available
- seed/test data prepared

Before production:
- UAT acceptance complete
- production credentials configured securely
- backups/recovery plan confirmed
- payment webhooks verified
- app-store package/device testing complete
- rollback/recovery plan documented
