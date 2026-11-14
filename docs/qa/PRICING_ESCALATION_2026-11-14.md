# Pricing escalation — QA report 2026-11-13 (BUG-008, BUG-009, BUG-012, BUG-025)

Status: **OPEN — waiting on Archer** · Raised: 2026-11-14 · Policy: AGENTS.md rules 4–6, ADR-009

No approved rates/test package exists in `docs/`. `PRICING_RULES.md` says prototype values "are not automatically final production rules". Engineering will not change any rate until Archer answers the questions below.

## 1. What was fixed without a rate decision

**BUG-008 (Tier 4 card $215 vs grid $190)** was a display bug, not a data bug.
The tier cards on `/tiers` took their "starting at" price from the Executive *sedan-size* column (Chevrolet Traverse). The grid on the same page shows the Executive/1st Class *SUV* columns. At Tiers 1–3 the sedan size is the cheapest, so nothing looked wrong; at Tier 4 the sedan size ($215) costs more than the SUV ($190).

Fix: the card now shows the lowest published hourly rate for that tier across all classes and sizes (`tierMinimums()` in `src/src/lib/site-api.ts`). With today's rate card this gives $70 / $90 / $130 / $190 — the same as before for Tiers 1–3, and $190 for Tier 4. No rate changed.

## 2. Questions for Archer (blocking)

### Q1 — Tier 4 vehicle-size order (BUG-009)
Current hourly rate card (`backend/database/seeders/SiteContentSeeder.php`, `rate_cards` table):

| Hourly | T1 | T2 | T3 | **T4** |
|---|---|---|---|---|
| Executive · "sedan" size (Chevrolet Traverse) | 70 | 90 | 130 | **215** |
| Executive · SUV (Chevrolet Suburban) | 80 | 100 | 140 | **190** |
| Executive · van (Mercedes-Benz Sprinter) | 175 | 195 | 235 | 390 |
| 1st Class · "sedan" size (Lincoln Aviator) | 80 | 100 | 140 | **235** |
| 1st Class · SUV (Cadillac Escalade) | 100 | 120 | 160 | **210** |
| 1st Class · van (Executive Sprinter) | 225 | 245 | 285 | 475 |

At T1–T3 the smaller vehicle is $10 cheaper. At T4 it is $25 more expensive, in both classes.
**Archer to confirm:** are the T4 "sedan"-size rates ($215 / $235) correct, or should they follow the T1–T3 pattern? Please supply the approved T4 values.

### Q2 — Is there a Sedan class? (BUG-012)
Attachment A §7 lists sizes as *Sedan/Compact SUV, SUV, Sprinter*. The system's "sedan" size is filled by mid-size SUVs (Traverse, Aviator); no actual sedan is offered.
**Archer to confirm:** is the Traverse/Aviator the intended vehicle for the "Sedan/Compact SUV" size? If yes, we will relabel the size; if no, supply the sedan vehicles and their rates.

### Q3 — Point-to-point rates for other sizes (BUG-025)
P2P has rates for "sedan" size and SUV only. Vans are "Hourly only".
**Archer to confirm:** is Sprinter P2P intentionally unavailable? Should the P2P service page show the sedan-size fares as well as SUV?

### Q4 — Tier 4 bookable online? (BUG-020)
`/tiers` shows Tier 4 as "Call to book", but the website `/book` form and client app accept Tier 4 online.
**Archer to confirm:** which is correct?

## 3. Change item — rates are duplicated in five places (CHG-2026-11-14-01)

Same rate table is hardcoded in:

1. `backend/database/seeders/SiteContentSeeder.php` → `rate_cards` table (served by the public site API) — **should be the only source**
2. `src/src/components/archer/v2/forms/pricing.ts` (website booking estimate)
3. `src/src/components/archer/v2/fleet-page.tsx` (fallback when the API is down)
4. `apps/client/src/app/book/page.tsx` (client app estimate)
5. `backend/database/seed-data/services.json` (service page rate cells, as text)

Also, `src/src/app/api/quote/route.ts` returns hash-based "example" prices with different class rates (95 / 145 / 235) and is still called by `booking-flow.tsx` and `booking-panel.tsx`.

This breaks `PRICING_RULES.md` ("never hardcode rates in React components", "never calculate authoritative totals in browser JavaScript") and is how pages can drift apart. Once Q1 is answered, an admin edit to `rate_cards` will **not** reach the booking forms or the client app.

Proposed work (needs scheduling; not started):
- Laravel quote endpoint that calculates from `rate_cards` with tests (minimums, fees, tier/class/size combinations) — requires the approved formula package for fees, stops, minimums and tax.
- Website and client app booking forms call that endpoint instead of local tables.
- Service page rate cells generated from `rate_cards`, not stored as text.
- Remove or retire `src/src/app/api/quote`, and check whether `booking-flow.tsx` / `booking-panel.tsx` are still rendered anywhere (not verified).

## 4. After Archer answers
- Update `SiteContentSeeder.php` rates **and** the live `rate_cards` rows (admin or a data migration — re-running the seeder overwrites admin-edited content).
- Add a backend test that, for every tier, the smaller size in a class is not priced above the larger one (if Archer confirms that rule).
- Re-check `/tiers`, `/fleet`, `/services/*`, website `/book` and client `/book`.
