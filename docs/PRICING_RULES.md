# Archer Pricing Rules

## Rule
The pricing engine is authoritative in Laravel.

Frontend applications may display a quote returned by the API, but must never be the final calculator.

## Pricing inputs
Expected inputs include:
- chauffeur tier
- vehicle class
- vehicle size
- service type
- location/geography
- hours/duration
- security add-ons
- booking fee
- tax
- promotion/discount
- tip
- approved timing/wait/overtime rules

## Quote lifecycle
1. Client/Admin requests quote.
2. Laravel validates inputs and eligibility.
3. Laravel calculates quote using approved rules.
4. Quote response is returned with breakdown.
5. Booking stores the approved quote snapshot/lock.
6. Later rate changes must not silently alter an existing locked booking.
7. Closeout applies only approved post-booking adjustments such as overtime/wait rules.

## Financial representation
Use exact decimal/integer minor-unit representation appropriate to the currency. Avoid floating-point arithmetic for money.

## Prototype defaults
Current prototype defaults are documented in `BUSINESS_RULES.md`. They are not automatically final production rules.

## Required test categories
- each approved formula
- minimums
- boundaries
- service/geography transitions
- tier/class/size combinations
- promotion behavior
- booking fee
- tax
- card fee
- tip
- overtime
- wait fees
- quote locking
- rounding
- zero/negative/invalid inputs
- concurrency around quote/booking where relevant

## Never
- hardcode rates in React components
- calculate authoritative totals in browser JavaScript
- trust a client-submitted total
- silently invent a missing rate
