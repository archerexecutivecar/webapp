# RBAC Proposal — Nine-Role Permission Matrix (DRAFT, NOT APPROVED)

**Status:** Proposal only. `RBAC.md` remains the authoritative source (Admin / Driver / Client). Nothing in this file may be implemented or enforced until the project owner approves it and `RBAC.md` is updated to match (AGENTS.md rules 4 and 6; `AUDIT_REPORT_2026-10-28.md` §RBAC conflict).

**Derivation:** Admin capabilities in `RBAC.md` (rides, drivers, tiers, switches, fleet, pricing/rules configuration, payments, payroll, reporting, audit, operational settings) are split across the seven staff roles. Driver and Customer map to the existing Driver and Client roles. Content Editor/Publisher have no source in `RBAC.md`; the content permissions below are assumptions to confirm.

## Permission keys (proposed)

| Key | Meaning |
|---|---|
| `dashboard.view` | Admin dashboard summary |
| `users.manage` | Create/disable staff users, assign roles |
| `roles.manage` | Change role/permission assignments |
| `rides.view` / `rides.manage` | View / create-edit rides |
| `dispatch.manage` | Assign, reassign, broadcast rides |
| `drivers.view` / `drivers.manage` | View / onboard-edit drivers |
| `drivers.switches` | Change operating switches (Archer fleet, Client Car, Owner-operator) |
| `tiers.manage` | Driver tiers |
| `fleet.manage` | Vehicles, blockouts, service status |
| `pricing.manage` | Pricing/rules configuration (values only from approved rules package) |
| `payments.view` / `payments.manage` | View / refund-adjust payments |
| `payroll.view` / `payroll.manage` | View / run payroll and adjustments |
| `reports.view` | Reporting |
| `audit.view` | Read audit log |
| `settings.manage` | Operational settings |
| `content.edit` / `content.publish` | Draft content / publish content |
| `self.*` | Own profile, own rides/offers/earnings (ownership-scoped, never cross-user) |

## Matrix (✔ = granted; blank = denied by default)

| Permission | Super Admin | Ops Manager | Dispatcher | Driver Manager | Finance/Payroll | Content Editor | Content Publisher | Driver | Customer |
|---|---|---|---|---|---|---|---|---|---|
| dashboard.view | ✔ | ✔ | ✔ | ✔ | ✔ | | | | |
| users.manage | ✔ | | | | | | | | |
| roles.manage | ✔ | | | | | | | | |
| rides.view | ✔ | ✔ | ✔ | | ✔ | | | | |
| rides.manage | ✔ | ✔ | ✔ | | | | | | |
| dispatch.manage | ✔ | ✔ | ✔ | | | | | | |
| drivers.view | ✔ | ✔ | ✔ | ✔ | ✔ | | | | |
| drivers.manage | ✔ | ✔ | | ✔ | | | | | |
| drivers.switches | ✔ | | | ✔ | | | | | |
| tiers.manage | ✔ | ✔ | | ✔ | | | | | |
| fleet.manage | ✔ | ✔ | | | | | | | |
| pricing.manage | ✔ | ✔ | | | | | | | |
| payments.view | ✔ | ✔ | | | ✔ | | | | |
| payments.manage | ✔ | | | | ✔ | | | | |
| payroll.view | ✔ | | | | ✔ | | | | |
| payroll.manage | ✔ | | | | ✔ | | | | |
| reports.view | ✔ | ✔ | | | ✔ | | | | |
| audit.view | ✔ | ✔ | | | ✔ (financial events only) | | | | |
| settings.manage | ✔ | ✔ | | | | | | | |
| content.edit | ✔ | | | | | ✔ | ✔ | | |
| content.publish | ✔ | | | | | | ✔ | | |
| self.* (ownership-scoped) | | | | | | | | ✔ | ✔ |

## Open decisions (owner must answer before implementation)

1. Approve, or edit, every cell above. Does Super Admin bypass all checks, or only hold every listed key?
2. Is Operations Manager allowed `pricing.manage` and `settings.manage`, or are those Super Admin only?
3. Can Finance/Payroll read ride detail (`rides.view`) and driver records, and is `payments.manage` (refund/adjust) approved for Finance only?
4. Content: what content exists (website pages, FAQs, city pages, fleet copy)? Is Content Editor → Content Publisher a required two-step workflow?
5. Can one user hold multiple roles? (Proposal: yes, permissions are the union.)
6. Suspended/inactive staff: all access denied and tokens revoked (proposal), confirm.
7. Which dashboard metrics are approved? Rides, drivers, and payments tables do not exist yet, so "real database-backed" metrics need those schemas first. Proposal: dashboard v1 returns only metrics derivable from tables created in this module (staff users by role/status, recent audit events) and adds ride/driver/payment metrics as those modules land.
8. Password policy, token lifetime, and recovery-email provider for Hostinger (SMTP details provided through secure channel, never chat).
9. Admin UI source: no approved Admin UI exists in the repository. Provide the prototype/design (or confirm one is to be designed against `BRAND_SYSTEM.md`) before frontend work.

## Test obligations once approved (per `RBAC.md`)

For every privileged endpoint: allowed role, denied role, wrong resource owner, inactive/suspended user, malformed input, privilege-escalation attempt, audit event.
