# Security Operations — linkage & CRUD rules (CHG-2026-11-19)

Status: **founder-directed working assumptions**. No approved rules package covers Security Phase 2 (leads,
contracts, shifts, swaps, credentials, announcements). The product owner asked for the "best possible logic".
Everything below is enforced on the server in `SecuritySuiteController` / `App\Support\Security\ShiftEligibility`
and covered by `SecuritySuiteTest`. Items marked **CONFIRM** need sign-off before relying on them commercially.

## Lifecycle
Website security request / manual entry → **Lead** → (convert) → **Contract** → generated **Shifts** →
**Assignment** (eligible driver) → optional **Swap** → completed. **Credentials** gate eligibility.
**Announcements** reach drivers through their notification feed.

## Leads
- Created automatically from a website booking with `service = security` (linked to the ride request), or manually by staff.
- Statuses: `new → contacted → in_progress → converted | lost`. `converted` can only be set by the convert action
  (creates a contract, stores `contract_id`). A converted lead cannot be deleted or moved back.
- Delete allowed only while `new`, `contacted`, `in_progress` or `lost`.

## Contracts
- Convert from a lead prefills client, contact and site. Statuses: `active`, `cancelled`, `completed`.
- Shifts are generated for every allowed weekday in `length_days` (max 90), **one shift per guard slot** (`headcount`).
  Shifts starting within **14 days** are `open`; later ones are `not_released_yet` and are released daily by
  `security:release-shifts`. **CONFIRM** the 14-day release horizon (previously an unexplained 14-day/7-day cap).
- Times are interpreted in `America/New_York` and stored in UTC (`starts_at`, `ends_at`).
- Cancel: unassigned shifts are cancelled; assigned future shifts are cancelled and the drivers notified.
- Delete: only when no shift was ever assigned.

## Shifts / assignment eligibility (server-enforced)
A driver may be assigned only if all hold:
1. Driver exists and `is_active`.
2. Driver `service_tier` ≥ shift tier number (T1..T4). **CONFIRM** that the chauffeur tier is the guard clearance level.
3. No credential on file for that driver is `suspended`, or expired on the shift date.
4. No other assigned shift overlaps the shift window (rides are not considered; they have no duration). **CONFIRM**.
Assignment, unassignment and cancellation notify the driver (Driver Notifications).

## Swaps
- A swap needs an `assigned` shift in the future and an eligible target driver (same rules as assignment);
  one pending swap per shift; the shift becomes `swap_pending`.
- Approve (transactional, eligibility re-checked): shift moves to the target driver, status `assigned`.
  Deny / withdraw: shift returns to `assigned` with the original driver. A decided swap is final (409).

## Credentials
- Linked to a real driver (`driver_id`); name is derived from the driver. Effective status is computed:
  `suspended` (manual) > `expired` (date passed) > `renewal_due` (≤ 30 days) > `valid`. **CONFIRM** the 30-day window.
- Impacted shifts = the driver's future assigned shifts falling on/after the expiry date or while suspended.
  The system flags them; it never auto-unassigns (dispatcher decides).

## Announcements
- Author is the signed-in staff member. Posting fans out to every active driver as a Driver Notification.
  Edit/delete change the record only; already-delivered notifications are not recalled.

## Audit
Every create/update/delete/convert/assign/decision writes an audit log entry.
