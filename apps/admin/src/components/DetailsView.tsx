'use client';

/**
 * Read-only view of saved form data (EA/PA profiles, booking request details). Shows every saved field:
 * known keys get friendly labels, unknown keys are still shown with a readable version of the key, so
 * nothing a customer submitted is ever hidden from staff.
 */

const LABELS: Record<string, string> = {
  // EA/PA profile
  about: 'About the assistant', company_info: 'Company', people: 'People they book for', billing: 'Billing',
  title: 'Title', office: 'Office', hours: 'Working hours', contact_method: 'Best way to reach', backup_name: 'Backup contact',
  backup_phone: 'Backup phone', backup_email: 'Backup email', industry: 'Industry', phone: 'Phone', address: 'Address', city: 'City',
  website: 'Website', arrival: 'Arrival instructions', booking_for: 'Booking for', name: 'Name', relationship: 'Relationship',
  mobile: 'Mobile', email: 'Email', home: 'Home address', airports: 'Usual airports', airlines: 'Airlines', companions: 'Usually travels with',
  vehicle: 'Vehicle', tier: 'Tier', preferences: 'Preferences', notes: 'Notes', notify: 'Ride updates to', security: 'Security',
  payer: 'Who pays', method: 'Payment method', contact: 'Billing contact', po: 'PO number', receipts: 'Receipts to', approval: 'Approval rules',
  // Booking request details
  service: 'Service', pickup_address: 'Pickup', dropoff_address: 'Drop-off', date: 'Date', time: 'Time', passengers: 'Passengers', bags: 'Bags',
  stops: 'Stops', guards: 'Guards', airline_flight: 'Airline / flight', terminal: 'Terminal / FBO', client_vehicle: "Client's vehicle",
  vehicle_class: 'Vehicle class', vehicle_size: 'Vehicle size', special_requests: 'Special requests', way: 'Trip', return_time: 'Return time',
  direction: 'Direction', airport: 'Airport', airline: 'Airline', flight_number: 'Flight number', checked_bags: 'Checked bags',
  carry_ons: 'Carry-ons', meet: 'Meet', return_trip: 'Return trip', sign_name: 'Name on sign', destination: 'Destination',
  frequency: 'How often', vehicle_make: 'Make', vehicle_model: 'Model', vehicle_year: 'Year', vehicle_color: 'Colour',
  key_handover: 'Key handover', vehicle_confirmed: 'Vehicle confirmed', occasion: 'Occasion', guests: 'Guests', area: 'Area',
  transport: 'Transport', itinerary: 'Itinerary', executive_name: 'Executive', executive_mobile: "Executive's mobile",
  rides: 'Rides this week', repeat: 'Repeat plan', company: 'Company', type: 'Ride type', from: 'From', to: 'To',
};
const RIDE_TYPES: Record<string, string> = { airport_in: 'Airport pickup', airport_out: 'Airport drop-off', p2p: 'Point to point', hourly: 'Hourly' };

const label = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const text = (k: string, v: unknown): string => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (k === 'vehicle' && typeof v === 'string') return v.replace('|', ' • ');
  if (k === 'type' && typeof v === 'string') return RIDE_TYPES[v] ?? v;
  if (Array.isArray(v)) return v.filter((x) => !isEmpty(x)).join(', ');
  return String(v);
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function Fields({ data, skip = [] }: { data: Record<string, unknown>; skip?: string[] }) {
  const entries = Object.entries(data).filter(([k, v]) => !skip.includes(k) && !isEmpty(v) && !isObj(v) && !(Array.isArray(v) && v.some(isObj)));
  if (!entries.length) return null;
  return (
    <div className="detail-grid">
      {entries.map(([k, v]) => (
        <div key={k} className="detail-item" style={String(v).length > 60 ? { gridColumn: '1 / -1' } : undefined}>
          <span className="detail-label">{label(k)}</span>
          <span className="detail-value" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text(k, v)}</span>
        </div>
      ))}
    </div>
  );
}

export function DetailsView({ data, skip = [] }: { data: Record<string, unknown> | null | undefined; skip?: string[] }) {
  if (!data) return null;
  const sections = Object.entries(data).filter(([k, v]) => !skip.includes(k) && (isObj(v) || (Array.isArray(v) && v.some(isObj))));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Fields data={data} skip={skip} />
      {sections.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="card-section-title">{label(k)}{Array.isArray(v) ? ` (${v.length})` : ''}</span>
          {Array.isArray(v)
            ? v.filter(isObj).map((item, i) => (
              <div key={i} style={{ borderTop: '1px solid var(--border, rgba(128,128,128,.2))', paddingTop: 8 }}>
                {k === 'rides' && <span className="row-title" style={{ display: 'block', marginBottom: 4 }}>Ride {i + 1}</span>}
                <Fields data={item} />
              </div>
            ))
            : <Fields data={v as Record<string, unknown>} />}
        </div>
      ))}
    </div>
  );
}
