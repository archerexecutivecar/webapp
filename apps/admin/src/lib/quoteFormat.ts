/**
 * Formats a server quote (POST /admin/pricing/simulate) into the same estimate rows the website and client app show.
 * Wording only; every number comes from the Laravel pricing engine. Keep in sync with src/src/lib/quote.ts.
 */

export type QuoteLine = { code: string; label: string; unit_cents: number; per: string; amount_cents: number; quantity: number; quantity_unit: string; guards: number | null; note?: string };
export type Quote = {
  lines: QuoteLine[]; subtotal_cents: number; booking_fee_cents: number; stops: number; included_stops: number; stop_fee_cents: number; is_from_price: boolean;
  tax_cents: number; tax_bp: number; card_fee_cents: number; card_fee_bp: number; total_cents: number;
  gratuity_suggested_cents: number; gratuity_suggested_bp: number; rule_version: string;
};

export const usd = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

const PER: Record<string, string> = { 'per hour': '/hr', 'per mile': '/mi', 'per guard-hour': '/hr', each: ' each' };
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

function rateLabel(l: QuoteLine): string {
  if (l.per === 'per trip') return 'Trip fare';
  const rate = `${usd(l.unit_cents)}${PER[l.per] ?? ` ${l.per}`} × ${l.quantity} ${l.quantity_unit}`;
  const label = l.guards ? `${plural(l.guards, 'guard')} × ${rate}` : rate;
  return l.note ? `${label} (${l.note})` : label;
}

/** Note under the total, matching the design's wording per service. */
export function stopsNote(quote: Quote): string {
  if (quote.stop_fee_cents === 0) return 'Stops are free on this booking. ';
  return `${quote.included_stops ? `${quote.included_stops === 1 ? 'One stop' : `${quote.included_stops} stops`} on your way ${quote.included_stops === 1 ? 'is' : 'are'} included; e` : 'E'}ach additional stop is ${usd(quote.stop_fee_cents)}. `;
}

export function quoteRows(quote: Quote): [string, string][] {
  const find = (code: string) => quote.lines.find((l) => l.code === code);
  const rows: [string, string][] = [];
  const base = find('base');
  if (base) rows.push([rateLabel(base), usd(base.amount_cents)]);
  const stops = find('stops');
  rows.push(['Stops', quote.stops === 0 ? 'None'
    : quote.stop_fee_cents === 0 ? `${quote.stops} (free)`
    : `${quote.stops} (${Math.min(quote.stops, quote.included_stops)} included${stops ? `, ${stops.quantity} × ${usd(stops.unit_cents)} = ${usd(stops.amount_cents)}` : ''})`]);
  const security = find('security');
  rows.push(['Add-on security', security ? `${rateLabel(security)} = ${usd(security.amount_cents)}` : 'None']);
  for (const [code, label] of [['passengers', 'Extra passengers'], ['bags', 'Extra bags']] as const) {
    const l = find(code);
    if (l) rows.push([label, `${l.quantity} × ${usd(l.unit_cents)} = ${usd(l.amount_cents)}`]);
  }
  rows.push(['Booking fee', quote.booking_fee_cents ? usd(quote.booking_fee_cents) : 'None']);
  if (quote.tax_cents) rows.push([`Tax (${quote.tax_bp / 100}%)`, usd(quote.tax_cents)]);
  if (quote.card_fee_cents) rows.push([`Card fee (${quote.card_fee_bp / 100}%)`, usd(quote.card_fee_cents)]);
  rows.push(['Gratuity', quote.gratuity_suggested_bp ? `${quote.gratuity_suggested_bp / 100}% suggested, not included` : 'Not included']);
  return rows;
}
