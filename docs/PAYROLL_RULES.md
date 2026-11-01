# Archer Payroll Rules

## Authority
Payroll calculations belong in Laravel and must use the approved Archer rules/test package.

## Inputs
Potential payroll inputs:
- completed rides
- driver role/type
- applicable driver pay
- security pay
- overtime/wait components where approved
- tips
- cash/card/Venmo reconciliation
- adjustments
- pay period
- owner-operator deductions/fees where applicable

## Requirements
- Payroll generation must be repeatable/idempotent.
- Adjustments must be auditable.
- Payout status must be explicit.
- Reconciliation must distinguish payment method.
- Never double-count a ride.
- Never create duplicate payout records from retried jobs.
- Financial mutations require authorization and audit.

## Owner-operator
Current baseline:
- client is billed under applicable ride pricing
- owner-operator receives fare less the applicable facilitation fee
- owner-operator receives 100% of tip
- prototype facilitation fee: $25/hour

Confirm exact payroll treatment against the approved rules package before production.

## Security payroll
Prototype security pay rates:
- T1: $30/hour
- T2: $40/hour
- T3: $50/hour

Treat as provisional until production rules are approved.

## Tests
- pay period boundaries
- duplicate generation
- adjustments
- cash/card/Venmo
- tips
- owner-operator
- security shifts
- cancellation/no-show treatment if applicable
- rounding
- authorization
- audit
