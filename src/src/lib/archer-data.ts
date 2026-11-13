/* ─────────────────────────────────────────────────────────────
   ARCHER — central content library
   NOTE: All coverage / pricing / availability data here is
   clearly-labeled SAMPLE content for the prototype. The backend
   remains authoritative for pricing, availability, eligibility
   and vehicle assignment.
   ───────────────────────────────────────────────────────────── */

export const WHATSAPP_NUMBER = "18482319997";
export const WHATSAPP_DISPLAY = "848-231-9997";
export const DISPATCH_PHONE_DISPLAY = "848-231-9997";
export const DISPATCH_PHONE_SECONDARY = "732-757-3232";
export const DISPATCH_PHONE_TEL = "+18482319997";
export const DISPATCH_EMAIL = "archerenterprises2025@gmail.com";
export const ARCHER_ADDRESS = "Russel Hall – Fort Monmouth · 1000 Sanger Ave, Suite 500, Oceanport, NJ 07757";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ─── Services ─────────────────────────────────────────────── */

export interface Service {
  id: string;
  label: string;
  tag: string;
  description: string;
  image: string;
}

export const SERVICES: Service[] = [
  {
    id: "executive-chauffeur",
    label: "Executive Chauffeur",
    tag: "01 — Chauffeur",
    description:
      "Professional chauffeur-driven transportation for executives, private clients and important journeys.",
    image: "/images/archer/svc-executive.png",
  },
  {
    id: "airport-transfers",
    label: "Airport Transfers",
    tag: "02 — Airport",
    description:
      "Reliable, flight-aware transportation for arrivals and departures — commercial and private aviation.",
    image: "/images/archer/svc-airport.png",
  },
  {
    id: "hourly-chauffeur",
    label: "Hourly Chauffeur",
    tag: "03 — Hourly",
    description:
      "A dedicated chauffeur and vehicle available around your itinerary, for as long as you need.",
    image: "/images/archer/svc-hourly.png",
  },
  {
    id: "client-car",
    label: "Client Car Service",
    tag: "04 — Client Car",
    description:
      "Archer operates your own vehicle with a professional driver — your vehicle, our professional.",
    image: "/images/archer/svc-client-car.png",
  },
  {
    id: "security",
    label: "Security Services",
    tag: "05 — Security",
    description:
      "Security-aware transportation and approved security-related services, coordinated with discretion.",
    image: "/images/archer/svc-security.png",
  },
  {
    id: "special-events",
    label: "Special Events",
    tag: "06 — Events",
    description:
      "Coordinated executive transportation for important events, productions and occasions.",
    image: "/images/archer/svc-events.png",
  },
];

/* Maps a service id to its booking-flow tab */
export const SERVICE_TO_TAB: Record<string, "one-way" | "hourly" | "airport" | "special"> = {
  "executive-chauffeur": "one-way",
  "airport-transfers": "airport",
  "hourly-chauffeur": "hourly",
  "client-car": "special",
  security: "special",
  "special-events": "special",
};

/* ─── Services mega-menu (navigation drawer) ───────────────── */

export interface ServiceMenuEntry {
  id: string;
  label: string;
  blurb: string;
  index?: string; // mono index shown next to the label
}

export interface ServiceMenuGroup {
  label: string;
  entries: ServiceMenuEntry[];
}

/* Grouped services — short one-line blurbs written for the menu */
export const SERVICE_MENU_GROUPS: ServiceMenuGroup[] = [
  {
    label: "The Chauffeur",
    entries: [
      {
        id: "executive-chauffeur",
        label: "Executive Chauffeur",
        blurb: "Point-to-point journeys, handled end to end.",
        index: "01",
      },
      {
        id: "hourly-chauffeur",
        label: "Hourly Chauffeur",
        blurb: "A dedicated chauffeur around your schedule.",
        index: "03",
      },
      {
        id: "special-events",
        label: "Special Events",
        blurb: "Coordinated movement for important occasions.",
        index: "06",
      },
    ],
  },
  {
    label: "Corporate & Specialist",
    entries: [
      {
        id: "client-car",
        label: "Client Car Service",
        blurb: "Your vehicle, operated by our professional.",
        index: "04",
      },
      {
        id: "security",
        label: "Security Services",
        blurb: "Security-aware travel, handled with discretion.",
        index: "05",
      },
    ],
  },
];

/* Aviation desk links inside the mega-menu (scroll targets) */
export const SERVICE_MENU_AVIATION: ServiceMenuEntry[] = [
  {
    id: "airport",
    label: "FBO & Private Aviation",
    blurb: "Arrivals coordinated with your FBO.",
  },
  {
    id: "flight-tracker",
    label: "Flight Tracker",
    blurb: "Look up any flight by number or tail.",
  },
  {
    id: "airports",
    label: "Airport Directory",
    blurb: "Search served airports by IATA code.",
  },
];

/* Explore rail inside the mega-menu */
export interface ExploreLink {
  label: string;
  targetId?: string; // scroll target
  openCity?: boolean;
}

export const SERVICE_MENU_EXPLORE: ExploreLink[] = [
  { label: "The Fleet", targetId: "fleet" },
  { label: "Choose City", openCity: true },
  { label: "Chauffeur Experience", targetId: "chauffeur" },
  { label: "Questions, Answered", targetId: "faq" },
];

/* ─── Fleet ────────────────────────────────────────────────── */

export type FleetClassId = "EXECUTIVE" | "FIRST_CLASS" | "GROUP";

export const FLEET_CLASSES: {
  id: FleetClassId;
  label: string;
  subtitle: string;
  description: string;
}[] = [
  {
    id: "EXECUTIVE",
    label: "Executive",
    subtitle: "Sedan / Compact SUV",
    description: "Refined, understated travel for individuals and small parties.",
  },
  {
    id: "FIRST_CLASS",
    label: "1st Class",
    subtitle: "Full-Size SUV",
    description: "Commanding presence, generous space, first-class comfort.",
  },
  {
    id: "GROUP",
    label: "Group",
    subtitle: "Sprinter",
    description: "Coordinated group movement without compromising the experience.",
  },
];

export interface FleetVehicle {
  id: string;
  name: string;
  category: string;
  classId: FleetClassId;
  passengers: number;
  luggage: number;
  image: string;
  availability: "confirmed" | "request";
  availabilityLabel: string;
  suitability: string[];
}

export const FLEET: FleetVehicle[] = [
  {
    id: "traverse",
    name: "Chevrolet Traverse",
    category: "Compact SUV",
    classId: "EXECUTIVE",
    passengers: 3,
    luggage: 3,
    image: "/images/archer/fleet-traverse.png",
    availability: "request",
    availabilityLabel: "Subject to availability",
    suitability: ["Point-to-point transfers", "Executive travel", "Airport journeys"],
  },
  {
    id: "aviator",
    name: "Lincoln Aviator",
    category: "Luxury SUV",
    classId: "EXECUTIVE",
    passengers: 3,
    luggage: 4,
    image: "/images/archer/fleet-aviator.png",
    availability: "request",
    availabilityLabel: "Special request",
    suitability: ["Executive travel", "Business meetings", "Evening occasions"],
  },
  {
    id: "escalade",
    name: "Cadillac Escalade",
    category: "Full-Size SUV",
    classId: "FIRST_CLASS",
    passengers: 6,
    luggage: 5,
    image: "/images/archer/fleet-escalade.png",
    availability: "confirmed",
    availabilityLabel: "Available by request",
    suitability: ["Executive travel", "Client hospitality", "Airport transfers"],
  },
  {
    id: "suburban",
    name: "Chevrolet Suburban",
    category: "Full-Size SUV",
    classId: "FIRST_CLASS",
    passengers: 6,
    luggage: 6,
    image: "/images/archer/fleet-suburban.png",
    availability: "confirmed",
    availabilityLabel: "Available by request",
    suitability: ["Long-distance journeys", "Group executives", "Luggage-heavy trips"],
  },
  {
    id: "sprinter",
    name: "Mercedes-Benz Sprinter",
    category: "Group Van",
    classId: "GROUP",
    passengers: 12,
    luggage: 12,
    image: "/images/archer/fleet-sprinter.png",
    availability: "request",
    availabilityLabel: "Special request",
    suitability: ["Group movement", "Event transportation", "Production crews"],
  },
];

export const FLEET_NOTE =
  "Vehicle images are representative. Final vehicle assignment is confirmed by Archer dispatch at booking.";

/* ─── Airports (sample coverage) ───────────────────────────── */

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  region: string;
  service: string;
}

export const AIRPORT_REGIONS = [
  "North America",
  "Europe",
  "Middle East & Africa",
  "Asia-Pacific",
] as const;

export const AIRPORTS: Airport[] = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", region: "North America", service: "Executive · Airport · Hourly" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "United States", region: "North America", service: "Executive · Airport" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", region: "North America", service: "Executive · Airport · Hourly" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", region: "North America", service: "Executive · Airport · Hourly" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", region: "North America", service: "Executive · Airport" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "United States", region: "North America", service: "Executive · Airport · Private Aviation" },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", region: "North America", service: "Executive · Airport" },
  { code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", region: "Europe", service: "Executive · Airport · Hourly" },
  { code: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom", region: "Europe", service: "Executive · Airport" },
  { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", region: "Europe", service: "Executive · Airport" },
  { code: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "Germany", region: "Europe", service: "Executive · Airport" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", region: "Europe", service: "Executive · Airport" },
  { code: "MAD", name: "Adolfo Suárez Madrid–Barajas", city: "Madrid", country: "Spain", region: "Europe", service: "Executive · Airport" },
  { code: "FCO", name: "Leonardo da Vinci–Fiumicino", city: "Rome", country: "Italy", region: "Europe", service: "Executive · Airport" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", region: "Middle East & Africa", service: "Executive · Airport · Private Aviation" },
  { code: "DWC", name: "Al Maktoum International", city: "Dubai", country: "United Arab Emirates", region: "Middle East & Africa", service: "Private Aviation" },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", region: "Middle East & Africa", service: "Executive · Airport" },
  { code: "RUH", name: "King Khalid International", city: "Riyadh", country: "Saudi Arabia", region: "Middle East & Africa", service: "Executive · Airport" },
  { code: "JNB", name: "O. R. Tambo International", city: "Johannesburg", country: "South Africa", region: "Middle East & Africa", service: "Executive · Airport" },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong SAR", region: "Asia-Pacific", service: "Executive · Airport" },
  { code: "NRT", name: "Tokyo Narita International", city: "Tokyo", country: "Japan", region: "Asia-Pacific", service: "Executive · Airport · Hourly" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", region: "Asia-Pacific", service: "Executive · Airport" },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", region: "Asia-Pacific", service: "Executive · Airport" },
];

export const AIRPORT_SAMPLE_NOTE =
  "Sample coverage for the prototype. Confirmed airport availability is provided at booking.";

/* ─── Cities (sample) ──────────────────────────────────────── */

export interface City {
  name: string;
  services: string[];
  airports: string[];
  note: string;
}

export const CITIES: City[] = [
  {
    name: "New York",
    services: ["Executive Chauffeur", "Airport Transfers", "Hourly Service"],
    airports: ["JFK", "LGA", "EWR"],
    note: "Primary service city",
  },
  {
    name: "London",
    services: ["Executive Chauffeur", "Airport Transfers"],
    airports: ["LHR", "LGW"],
    note: "Sample city",
  },
  {
    name: "Dubai",
    services: ["Executive Chauffeur", "Airport Transfers", "Private Aviation"],
    airports: ["DXB", "DWC"],
    note: "Sample city",
  },
  {
    name: "Los Angeles",
    services: ["Executive Chauffeur", "Airport Transfers", "Special Events"],
    airports: ["LAX", "BUR"],
    note: "Sample city",
  },
  {
    name: "Paris",
    services: ["Executive Chauffeur", "Airport Transfers"],
    airports: ["CDG", "ORY"],
    note: "Sample city",
  },
  {
    name: "Miami",
    services: ["Executive Chauffeur", "Airport Transfers", "Private Aviation"],
    airports: ["MIA", "OPF"],
    note: "Sample city",
  },
];

export const CITY_SAMPLE_NOTE =
  "City listings are sample content. Archer service in each city is confirmed by dispatch at booking.";

/* ─── Sample flight data (clearly labeled sample) ──────────── */

export interface FlightEndpoint {
  airport: string;
  code: string;
  city: string;
  terminal: string;
  gate: string;
  scheduled: string;
  estimated: string;
}

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  aircraft: string;
  from: FlightEndpoint;
  to: FlightEndpoint;
  status: string;
  statusTone: "enroute" | "scheduled" | "boarding" | "landed";
  progress: number;
}

export const SAMPLE_FLIGHTS: Record<string, FlightInfo> = {
  UA837: {
    airline: "United Airlines",
    flightNumber: "UA837",
    aircraft: "Boeing 777-300ER",
    from: {
      airport: "San Francisco International",
      code: "SFO",
      city: "San Francisco",
      terminal: "International G",
      gate: "G98",
      scheduled: "13:15",
      estimated: "13:22",
    },
    to: {
      airport: "Shanghai Pudong International",
      code: "PVG",
      city: "Shanghai",
      terminal: "T2",
      gate: "—",
      scheduled: "17:05 +1",
      estimated: "16:58 +1",
    },
    status: "En route",
    statusTone: "enroute",
    progress: 42,
  },
  N628QS: {
    airline: "Private Charter",
    flightNumber: "N628QS",
    aircraft: "Gulfstream G450 · Private",
    from: {
      airport: "Teterboro",
      code: "TEB",
      city: "Teterboro, NJ",
      terminal: "FBO",
      gate: "—",
      scheduled: "09:40",
      estimated: "09:45",
    },
    to: {
      airport: "Miami Opa-Locka Executive",
      code: "OPF",
      city: "Miami, FL",
      terminal: "FBO",
      gate: "—",
      scheduled: "12:35",
      estimated: "12:29",
    },
    status: "Scheduled",
    statusTone: "scheduled",
    progress: 0,
  },
  BA286: {
    airline: "British Airways",
    flightNumber: "BA286",
    aircraft: "Airbus A380-800",
    from: {
      airport: "San Francisco International",
      code: "SFO",
      city: "San Francisco",
      terminal: "International A",
      gate: "A6",
      scheduled: "20:30",
      estimated: "20:38",
    },
    to: {
      airport: "London Heathrow",
      code: "LHR",
      city: "London",
      terminal: "T5",
      gate: "—",
      scheduled: "14:35 +1",
      estimated: "14:20 +1",
    },
    status: "En route",
    statusTone: "enroute",
    progress: 71,
  },
  DL432: {
    airline: "Delta Air Lines",
    flightNumber: "DL432",
    aircraft: "Airbus A321neo",
    from: {
      airport: "John F. Kennedy International",
      code: "JFK",
      city: "New York",
      terminal: "T4",
      gate: "B37",
      scheduled: "08:00",
      estimated: "08:00",
    },
    to: {
      airport: "Los Angeles International",
      code: "LAX",
      city: "Los Angeles",
      terminal: "T3",
      gate: "—",
      scheduled: "11:20",
      estimated: "11:14",
    },
    status: "On time",
    statusTone: "scheduled",
    progress: 0,
  },
  EK202: {
    airline: "Emirates",
    flightNumber: "EK202",
    aircraft: "Boeing 777-300ER",
    from: {
      airport: "Dubai International",
      code: "DXB",
      city: "Dubai",
      terminal: "T3",
      gate: "A12",
      scheduled: "03:00",
      estimated: "03:00",
    },
    to: {
      airport: "John F. Kennedy International",
      code: "JFK",
      city: "New York",
      terminal: "T4",
      gate: "—",
      scheduled: "08:55",
      estimated: "08:41",
    },
    status: "Boarding",
    statusTone: "boarding",
    progress: 0,
  },
};

/* ─── Editorial content ────────────────────────────────────── */

export const PRINCIPLES = [
  {
    title: "Vetted & Certified",
    description:
      "Every chauffeur undergoes stringent background vetting, SOAR certification, and defensive driving qualification, with elite tiers drawing from military and law enforcement ranks.",
  },
  {
    title: "Complete Discretion",
    description:
      "Confidentiality and quiet professionalism at every mile. Uncompromising privacy for executives, family members, and high-profile individuals.",
  },
  {
    title: "Operational Precision",
    description:
      "A structured, centrally-monitored operation. Advanced vehicle preparation, live flight coordination, and proactive route planning.",
  },
  {
    title: "Protective Readiness",
    description:
      "Active situational awareness, emergency response readiness, and seamless add-on armed or unarmed security specialists whenever required.",
  },
];

export const CHAUFFEUR_STEPS = [
  {
    step: "01",
    title: "Book",
    description:
      "Tell us where and when. Your journey enters the Archer operation — confirmed, coordinated, tracked.",
  },
  {
    step: "02",
    title: "Prepare",
    description:
      "Your chauffeur is briefed, your vehicle is prepared, and every detail is checked before you step outside.",
  },
  {
    step: "03",
    title: "Arrive",
    description:
      "Your chauffeur arrives ahead of schedule — positioned, presented, and ready when you are.",
  },
  {
    step: "04",
    title: "Ride",
    description:
      "Settle into a quiet, prepared cabin. The journey is managed for you, start to finish.",
  },
  {
    step: "05",
    title: "Arrive",
    description:
      "You arrive composed and on time — every time. That is the Archer standard.",
  },
];

export const AVIATION_POINTS = [
  {
    title: "Airport transfers",
    description: "Reliable pickups and drop-offs for arrivals and departures.",
  },
  {
    title: "Flight-aware planning",
    description: "Journey coordination informed by your flight details.",
  },
  {
    title: "Meet & greet",
    description: "A professional welcome and a smooth handoff to your vehicle.",
  },
  {
    title: "Passenger coordination",
    description: "Clear communication for you and those traveling with you.",
  },
  {
    title: "Private aviation support",
    description: "Chauffeur service coordinated around private aviation journeys, where supported.",
  },
];

export const CLIENT_CAR_STEPS = [
  {
    step: "01",
    title: "Vehicle handoff",
    description:
      "Your vehicle is entrusted to an Archer professional under a clear service agreement.",
  },
  {
    step: "02",
    title: "Pre-service check",
    description:
      "Condition, cleanliness and readiness are documented before every journey.",
  },
  {
    step: "03",
    title: "Drive",
    description:
      "Your vehicle is operated with the same standard as the Archer fleet — discreet and precise.",
  },
  {
    step: "04",
    title: "Drop-off",
    description:
      "Passengers and vehicle arrive where they need to be, on your schedule.",
  },
  {
    step: "05",
    title: "Closeout",
    description:
      "A structured close of service — documentation, feedback and next steps.",
  },
];

export const AUDIENCES = [
  {
    title: "Executives",
    description: "Board-level schedules that cannot tolerate uncertainty.",
    icon: "briefcase",
  },
  {
    title: "Private Clients",
    description: "Discreet, personal service for individuals and families.",
    icon: "shield",
  },
  {
    title: "Executive Assistants",
    description: "Reliable execution for the people who keep calendars moving.",
    icon: "calendar",
  },
  {
    title: "Corporate Teams",
    description: "Consistent ground transportation across people and places.",
    icon: "building",
  },
  {
    title: "Families",
    description: "Comfort, space and care for the journeys that matter most.",
    icon: "users",
  },
  {
    title: "Events & Productions",
    description: "Coordinated movement for casts, crews and guests.",
    icon: "clapperboard",
  },
  {
    title: "Travel & Hospitality Partners",
    description: "A ground-transportation partner your guests can rely on.",
    icon: "globe",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Book",
    description: "Tell us where and when — online, or through WhatsApp dispatch.",
  },
  {
    step: "02",
    title: "Match",
    description: "Archer coordinates the appropriate service and vehicle for the journey.",
  },
  {
    step: "03",
    title: "Ride",
    description: "Your journey is professionally managed from pickup to destination.",
  },
  {
    step: "04",
    title: "Arrive",
    description: "Get there comfortably, confidently — on time, in style, every time.",
  },
];

export const SECURITY_POINTS = [
  {
    title: "Vetted Military & Law Enforcement Drivers",
    description: "Chauffeurs originating from law enforcement, military service, and licensed executive protection backgrounds.",
  },
  {
    title: "Tiered Protective Mobility",
    description: "From SOAR-certified corporate chauffeurs to armed close-protection specialists with active carry permits.",
  },
  {
    title: "Situational Readiness & Threat Mitigation",
    description: "Continuous route reconnaissance, tactical driver readiness, and counter-surveillance protocols on every transit.",
  },
  {
    title: "Confidentiality & Family Security",
    description: "Strict non-disclosure standards protecting principals, public figures, corporate boards, and their families.",
  },
  {
    title: "Dedicated Dispatch Coordination",
    description: "Direct real-time coordination with Archer Dispatch in Oceanport, NJ, ensuring verified assignment and rapid response.",
  },
];

/* ─── FAQ ──────────────────────────────────────────────────── */

export interface FaqCategory {
  category: string;
  items: { question: string; answer: string }[];
}

export const FAQS: FaqCategory[] = [
  {
    category: "Booking",
    items: [
      {
        question: "How do I book an Archer ride?",
        answer:
          "You can book through the booking experience on this site, or message our 24/7 dispatch directly on WhatsApp. Tell us where and when — Archer coordinates the rest.",
      },
      {
        question: "Can I request a quote?",
        answer:
          "Yes. Use the booking panel to receive an example estimate instantly, or contact dispatch for a confirmed quote. All final pricing, taxes and fees are confirmed by our team before your booking is finalized.",
      },
      {
        question: "Can I book through WhatsApp?",
        answer:
          "Absolutely. WhatsApp is a first-class booking channel at Archer — message dispatch with your journey details and we will coordinate your ride conversationally.",
      },
      {
        question: "Can I request an hourly chauffeur?",
        answer:
          "Yes. Choose the HOURLY tab in the booking panel and set your pickup, date, time and duration. A dedicated chauffeur and vehicle stay with your itinerary.",
      },
    ],
  },
  {
    category: "Airport",
    items: [
      {
        question: "Can Archer handle airport transfers?",
        answer:
          "Yes — airport transfers are a core Archer service for arrivals and departures, commercial and private aviation.",
      },
      {
        question: "Can I add my flight number?",
        answer:
          "Yes. Add your flight number during booking so your journey can be coordinated with your flight details.",
      },
      {
        question: "How does flight tracking work?",
        answer:
          "Our flight tracker lets you look up flights by flight number or tail number. For booked journeys, dispatch uses your flight details to coordinate pickup timing — you will receive a confirmation of your coordinated pickup.",
      },
      {
        question: "Can Archer support private aviation / FBO journeys?",
        answer:
          "Yes, where supported. Archer coordinates chauffeur service around private aviation journeys. Specific access and permissions depend on the airport and operator — dispatch will confirm the details for your journey.",
      },
    ],
  },
  {
    category: "Vehicles",
    items: [
      {
        question: "What vehicles are available?",
        answer:
          "The Archer fleet is organized by service class — Executive (sedan / compact SUV), 1st Class (full-size SUV) and Group (Sprinter). Explore the fleet section for representative vehicles and specifications.",
      },
      {
        question: "Can I request a specific vehicle?",
        answer:
          "You may request a preferred vehicle or class. Final vehicle assignment is confirmed by dispatch at booking, based on availability and journey requirements.",
      },
      {
        question: "How many passengers can each vehicle accommodate?",
        answer:
          "Executive class typically seats up to 3 passengers, 1st Class SUVs up to 6, and the Sprinter up to 12. Passenger and luggage capacity is confirmed with your booking.",
      },
    ],
  },
  {
    category: "Client Car",
    items: [
      {
        question: "Can Archer drive my own vehicle?",
        answer:
          "Yes — Client Car Service is an Archer differentiator. We provide a professional driver to operate your own vehicle, held to the same standard as our fleet.",
      },
      {
        question: "What is required before dispatch?",
        answer:
          "Required agreements and operational requirements — including insurance, vehicle documentation and service terms — must be completed before dispatch. Our team will guide you through setup.",
      },
    ],
  },
  {
    category: "Security",
    items: [
      {
        question: "What security-related services does Archer provide?",
        answer:
          "Archer provides security-aware transportation, professional coordination and approved security-related services for executive-focused mobility. Specific capabilities are confirmed per agreement — contact dispatch to discuss your requirements.",
      },
    ],
  },
  {
    category: "Changes & Cancellation",
    items: [
      {
        question: "How do I modify a booking?",
        answer:
          "Message dispatch on WhatsApp or contact your booking confirmation channel with your booking reference. Changes are confirmed by our team based on availability.",
      },
      {
        question: "What happens if my plans change?",
        answer:
          "Contact dispatch as soon as possible. We will work to adjust your journey. Cancellation terms that apply to your booking are shown with your quote and confirmed at booking.",
      },
    ],
  },
  {
    category: "Service Areas",
    items: [
      {
        question: "Where does Archer operate?",
        answer:
          "Archer provides premium executive transportation across supported cities and airports. Coverage is confirmed by dispatch at booking — the directories on this page show sample coverage for illustration.",
      },
      {
        question: "How do I check airport or city availability?",
        answer:
          "Use the airport directory and city selector on this page to explore coverage, then confirm your journey with dispatch. Availability is always confirmed at booking.",
      },
    ],
  },
];

/* ─── Booking options ──────────────────────────────────────── */

export const VEHICLE_CLASS_OPTIONS = [
  { value: "EXECUTIVE", label: "Executive — Sedan / Compact SUV" },
  { value: "FIRST_CLASS", label: "1st Class — Full-Size SUV" },
  { value: "GROUP", label: "Group — Sprinter" },
  { value: "DISPATCH", label: "Let dispatch recommend" },
];

export const SERVICE_OPTIONS = SERVICES.map((s) => ({
  value: s.id,
  label: s.label,
}));

export const BOOKING_TABS = [
  { id: "one-way", label: "One Way" },
  { id: "hourly", label: "Hourly" },
  { id: "airport", label: "Airport" },
  { id: "special", label: "Special Request" },
] as const;

export type BookingTabId = (typeof BOOKING_TABS)[number]["id"];

/* ─── Client voices (sample) ───────────────────────────────── */

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

/**
 * Prototype content — illustrative client voices, not real customer
 * statements or verified feedback. Clearly labeled in the UI.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The chauffeur was curbside before we cleared the terminal, flight number already in hand. No calls, no coordination — the car was simply there.",
    name: "Sample Voice — Executive Assistant",
    role: "Financial services, monthly airport runs",
  },
  {
    quote:
      "We moved a board-level roadshow across three cities in one afternoon. One dispatch line, one point of contact, and a vehicle waiting at every stop.",
    name: "Sample Voice — Chief of Staff",
    role: "Corporate roadshow coordination",
  },
  {
    quote:
      "Hourly booking meant the car stayed with me all evening — meetings ran late, dinner ran later, and the plan flexed without a single phone call.",
    name: "Sample Voice — Managing Director",
    role: "Full-day hourly engagements",
  },
  {
    quote:
      "Every detail was confirmed in writing before the journey — vehicle, chauffeur, route, wait time. It felt less like a booking and more like a briefing.",
    name: "Sample Voice — Private Client",
    role: "Occasions and event travel",
  },
];

export const TESTIMONIAL_SAMPLE_NOTE =
  "Sample client voices — illustrative prototype content, not real customer feedback.";

/* ─── Site stats (derived from prototype directories) ──────── */

export interface SiteStat {
  value: number;
  pad: number;
  suffix?: string;
  label: string;
  detail: string;
}

/**
 * Counts are derived directly from the prototype directories and fleet
 * list on this page — they describe the scope of this prototype, not
 * operational history or performance claims.
 */
export const SITE_STATS: SiteStat[] = [
  {
    value: AIRPORTS.length,
    pad: 2,
    label: "Airport hubs listed",
    detail: "In the Archer directory",
  },
  {
    value: CITIES.length,
    pad: 2,
    label: "Cities covered",
    detail: "Across the service network",
  },
  {
    value: FLEET.length,
    pad: 2,
    label: "Vehicles in the fleet",
    detail: "Three classes of travel",
  },
  {
    value: 24,
    pad: 2,
    suffix: "/7",
    label: "Dispatch availability",
    detail: "Every day of the year",
  },
];
