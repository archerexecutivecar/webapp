# Archer open items — QA report 2026-11-13

Status: **OPEN** · Raised: 2026-11-14 · Owner: Archer (business/ops/legal) · Engineering contact: platform team

Engineering has finished everything in the QA report that does not need a business decision. The items below are blocked on Archer. Per AGENTS.md rules 4–6 and 13, engineering will not guess any of them.

Pricing questions (BUG-008/009/012/020/025) are in `PRICING_ESCALATION_2026-11-14.md`.

## A. Content Archer must supply (can be entered in Admin — no developer needed)

| Bug | Where | What we need | Where to enter it |
|---|---|---|---|
| BUG-004 | /tiers | Final Tier 4 credentials/assignments copy (placeholder is in live admin content, not in the seed) | Admin → Site tiers |
| BUG-005 | /fleet | Passengers and bags for all 6 vehicles | Admin → Site vehicles (new Passengers / Bags fields) |
| BUG-006 | /fleet | Photos for Chevrolet Traverse, Lincoln Aviator, Executive Sprinter | Admin → Site vehicles |
| BUG-010 | /services/client-car (×2) | Insurance wording (legal) | Admin → Service pages |
| BUG-014 | /services/hourly, /airport | Advance notice period (spec default 48 h — confirm) | Admin → Service pages |
| BUG-015 | /services/airport | Are tolls/airport fees included in the airport price? | Admin → Service pages |
| BUG-016 | /services/point-to-point | How trips outside NJ are priced (also needed for the pricing engine) | Admin → Service pages + pricing package |
| BUG-017 | /services/assistants (×2) | Corporate billing policy | Admin → Service pages |
| BUG-018 | /fleet, /services/hourly | Wi-Fi availability per vehicle class | Admin → Fleet page / Service pages |
| BUG-026 | /services/client-car | Client vehicle eligibility limits | Admin → Service pages |
| BUG-028 | /services/concierge | Concierge planning lead time | Admin → Service pages |

Check before launch: `php artisan site:placeholders` must report **no placeholders**. The test `SitePlaceholderTest` tracks the remaining seed placeholders by bug id.

## B. Decisions Archer must make

| Bug | Question | Options |
|---|---|---|
| BUG-022 | Gratuity: some pages say "not included", others "suggested and added at checkout". Which is the policy? | (a) Optional, not added (b) 20% suggested, pre-filled at checkout, editable — BUSINESS_RULES.md lists "20% suggested tip" as a prototype default |
| BUG-023 | Do the 4 security services get their own pages with pricing and booking? | Post-launch build vs keep homepage section |
| BUG-024 | Should the homepage show a 6th service card (e.g. EA/PA planning)? | Yes (which) / No |
| BUG-027 | Is Google/Apple sign-in approved for the client app (Attachment A §14 "where approved")? | Yes → needs Apple/Google developer accounts / No |
| BUG-029 | Footer copyright: "© 2026" or "© 2024–2026"? | |
| BUG-020 | Tier 4: call-only, or bookable online? (also in pricing escalation) | |
| BUG-012 | Sedan vehicle class (also in pricing escalation) | |

## C. Deploy notes for the team
- Staging must be redeployed for the website and client-app fixes to show (the footer link fix is already in the repo; staging is running an older build).
- Run the new migration `2026_11_15_000001_add_capacity_to_site_vehicles`.
- Change the Tier 4 label to "TIER 4 · ARMED" in Admin → Site tiers, or re-run `SiteContentSeeder` (warning: the seeder overwrites admin-edited content).
