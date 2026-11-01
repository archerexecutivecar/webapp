# Archer Business Rules

## Source-of-truth hierarchy
1. Signed/approved Archer rules/test package — exact formulas and business rules.
2. Approved Developer Handoff Specification — functional requirements and acceptance expectations.
3. Approved prototype — UX/screen/interaction intent.
4. Approved brand guide — visual identity and design system.
5. Approved milestone checklist — release acceptance.
6. Engineering judgment — technical implementation only where policy is unaffected.
7. Agent assumption — never acceptable for business policy.

If the approved rules/test package is unavailable for a formula, do not invent one.

## Product
Chauffeur tiers:
- Essential
- Executive
- Elite
- Armed

Vehicle classes:
- Executive
- 1st Class

Vehicle sizes:
- Sedan / Compact SUV
- SUV
- Sprinter

Services include:
- Hourly
- NJ point-to-point
- NJ airport
- Airport Transfer
- Client Car Service
- Security add-ons
- Dynamic services configured via Admin Panel

### Service Management Rule (ADR-011)
- Admins can add, edit, activate/deactivate, and reorder service types dynamically via the Admin Panel (`/services`).
- Adding or editing any service type must be performed in an interactive **Right Slide-over Sidebar Drawer** (not a centered modal or popup) to maintain page context and provide an executive creation workflow.
- All service additions/mutations are validated and persisted in Laravel (`service_types` table) with soft deletion so that past rides are never orphaned.

## Prototype/configurable defaults
These are planning/prototype defaults, not automatically final production policy:
- 48-hour booking notice
- 24-hour cancellation window
- $5 booking fee
- 6.625% sales tax
- 3.5% card fee + $0.15
- 20% suggested tip
- 4-hour hourly minimum
- 3-hour Client Car minimum
- $25/hour owner-operator facilitation fee

Do not hardcode these as immutable policy until approved.

## Ride lifecycle
Expected lifecycle:
New → Broadcast → Accepted → On My Way → At Your Doorstep → Ride Started → Ride Ended → Close Out → Completed

Cancellations, reassignment, declines, timeouts, and exceptional transitions must be explicitly represented and audited. Do not invent undocumented transitions.

## Dispatch
- Preferred driver receives first offer when selected.
- Decline or timeout can trigger broadcast to the applicable tier.
- Driver eligibility is determined server-side.
- Assignment must be concurrency-safe.
- Reassignment must preserve audit history.
- No eligible driver must produce an explicit operational state/error rather than silently assigning an unqualified driver.

## Fleet
Prototype fleet:
- 2 Escalades
- 1 Suburban
- 1 Traverse
- 1 Aviator
- no Sprinter

A 60-minute buffer between bookings is part of the current prototype/business baseline and must be enforced server-side if confirmed for production.

Availability considers:
- booking overlap
- buffer
- blockouts
- service status
- class/size compatibility

## Owner-operator fallback
Only use owner-operator fallback when:
1. No qualifying Archer vehicle of required class/size is available.
2. The employee-owned vehicle qualifies.
3. Required registration/commercial insurance/permission requirements are satisfied.

Client billing remains the same as the applicable ride pricing. Owner-operator receives fare minus the applicable facilitation fee and 100% of tip. Current prototype facilitation fee is $25/hour and remains subject to approval.

## Ride clock
Support the approved rules for:
- wait fees
- minimum hours
- overtime
- airport transfer timing
- automatic hourly conversion when leaving NJ

Exact formulas must come from the approved rules/test package.

## Security
Security capabilities include:
- lead flow
- contracts/shifts
- recurring shifts
- team builder
- credential states
- shift swaps
- security payroll

Credential state baseline:
- >30 days: Active
- ≤30 days: Renewal warning
- ≤7 days: Pickup suspended
- Expired: Fully blocked

Security prototype rates:
- Bill: $45 / $60 / $75 hourly for T1 / T2 / T3
- Pay: $30 / $40 / $50 hourly for T1 / T2 / T3

Treat these as prototype values until the approved production rules package confirms them.

## Client Car Service
Client vehicle record should include:
- make/model/year
- plate
- color
- keys
- parking notes

Dispatch must be blocked until:
- a client vehicle exists
- required Service Agreement is signed
- required Driver/Client Responsibility Agreement is signed

DocuSign is the explicitly requested e-signature direction unless the approved project decision changes it.

Driver workflow:
1. Walk-around before start.
2. Record existing damage/condition.
3. Start service.
4. Drive.
5. Drop off.
6. Record end condition.
7. Close out.

## Financial closeout
Conceptual closeout:
Booked fare + overtime - promo + booking fee + tax + tip = customer total

Archer profit:
Customer total - card fee - driver pay - security pay = Archer profit

These are conceptual expressions from the approved baseline; exact calculation order, rounding, and exclusions must come from the approved rules/test package.

## Payments
Square is the required payment direction from the current scope. Production provider/credentials must be confirmed before live processing.

Support:
- card
- approved admin-only cash
- approved admin-only Venmo
- reconciliation
- payment/refund state
- webhook verification/idempotency

## Notifications
Operational notifications should be generated from backend events/queues, not manually duplicated across frontends.

## Audit
Audit:
- who
- what
- when
- entity
- previous state/value where appropriate
- new state/value where appropriate
- source/action
- relevant request/reference ID

Never silently overwrite important operational history.
