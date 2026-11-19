/** Simple mark for a service tile. The label next to it comes from the catalog. */
export function ServiceMark({ href = "", kind }: { href?: string; kind?: string }) {
  const key = kind || href;
  const worship = key === "worship";
  const office = key === "office";
  const corporate = key === "corporate";
  const privateEvent = key === "private";
  const daycare = key === "daycare";
  const school = key === "school";
  const production = key === "production";
  const retail = key === "retail";
  const venue = worship || office || corporate || privateEvent || daycare || school || production || retail;
  const tier1 = key === "tier-1";
  const tier2 = key === "tier-2";
  const tier3 = key === "tier-3";
  const tier4 = key === "tier-4";
  const tierMark = tier1 || tier2 || tier3 || tier4;
  const airport = key.includes("airport");
  const security = key.includes("security");
  const account = key.includes("account");
  const event = key === "event";
  const staff = key === "staff";
  const transport = key === "transport";
  const client = key.includes("client");
  const point = key.includes("p2p") || key.includes("point");
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {worship && (
        <>
          <path d="M4 20h16" />
          <path d="M6 20V10l6-6 6 6v10" />
          <path d="M12 4V2" />
        </>
      )}
      {office && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
        </>
      )}
      {corporate && (
        <>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      )}
      {privateEvent && (
        <>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 10v9h12v-9" />
        </>
      )}
      {daycare && (
        <>
          <circle cx="12" cy="6" r="2" />
          <path d="M8 20v-2a4 4 0 0 1 8 0v2" />
          <path d="M5 12h2M17 12h2M6 9l1.5 1.5M18 9l-1.5 1.5" />
        </>
      )}
      {school && (
        <>
          <path d="M3 10 12 5l9 5-9 5-9-5z" />
          <path d="M7 12v4c2 1.5 8 1.5 10 0v-4" />
        </>
      )}
      {production && (
        <>
          <path d="M4 8h6l2 3h8v8H4V8z" />
          <path d="M8 8 6 4h4" />
        </>
      )}
      {retail && (
        <>
          <path d="M6 8h12l-1 12H7L6 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </>
      )}
      {tier1 && <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />}
      {tier2 && (
        <>
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
          <path d="M9 11h6" />
        </>
      )}
      {tier3 && (
        <>
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
          <path d="m12 8 1 2h2l-1.6 1.2.6 2L12 12.2 9.9 13.2l.6-2L9 10h2l1-2z" />
        </>
      )}
      {tier4 && (
        <>
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
          <circle cx="12" cy="12" r="2" />
        </>
      )}
      {!venue && account && (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </>
      )}
      {!venue && event && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M8 3v4M16 3v4" />
        </>
      )}
      {!venue && staff && (
        <>
          <circle cx="8" cy="9" r="2" />
          <circle cx="16" cy="9" r="2" />
          <path d="M4 18a4 4 0 0 1 8 0M12 18a4 4 0 0 1 8 0" />
        </>
      )}
      {!venue && transport && (
        <>
          <path d="M3 13h15l2 3H5l-2-3z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
          <path d="M5 13 7 8h7l3 5" />
        </>
      )}
      {!venue && !tierMark && security && !account && !event && !staff && !transport && <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />}
      {!venue && !account && airport && <path d="M2 16 22 9l-2-2-8 3-4-6-2 1 3 6-5 2-2-2-1 1 2 4 3-1z" />}
      {!venue && !account && client && !airport && !security && (
        <>
          <circle cx="8" cy="15" r="2" />
          <path d="M10 15h6a2 2 0 0 0 2-2V9H8" />
          <path d="M14 7 12 4H8v5" />
        </>
      )}
      {!venue && !account && point && !airport && !security && !client && (
        <>
          <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </>
      )}
      {!venue && !tierMark && !security && !airport && !client && !point && !account && !event && !staff && !transport && (
        <>
          <path d="M3 13h15l2 3H5l-2-3z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
          <path d="M5 13 7 8h7l3 5" />
        </>
      )}
    </svg>
  );
}
