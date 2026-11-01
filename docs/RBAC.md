# Archer Roles & Permissions

## Roles

### Admin
Full operational control within assigned admin scope:
- rides
- drivers
- tiers
- switches
- fleet
- pricing/rules configuration
- payments
- payroll
- reporting
- audit
- operational settings

### Driver
Only capabilities applicable to the authenticated driver:
- profile/onboarding completion
- eligible ride offers
- accept/decline
- assigned ride details
- ride status transitions
- closeout
- applicable earnings information

### Client
- authentication
- eligible service discovery
- booking
- payment/customer history
- upcoming/live/past trips
- cancellation where allowed
- rating
- profile/settings

## Driver operating switches
Driver permissions/switches include:
- Archer fleet operator
- Client Car operator
- Owner-operator

These are server-authoritative flags. Do not allow a frontend user to self-assign eligibility.

## Authorization rules
- Every privileged API endpoint must enforce authorization.
- UI hiding is not authorization.
- Never accept role/permission claims from the client as authoritative.
- Policies/guards should be tested directly.
- Admin-only switches and sensitive configuration changes require explicit authorization and audit.
- Sensitive documents require authorization before access.
- Cross-client/cross-driver data access must be prevented.

## Testing
For each privileged endpoint/action:
- allowed role
- denied role
- wrong resource owner
- inactive/suspended user where applicable
- malformed input
- attempted privilege escalation
- audit event
