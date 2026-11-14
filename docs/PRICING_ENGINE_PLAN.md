# Pricing Engine Plan — one price everywhere

Status: **Draft for Archer approval** (2026-11-14). No formula in this plan is final until Archer signs off on the
open decisions in section 6 (AGENTS.md rules 4–6, PRICING_RULES.md).

## 1. Goal
One Laravel pricing engine produces every price. The website, the client app and Admin all ask it for a quote and
show exactly what it returns. Admin can set every rate and run "what will this customer pay?" simulations.

## 2. Today (what is wrong)
| Problem | Where |
|---|---|
| Estimates are calculated in browser JavaScript | `src/src/components/archer/v2/forms/pricing.ts`, `apps/client/src/lib/catalog.ts` |
| Hard-coded fallbacks: booking fee $10, stop $20, client-car and guard rates | `pricing.ts` (`FEE`, `STOP`, `CC`, `GUARD = CC`) |
| Guard rate falls back to the client-car table | `pricing.ts:45` |
| Ops tables hold prices nothing reads | `driver_tiers.multiplier`, `security_addons.hourly_rate` |
| Booking stores no quote, so later rate edits can't be traced to a ride | `ride_requests` has no quote snapshot |
| Passengers/bags are not checked against vehicle capacity | `PublicBookingController` |

## 3. Source of truth (decided 2026-11-14: "Website catalog wins")
| Concept | Table | Admin page |
|---|---|---|
| Services | `service_types` (slugs `hourly`, `airport`, `p2p`, `client`, `security`, …) | Service Types |
| Driver tiers 1–4 | `site_tiers` (kind `driver`) | Website Tiers |
| Security tiers 1–4 | `site_tiers` (kind `security`) | Website Tiers |
| Vehicles (class × size, capacity) | `site_vehicles` | Website Fleet |
| All money | `rate_cards` (+ new `pricing_fees`) | Rates |

Done already: bookings are rejected unless the tier and vehicle are active in Website Tiers / Website Fleet.
Next: retire Driver Tiers, Vehicles and Add-on Security admin pages (or make them read-only views) once nothing
depends on them; drivers move to `site_tiers` via a migration.

## 4. Pricing inputs → where each one lives
| Input | Effect on price | Stored in |
|---|---|---|
| Service | Picks which rate series applies | `rate_cards.kind` |
| Tier | Rate lookup key | `rate_cards.tier` |
| Vehicle class + size | Rate lookup key | `rate_cards.vehicle_class/size` |
| Hours | × hourly rate, with service minimum | `service_types.min_hours` |
| Passengers / bags | **Eligibility** (must fit vehicle capacity) — no surcharge unless Archer approves one | `site_vehicles.passengers/bags` |
| Stops | Fee per stop (free on hourly per current UI copy) | `pricing_fees` |
| Security add-on | guards × security tier hourly × hours | `rate_cards` kind `security_hourly` |
| Booking fee, tax, card fee, gratuity | Line items | `pricing_fees` |
| Airport / point-to-point distance | Flat per route, per mile, or zone — **undecided** | TBD |

## 5. Build steps
1. **Rules sign-off** — Archer answers section 6; answers recorded in `docs/business-rules/` (gate for steps 2+).
2. **`pricing_fees` table + migration** — booking fee, stop fee, tax %, card fee %, gratuity suggestion %; money in cents; audited.
3. **`QuoteService` in Laravel** — pure function `(inputs) → {lines[], subtotal, fees, tax, total, rule_version}`;
   integer cents only; rejects missing rates instead of guessing. Unit tests per formula, minimum, boundary, rounding.
4. **`POST /v1/quotes`** — public, rate-limited; returns the breakdown plus a signed `quote_id` valid N minutes.
5. **Booking locks the quote** — `ride_requests.quote_snapshot` (JSON) + `quote_total_cents`; server re-prices and
   compares, never trusts a client total. Later rate edits never change a locked booking.
6. **Website + client app** — booking forms call `/v1/quotes` (debounced) and render the returned lines; delete
   `pricing.ts` math and hard-coded fallbacks. "Your estimate" panel becomes the server breakdown.
7. **Admin → Rates** — one grid per service (tier × class × size), fees panel, change history, "effective from" date.
8. **Admin → Price simulator** — same form as the customer's, calls the same `/v1/quotes`, shows the full line-by-line
   breakdown and lets staff compare current vs draft rates before publishing.
9. **Playwright check** — same trip priced on website, client app and Admin simulator must show the same total.

## 6a. Decisions received 2026-11-14 (product owner)
| # | Answer | Built as |
|---|---|---|
| 1 | Airport / P2P: per mile or hourly | `pricing_settings.pricing_mode` per service; per-mile rates in `rate_cards` kind `per_mile` (inactive $0 until set) |
| 2 | Passengers and bags can change price, can be zero | `per_passenger_cents` / `per_bag_cents` beyond `included_*`; default $0 |
| 3 | Stops: no fixed fee or limit | `stop_fee_cents` (default $0), `max_stops` (default none) |
| 4 | Booking fee admin-set, can be zero | `booking_fee_cents` (kept at published $10) |
| 5 | Guards: admin sets hours rule and tier rate | `guard_hours_mode` ride/custom, `guard_min_hours`; `security_hourly` per tier (same value in all tiers = flat) |
| 6 | Tax and card fee admin-set | `tax_bp`, `tax_includes_fees`, `card_fee_bp` (default 0) |
| 8 | Client Car minimum admin-set | `min_hours` (kept at current 3) |
| 10 | Promotions/corporate: maybe | Not built; future change item |

**Still open:** #7 gratuity (kept as today: 20% of subtotal suggested, not in total) and #9 binding vs estimate
(kept as today: estimate, dispatch confirms). **New:** per-mile distance currently comes from the customer's input;
a server-side distance source (e.g. Google Distance Matrix) needs an approved provider + key.

## 6. Original questions
1. Airport and point-to-point: flat per route, per mile, zone, or hourly with minimum? Are the current `PP` rates per trip?
2. Do passengers or bags ever change the price, or only which vehicles can be picked?
3. Stops: $20 each on airport/P2P and free on hourly — confirm. Any cap?
4. Booking fee $10 — every service? Refundable?
5. Security add-on: billed for the same hours as the ride? Minimum hours? Price by security tier or flat $45?
6. Tax: which rate(s), and on which lines? Card processing fee passed to customer?
7. Gratuity: 20% suggested, excluded from total — confirm; on which subtotal?
8. Client-car service: hourly by tier only? Minimum 3 hours (current validation) or 4?
9. Is the estimate binding, or does dispatch still confirm the final price?
10. Promotions / corporate accounts in scope for launch?
