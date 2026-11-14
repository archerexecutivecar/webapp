import type { HeroCta, HeroSlide } from "@/components/archer/v2/shared";

// Copy, figures and links come straight from the approved design. Authoritative pricing lives in Laravel.
export const TEL = "tel:+18482319997";
const CALL: HeroCta = { label: "CALL (848) 231-9997", href: TEL, ghost: true };

export type Step = { n: string; title: string; text: string; link?: string; href?: string };
export type Use = { title: string; text: string; photo: string; img: string };
export type Faq = { q: string; a: string };
export type More = { name: string; href: string };
export type TierRow = { tier: string; title: string; cells: string[]; cta: string; href: string };

export type ServiceConfig = {
  slug: string;
  name: string;
  kicker: string;
  slides: HeroSlide[];
  ctas: HeroCta[];
  intro: { eyebrow: string; title: string; paras: string[]; boldPara?: [string, string]; boldAfter?: boolean; panelTitle: string; panel: string[] };
  airports?: { code: string; name: string; note: string; accent: boolean }[];
  uses?: { eyebrow?: string; heading?: string; items: Use[] };
  handle?: { title: string; text: string }[];
  promises?: { k: string; v: string }[];
  stepsSection: { eyebrow: string; title: string; dark: boolean; steps: Step[]; ctas?: { label: string; href: string; ghost?: boolean }[] };
  rates?: { eyebrow: string; title: string; note: ReactNodeLike; heads: string[]; rows: TierRow[]; foot?: string; panels?: { k: string; v: string }[]; book: { label: string; href: string } };
  priceCards?: { k: string; v: string; link: string; href: string }[];
  pricing?: { eyebrow: string; title: string; text: string; book: { label: string; href: string } };
  faqTitle: string;
  faq: Faq[];
  more: More[];
};
type ReactNodeLike = string;

const T = [["Tier 1", "Professional Chauffeur"], ["Tier 2", "Military & Law-Enforcement Chauffeur"], ["Tier 3", "Executive Protection Specialist"], ["Tier 4", "Senior Protection Specialist"]];
const TL = [["Tier 1 · Essential", T[0][1]], ["Tier 2 · Executive", T[1][1]], ["Tier 3 · Elite", T[2][1]], ["Tier 4 · Armed", T[3][1]]];
const step3 = (a: string, b: string, c: string, href: string): Step[] => [
  { n: "1", title: "Choose your tier", text: "Decide who you want behind the wheel, from a professional chauffeur to a senior protection specialist.", link: "Compare tiers →", href: "/tiers" },
  { n: "2", title: "Choose your vehicle", text: "Executive Class or 1st Class, in the size that fits your group and luggage.", link: "See the fleet →", href: "/fleet" },
  { n: "3", title: "Let us take care of the rest", text: c, link: "Start booking →", href },
];
const bookRows = (exec: number[], first: number[], prefix: string, suffix: string, href: string): TierRow[] =>
  TL.map(([tier, title], i) => ({ tier, title, cells: [`${prefix}${exec[i]}${suffix}`, `${prefix}${first[i]}${suffix}`], cta: i === 3 ? "CALL" : "SELECT", href: i === 3 ? TEL : href }));

const moreOf = (...n: string[]): More[] => {
  const all: Record<string, string> = { "Hourly Service": "/services/hourly", "Airport Transportation": "/services/airport", "Point to Point": "/services/point-to-point", "Client Car Service": "/services/client-car", "Concierge Services": "/services/concierge" };
  return n.map((name) => ({ name, href: all[name] }));
};

export const SERVICES: ServiceConfig[] = [
  {
    slug: "hourly", name: "Hourly Service", kicker: "HOURLY SERVICE",
    ctas: [{ label: "BOOK HOURLY SERVICE", href: "/book" }, CALL],
    slides: [
      { tag: "BUSINESS", photo: "Executive working on a laptop in the back seat", img: "e590ac6009ccd68effdacfa781d3c7cc.jpg", head: "Your office, on the move.", line: "A dedicated chauffeur between every meeting, so you can work from the back seat and walk out to a waiting car." },
      { tag: "DATE NIGHT", photo: "Champagne served on a silver tray in a warmly lit restaurant", img: "178a6855b2eeef6c6aed317b2aefc086.jpg", head: "Make it a night to remember.", line: "Dinner, a show and a nightcap. Your chauffeur waits at every stop, so the evening never has to end early." },
      { tag: "WEDDINGS", photo: "Two glasses of champagne raised in a toast under falling gold confetti", img: "12e57af516d5bc84d2b9483006e1d2df.jpg", head: "Arrive together, in style.", line: "Your car on standby from the first look to the last dance, for the couple, the family and the wedding party." },
      { tag: "PARTIES & CONCERTS", photo: "Crowd at a concert, hands in the air", img: "0773bcc747a33e5d0dcc3ce20026f80d.jpg", head: "The night is yours. We've got the ride.", line: "Skip the parking and the rideshare line, from the opening act to the encore and the after-party." },
      { tag: "SPORTING EVENTS", photo: "Football stadium lit up with fireworks", img: "0985b7cc954872b8d6e58a1e028ed4b3.jpg", head: "Game day, without the traffic.", line: "Dropped at the gate and picked up after the final whistle. No parking lots, no long walk back." },
    ],
    intro: {
      eyebrow: "HOURLY SERVICE", title: "Sit back and enjoy the night, or get to work.",
      paras: ["Whether you're planning a night out or a busy day of back-to-back meetings, Archer's hourly service puts a dedicated chauffeur and vehicle at your side for as long as you need.", "Relax and enjoy your evening, or focus on your work while we get you to and from everywhere you need to be, safely, reliably and on time. Your chauffeur waits between stops, so there's no rushing, no parking and no waiting for a ride."],
      panelTitle: "What's included",
      panel: ["A dedicated, SORA-certified chauffeur for your whole booking", "Your chauffeur waits between stops", "Add as many stops as you like, always at no charge", "Vehicle prepared and stocked before pickup", "Bottled water, phone chargers and Wi-Fi [CONFIRM]", "24/7 dispatch support while you ride"],
    },
    uses: { items: [
      { title: "A day of meetings", text: "Work in a quiet cabin between appointments. Your car is waiting when you walk out.", photo: "Executive on the phone stepping out of a black car", img: "90084a5d10192831bb082b0793f99927.jpg" },
      { title: "A night out", text: "Dinner, a show and a nightcap, with no parking and a safe ride home.", photo: "Friends celebrating with champagne in the back of a limousine", img: "0e07ff68774b6ac1a120de4871238b3d.jpg" },
      { title: "Special events", text: "Weddings, galas and celebrations, with your car on standby all evening.", photo: "Long candlelit banquet table set for a gala", img: "3b4c2b9aa422ed0d88baba08204acf79.jpg" },
    ] },
    stepsSection: { eyebrow: "HOW TO BOOK", title: "Choose your tier. Choose your vehicle. Let us take care of the rest.", dark: true, steps: step3("", "", "Tell us when and where. Dispatch confirms your chauffeur, route and timing.", "/book") },
    rates: { eyebrow: "HOURLY RATES", title: "Starting rates by tier.", note: "Full-size SUV shown · 4-hour minimum · Stops always free · Gratuity not included", heads: ["EXECUTIVE CLASS", "1ST CLASS"], rows: bookRows([80, 100, 140, 190], [100, 120, 160, 210], "$", "", "/book").map((r) => ({ ...r, cells: r.cells.map((c) => `${c}|/hr|Starting at `) })), book: { label: "Book Hourly Service", href: "/book" } },
    faqTitle: "Questions about hourly service",
    faq: [
      { q: "Is there a minimum booking time?", a: "Yes, hourly bookings have a 4-hour minimum." },
      { q: "Can I add stops or change plans during the booking?", a: "Yes. Stops are always free on hourly bookings, and your chauffeur stays with you, so you can adjust your route along the way." },
      { q: "Is gratuity included?", a: "No. A 20% gratuity is suggested and added at checkout." },
      { q: "How far ahead should I book?", a: "[ARCHER TO CONFIRM NOTICE PERIOD]. For short-notice rides, call dispatch." },
    ],
    more: moreOf("Airport Transportation", "Point to Point", "Client Car Service", "Concierge Services"),
  },
  {
    slug: "point-to-point", name: "Point to Point", kicker: "POINT TO POINT",
    ctas: [{ label: "BOOK POINT TO POINT", href: "/book/point-to-point" }, CALL],
    slides: [
      { tag: "BUSINESS MEETINGS", photo: "Chauffeur in a suit opening the rear door", img: "c28cdca87003da251c2ae8d760931097.jpg", head: "Straight there. On time, every time.", line: "Direct to the meeting, the office or the client, with a set fare you know before you ride." },
      { tag: "INTO THE CITY", photo: "New York City skyline at night across the river", img: "1148caadf7cbda26f41383afdd8681e5.jpg", head: "Manhattan, Brooklyn or Philly. No stress.", line: "New Jersey to New York or Pennsylvania, door to door, with no parking and no traffic headaches." },
      { tag: "DINNER & EVENINGS", photo: "Couple at a candlelit restaurant table", img: "36a7fc57397813bc87a6fb7d0022b4db.jpg", head: "Arrive like you mean it.", line: "Dinner reservations, shows and nights out, with a polished arrival and a safe ride there." },
      { tag: "EVENTS", photo: "Concert crowd under purple lights and fireworks", img: "d6a64902703bbe99117991b2834475da.jpg", head: "Make the entrance.", line: "Galas, weddings and celebrations. One stop on your way is included." },
      { tag: "HOME SAFE", photo: "Chauffeur helping a client into a black sedan", img: "78ad308d0f21b509aed2fbe37b370bdb.jpg", head: "Door to door. No detours.", line: "A private ride home from wherever the night takes you, with a vetted, SORA-certified chauffeur." },
    ],
    intro: {
      eyebrow: "POINT TO POINT", title: "Door to door, with no unnecessary stops.",
      paras: ["Our point-to-point service provides direct, private transfers between your chosen locations with no unnecessary stops. Travel in comfort and style in our premium fleet, driven by professional chauffeurs who ensure punctuality and discretion.", "Perfect for business meetings, events or leisure outings, it offers reliability, privacy and convenience for clients who value efficiency and elegance. Every trip has a set minimum fare, so you know the price before you ride."],
      panelTitle: "What's included",
      panel: ["A vetted, SORA-certified chauffeur", "One stop on your way included; extra stops $20 each", "A set minimum fare per trip", "Vehicle prepared and stocked before pickup", "Help with bags, door to door", "24/7 dispatch while you ride"],
    },
    uses: { items: [
      { title: "Business meetings", text: "Arrive prepared and on time, then get picked up when you are done.", photo: "Executive on the phone stepping out of a black car", img: "72083bb5ff128aca03c8ff649f70906f.jpg" },
      { title: "Into the city", text: "New Jersey to Manhattan, Brooklyn or Philadelphia, without the stress.", photo: "Black luxury sedan on a city street", img: "fb9f951f8410c826535616d5ac9e7076.jpg" },
      { title: "Events and evenings out", text: "A polished arrival at the gala, the game or dinner.", photo: "Chauffeur holding the door as a client steps into a black sedan", img: "f96724ce6f71561c477449e6c23d8fed.jpg" },
    ] },
    stepsSection: { eyebrow: "HOW TO BOOK", title: "Choose your tier. Choose your vehicle. Let us take care of the rest.", dark: true, steps: step3("", "", "Tell us where and when. Dispatch confirms your chauffeur, route and timing.", "/book/point-to-point") },
    rates: { eyebrow: "MINIMUM FARES", title: "Starting fares per trip, by tier.", note: "Full-size SUV shown · One stop on the way included · Sprinters are hourly only · Gratuity not included", heads: ["EXECUTIVE CLASS", "1ST CLASS"], rows: bookRows([155, 180, 225, 280], [200, 220, 260, 310], "$", "", "/book/point-to-point").map((r) => ({ ...r, tier: r.tier.replace(/ ·.*/, ""), cells: r.cells.map((c) => `${c}||From `) })), book: { label: "Book Point to Point", href: "/book/point-to-point" } },
    faqTitle: "Questions about point to point",
    faq: [
      { q: "How is point to point priced?", a: "Each trip has a minimum fare by tier and vehicle. Longer trips are quoted by distance: [ARCHER TO CONFIRM how longer trips are priced]." },
      { q: "Can I add a stop?", a: "Yes. One stop on your way is included, and each additional stop is $20. For a stop out of the way, book Hourly Service, where stops are always free." },
      { q: "Can I book a return trip?", a: "Yes. Choose Round trip on the booking form and add your return time." },
      { q: "Is gratuity included?", a: "No. A 20% gratuity is suggested and added at checkout." },
    ],
    more: moreOf("Hourly Service", "Airport Transportation", "Client Car Service", "Concierge Services"),
  },
  {
    slug: "airport", name: "Airport Transportation", kicker: "AIRPORT TRANSPORTATION",
    ctas: [{ label: "BOOK AIRPORT TRANSPORTATION", href: "/book/airport" }, CALL],
    slides: [
      { tag: "TERMINAL PICKUPS", photo: "Dark luxury car parked beside a private jet on the tarmac", img: "b1c9fe9f1270c5eb3243be348c30da8e.jpg", head: "Wheels down. We're already there.", line: "Your chauffeur is waiting when you land, curbside or inside the terminal with your name on a sign." },
      { tag: "FLIGHT TRACKING", photo: "Traveler in a dark suit with his bag at the open door of a black luxury sedan", img: "c0def6018f604333ccda7a3fb941225e.jpg", pos: "center 20%", head: "Early or late, we're on time.", line: "We track every flight, so your pickup moves with your arrival. No calls, no waiting at the curb." },
      { tag: "PRIVATE AVIATION", photo: "Black SUV parked beside a private jet on the runway", img: "0d189b9e03a329217ef4ed07c8edfaab.jpg", head: "From the jet to the door.", line: "Discreet transfers at Teterboro, Morristown and private FBOs, with protection tiers on request." },
      { tag: "BUSINESS TRAVEL", photo: "Traveler walking into the terminal with a suitcase", img: "d0a626ee7b5606505a36e0b13821dc7b.jpg", head: "Land ready for the meeting.", line: "A quiet cabin, a charged phone and a chauffeur who knows the way. Work from the moment you sit down." },
      { tag: "DEPARTURES", photo: "Traveler with a rolling suitcase outside the terminal", img: "449cd28136749842fe7bf7c42af5346d.jpg", pos: "center top", head: "Bags loaded. Right on time.", line: "Out the door on schedule to Newark, JFK, LaGuardia or Philadelphia, with no parking to worry about." },
    ],
    intro: {
      eyebrow: "AIRPORT TRANSPORTATION", title: "From arrival to departure, handled with precision.",
      paras: ["Our airport transportation service ensures a smooth, stress-free experience from arrival to departure. We provide timely pickups and drop-offs, monitor flight schedules for accuracy, and offer luxury vehicles driven by professional chauffeurs.", "If your flight is early or delayed, your chauffeur already knows. With personalized assistance and reliable service, you can relax knowing your travel is handled with precision and comfort."],
      panelTitle: "What's included",
      panel: ["Live flight tracking on every pickup", "A vetted, SORA-certified chauffeur", "Curbside pickup, or meet-and-greet inside with a name sign", "Help with luggage, door to door", "Bottled water and phone chargers on board", "24/7 dispatch while you travel"],
    },
    airports: [
      { code: "EWR", name: "Newark Liberty", note: "New Jersey", accent: true },
      { code: "JFK", name: "John F. Kennedy", note: "New York", accent: false },
      { code: "LGA", name: "LaGuardia", note: "New York", accent: false },
      { code: "PHL", name: "Philadelphia International", note: "Pennsylvania", accent: false },
      { code: "ACY", name: "Atlantic City International", note: "New Jersey", accent: true },
      { code: "FBO", name: "Private aviation", note: "Teterboro, Morristown and other FBOs", accent: true },
    ],
    uses: { items: [
      { title: "Terminal pickups", text: "Your chauffeur is waiting when you land, at the curb or inside the terminal.", photo: "Black car on the tarmac beside a private jet at night", img: "1e801f10e10a1f511b4d8e355c084c32.jpg" },
      { title: "Early departures", text: "Out the door on time, bags loaded, with no parking to worry about.", photo: "Traveler with a rolling suitcase outside the terminal", img: "449cd28136749842fe7bf7c42af5346d.jpg" },
      { title: "Private aviation", text: "Discreet FBO transfers, with protection tiers available on request.", photo: "Passenger stepping off a private jet", img: "385ff4f15e1d96e027aed85ecdd7eea2.jpg" },
    ] },
    stepsSection: { eyebrow: "HOW IT WORKS", title: "Share your flight. We take care of the rest.", dark: true, steps: [
      { n: "1", title: "Share your flight", text: "Book online with your airline and flight number, or call dispatch." },
      { n: "2", title: "We track it", text: "Dispatch watches your flight and adjusts your pickup time automatically." },
      { n: "3", title: "Meet your chauffeur", text: "Walk out to a waiting car, or meet your chauffeur inside with a name sign." },
    ] },
    rates: {
      eyebrow: "AIRPORT RATES", title: "Starting rates by tier.", note: "Full-size SUV shown · Sprinters are hourly only, 4-hour minimum · Gratuity not included",
      heads: ["NJ AIRPORTS · PER TRIP|Executive / 1st Class", "JFK · LGA · PHL · HOURLY|Executive / 1st Class, 4-hr min"],
      rows: TL.map(([tier, title], i) => ({ tier: tier.replace(/ ·.*/, ""), title, cells: [`$${[155, 180, 225, 280][i]} / $${[200, 220, 260, 310][i]}`, `$${[80, 100, 140, 190][i]} / $${[100, 120, 160, 210][i]}| /hr`], cta: i === 3 ? "CALL" : "SELECT", href: i === 3 ? TEL : "/book/airport" })),
      foot: "NJ airports use the point-to-point minimum fare. NY and PA airports are billed hourly.",
      panels: [
        { k: "Free waiting time", v: "45 minutes for domestic flights and 60 minutes for international flights. If your flight takes off on time, the clock starts at its scheduled arrival time. If take-off is delayed, it starts at the new arrival time the airline sets." },
        { k: "Long delays", v: "If your flight is delayed by more than 2 hours, Archer will do its best to keep your pickup, but we can't guarantee the same chauffeur or vehicle. Dispatch will contact you to confirm or rearrange your ride." },
      ],
      book: { label: "Book Airport Transportation", href: "/book/airport" },
    },
    faqTitle: "Questions about airport service",
    faq: [
      { q: "What if my flight is delayed?", a: "You get 45 minutes of free waiting time for domestic flights and 60 minutes for international. If take-off is delayed, the clock starts at the new arrival time the airline sets." },
      { q: "What if my flight is delayed more than 2 hours?", a: "Archer will do its best to keep your pickup, but it is not guaranteed. Dispatch will contact you to confirm or rearrange your ride." },
      { q: "Where will my chauffeur meet me?", a: "Curbside at arrivals, or inside the terminal with a name sign if you choose meet-and-greet." },
      { q: "Are tolls, parking and airport fees included?", a: "[ARCHER TO CONFIRM what is included in the airport price]." },
      { q: "Do you serve private jets and FBOs?", a: "Yes, including Teterboro, Morristown and other private aviation terminals." },
      { q: "How far ahead should I book?", a: "[ARCHER TO CONFIRM NOTICE PERIOD]. For short-notice rides, call dispatch." },
    ],
    more: moreOf("Hourly Service", "Point to Point", "Client Car Service", "Concierge Services"),
  },
  {
    slug: "client-car", name: "Client Car Service", kicker: "CLIENT CAR SERVICE",
    ctas: [{ label: "BOOK CLIENT CAR SERVICE", href: "/book/client-car" }, CALL],
    slides: [
      { tag: "YOUR OWN CAR", photo: "Archer chauffeur in white gloves handing over car keys", img: "227c6dcb5a895c21f476d52af51ee082.png", head: "Your car. Our chauffeur.", line: "A SORA-certified Archer chauffeur behind the wheel of your own vehicle, billed round trip until your car is home." },
      { tag: "NIGHT OUT", photo: "Friends toasting with sparklers at dinner", img: "b471daf65c0f12dd304cecea989328bb.jpg", head: "Enjoy the night. Ride home in your own car.", line: "Dinner, a show or a party, with no parking, no late drive home and your car back in your driveway." },
      { tag: "BUSY DAYS", photo: "Chauffeur with both hands on the wheel", img: "58b4e66f73366207d8efe91e51f1b863.jpg", head: "Your back seat. Your schedule.", line: "Work or rest between appointments while your chauffeur handles the traffic and the parking." },
      { tag: "REGULAR DRIVER", photo: "Family arriving home as the chauffeur unloads their car", img: "f4346a013e7b31ddbde13beb66a3b715.jpg", head: "The same standard, every week.", line: "Weekly and recurring schedules for clients who want a trusted chauffeur for their own vehicle." },
      { tag: "PROTECTION", photo: "Protection team in dark suits and sunglasses", img: "0e87229d9ea8e61e3283c09e66546535.jpg", pos: "center top", head: "Discreet protection, behind your wheel.", line: "Choose a protection-trained tier when your day calls for more than a driver." },
    ],
    intro: {
      eyebrow: "CLIENT CAR SERVICE", title: "Ride in the car you love. Leave the driving to us.",
      paras: ["You chose your car for a reason. With Client Car Service, you keep riding in it, and an Archer chauffeur does the driving. It's perfect when you want your own comfort and privacy without the stress of traffic, parking or a late drive home.", "Every Client Car chauffeur is vetted, background-checked and SORA-certified, with the same standard of care and discretion as every Archer ride. Choose your tier, from a professional chauffeur to a senior protection specialist, and we take care of the rest."],
      boldPara: ["Billed round trip.", " Your chauffeur returns your vehicle to your home, so billing runs until your car is back at your starting address."],
      panelTitle: "What's included",
      panel: ["A vetted, SORA-certified Archer chauffeur in your vehicle", "White-glove key handover at the start and end of your booking", "Your chauffeur waits between stops", "Change your route or add stops along the way", "24/7 dispatch support while you ride", "Covered by Archer’s chauffeur insurance [ARCHER TO CONFIRM wording]"],
    },
    uses: { items: [
      { title: "A night out", text: "Enjoy dinner, a show or a party, and get home safely in your own car.", photo: "Friends toasting with sparklers at dinner", img: "b471daf65c0f12dd304cecea989328bb.jpg" },
      { title: "Busy days and appointments", text: "Work or rest in your own back seat while we handle traffic and parking.", photo: "Chauffeur with both hands on the wheel", img: "58b4e66f73366207d8efe91e51f1b863.jpg" },
      { title: "A regular driver", text: "Weekly or recurring schedules with the same standard every time.", photo: "Family arriving home as the chauffeur unloads their car", img: "f4346a013e7b31ddbde13beb66a3b715.jpg" },
    ] },
    stepsSection: { eyebrow: "HOW TO BOOK", title: "Choose your tier. Tell us about your car. Let us take care of the rest.", dark: true, steps: [
      { n: "1", title: "Choose your tier", text: "Decide who you want behind the wheel, from a professional chauffeur to a senior protection specialist.", link: "Compare tiers →", href: "/tiers" },
      { n: "2", title: "Tell us about your car", text: "Make, model and year, and where we meet you and your keys.", link: "Start booking →", href: "/book/client-car" },
      { n: "3", title: "Let us take care of the rest", text: "Dispatch confirms your chauffeur and timing. You just enjoy the ride.", link: "Call dispatch →", href: TEL },
    ] },
    rates: {
      eyebrow: "CLIENT CAR RATES", title: "Starting rates by tier.", note: "3-hour minimum · Billed round trip · Gratuity not included", heads: ["YOUR VEHICLE"],
      rows: TL.map(([tier, title], i) => ({ tier: tier.replace(/ ·.*/, ""), title, cells: [`$${[45, 60, 75, 125][i]}|/hr|Starting at `], cta: i === 3 ? "CALL" : "SELECT", href: i === 3 ? TEL : "/book/client-car" })),
      book: { label: "Book Client Car Service", href: "/book/client-car" },
    },
    faqTitle: "Questions about Client Car Service",
    faq: [
      { q: "Is there a minimum booking time?", a: "Yes. Client Car bookings have a 3-hour minimum." },
      { q: "How is Client Car billed?", a: "Always as a round trip: from your starting point to your destination and back. Your chauffeur returns your vehicle to your home, so billing runs until your car is back at your starting address." },
      { q: "Is my car insured while your chauffeur drives it?", a: "[ARCHER TO CONFIRM insurance wording before launch]." },
      { q: "What kinds of vehicles can you drive?", a: "Most passenger cars and SUVs. [ARCHER TO CONFIRM any limits, such as exotic or oversized vehicles.]" },
      { q: "Do I need to sign anything?", a: "Yes. First-time clients sign a short Client Car service agreement before the first ride." },
      { q: "Is gratuity included?", a: "No. A 20% gratuity is suggested and added at checkout." },
    ],
    more: moreOf("Hourly Service", "Concierge Services", "Airport Transportation", "Point to Point"),
  },
  {
    slug: "concierge", name: "Concierge Services", kicker: "CONCIERGE SERVICES",
    ctas: [{ label: "REQUEST CONCIERGE SERVICES", href: "/book/concierge" }, CALL],
    slides: [
      { tag: "DATE NIGHT", photo: "Couple at a candlelit restaurant table", img: "36a7fc57397813bc87a6fb7d0022b4db.jpg", head: "Tell us the occasion. We'll plan every detail.", line: "Reservations, ambiance and the ride, planned by an Archer event planner. Your first hour of planning is free." },
      { tag: "PROPOSALS", photo: "Waiter serving champagne at an elegant venue", img: "178a6855b2eeef6c6aed317b2aefc086.jpg", head: "The question, perfectly planned.", line: "The setting, the timing and the surprise, coordinated down to the minute so you can focus on the moment." },
      { tag: "CELEBRATIONS", photo: "Champagne toast under falling gold confetti", img: "12e57af516d5bc84d2b9483006e1d2df.jpg", head: "Milestones deserve a plan.", line: "Birthdays, anniversaries and celebrations, from venue and vendors to the last ride home." },
      { tag: "CORPORATE", photo: "Long candlelit banquet table set for a gala", img: "3b4c2b9aa422ed0d88baba08204acf79.jpg", head: "Client dinners, handled.", line: "Team dinners, client entertainment and executive retreats, planned with professional polish." },
      { tag: "THE RIDE", photo: "Chauffeur holding the door as a client steps into a black sedan", img: "081914a303ca7784c4908a84598db02d.jpg", head: "Planned, booked and driven.", line: "One point of contact for the plan and the transportation, with your Archer chauffeur at every stop." },
    ],
    intro: {
      eyebrow: "CONCIERGE SERVICES", title: "From the first idea to the last ride home.",
      paras: ["Whether you're planning an intimate anniversary dinner, a surprise proposal, a milestone celebration, or simply trying to secure that impossible-to-book restaurant reservation, we curate seamless events tailored to your vision.", "From romantic evenings and private dining to corporate gatherings and special occasions, we handle every detail, from venue selection and vendor coordination to day-of execution, so you can enjoy the moment stress-free."],
      boldPara: ["Planning is $25 an hour, and your first hour is free.", " That covers most small events and special nights, like a dinner reservation or a proposal plan paired with your Archer ride. You are never charged a planning fee without a written concierge agreement."],
      boldAfter: true,
      panelTitle: "Perfect for",
      panel: ["Anniversary and date-night dinners", "Surprise proposals", "Birthdays and milestone celebrations", "Hard-to-book restaurant reservations", "Corporate dinners and client entertainment", "Multi-day visits and executive retreats"],
    },
    handle: [
      { title: "Private Dinner Planning", text: "From romantic evenings to group gatherings: reservations, menus, décor and ambiance." },
      { title: "Special Event Coordination", text: "Birthdays, anniversaries, proposals and more, tailored to your style." },
      { title: "Corporate Event Management", text: "Team dinners, client entertainment and executive retreats with professional polish." },
      { title: "Venue Sourcing & Booking", text: "The right location for any occasion, from cozy lounges to elegant ballrooms." },
      { title: "Vendor Coordination", text: "Caterers, florists, photographers, entertainers and more." },
      { title: "Transportation Arrangements", text: "Archer black car service, group Sprinters or valet coordination." },
      { title: "Custom Itinerary Creation", text: "Multi-day experiences with dining, entertainment and leisure." },
      { title: "Gift & Favor Procurement", text: "Thoughtful touches for guests, clients or loved ones." },
      { title: "On-Site Event Support", text: "Day-of coordination so everything runs smoothly." },
    ],
    stepsSection: { eyebrow: "HOW IT WORKS", title: "Share your vision. We take it from there.", dark: false, steps: [
      { n: "1", title: "Tell us your plans", text: "Send a concierge request with the occasion, date and what you have in mind." },
      { n: "2", title: "Meet your event planner", text: "An Archer event planner contacts you to shape the plan, venues and vendors." },
      { n: "3", title: "Enjoy the moment", text: "We coordinate the day and your Archer chauffeur gets everyone there in style." },
    ], ctas: [{ label: "Request Concierge Services", href: "/book/concierge" }, { label: "Call (848) 231-9997", href: TEL, ghost: true }] },
    faqTitle: "Questions about concierge services",
    faq: [
      { q: "How far ahead should I reach out?", a: "[ARCHER TO CONFIRM]. The earlier we hear from you, the more venues and vendors are available." },
      { q: "How is concierge planning priced?", a: "Planning is $25 an hour, and your first hour is free. You are never charged a planning fee without a written concierge agreement. Transportation is priced by tier and vehicle." },
      { q: "Can you plan events outside New Jersey?", a: "Yes, across New Jersey, New York (all 5 boroughs) and Pennsylvania." },
      { q: "Is transportation included?", a: "Transportation can be added to any plan, with the tier and vehicle you choose." },
    ],
    more: moreOf("Hourly Service", "Airport Transportation", "Point to Point", "Client Car Service"),
  },
  {
    slug: "assistants", name: "For EA's & PA's", kicker: "FOR EXECUTIVE & PERSONAL ASSISTANTS",
    ctas: [{ label: "CREATE YOUR PROFILE", href: "/book/assistants/profile" }, { label: "HAVE A PROFILE? PLAN YOUR WEEK", href: "/book/assistants/week", ghost: true }, CALL],
    slides: [
      { tag: "THE WHOLE WEEK", photo: "Planner page that says ’make it happen’", img: "860e96d14a85ed2f6763713e9b18caa7.jpg", head: "Plan their week. We'll handle every mile.", line: "Archer is the assistant to the assistant. Send us every ride on your executive's calendar, and consider it done." },
      { tag: "ON TIME, EVERY TIME", photo: "Traveler with luggage inside a bright airport terminal", img: "f745194f709c6ceeb63f33f2c8f98f20.jpg", head: "Flights change. Your plan doesn't.", line: "We track every flight and adjust every pickup, so you never have to make the call yourself." },
      { tag: "READY TO WORK", photo: "Executive working on a laptop in the back seat", img: "f97069c7b19dd54fa8c7630c8e69eabb.jpg", head: "They step in. The work starts.", line: "A quiet cabin, water, chargers and their preferences on file, so your executive arrives prepared for every meeting." },
      { tag: "DISCRETION", photo: "Protection team in dark suits and sunglasses", img: "ff0ab91c2e506b555c8d24cc2d5aee0b.jpg", pos: "center top", head: "Confidential by default.", line: "Vetted, SORA-certified chauffeurs and protection tiers for the days that call for more." },
      { tag: "YOUR DISPATCH TEAM", photo: "Chauffeur holding the van door for a group", img: "9ac46429fb026a2310e2f6632fb350bd.jpg", head: "Your team. Your executive. On time.", line: "A team of dedicated dispatchers working for you, keeping your executive on time while you work." },
    ],
    intro: {
      eyebrow: "THE ASSISTANT TO THE ASSISTANT", title: "Let Archer help you get things done.",
      paras: ["You keep your executive's world running: the meetings, the flights, the dinners and the last-minute changes. Archer takes every ride off your list. Send us the week, and we plan, confirm and drive it, so you can focus on everything else.", "You get a team of dedicated Archer dispatchers working for you. They know your executive, their preferences and their schedule, and they keep your executive on time while you work. When a flight moves or a meeting runs long, they adjust and keep you in the loop, so nothing lands back on your desk."],
      boldPara: ["You plan their week. We handle every mile.", " Safe, on time, discreet and ready to work, every ride."],
      boldAfter: true,
      panelTitle: "What you get",
      panel: ["A team of dedicated dispatchers working for you, who know your executive", "Book a whole week of rides in one request", "Live flight tracking on every airport pickup", "Your executive's preferences kept on file", "Confirmations and live updates sent to you, your executive, or both", "Changes handled with one message, day or night", "Protection-trained tiers whenever the day calls for it", "24/7 dispatch while your executive is on the move"],
    },
    promises: [
      { k: "Safe", v: "SORA-certified chauffeurs with military and law-enforcement backgrounds, and protection tiers when needed." },
      { k: "On time", v: "Flight tracking adjusts airport pickups automatically, and we arrive early for every ride." },
      { k: "Ready", v: "The vehicle is prepared before pickup, so your executive can work from the moment they sit down." },
      { k: "Discreet", v: "Confidentiality on every ride. Schedules, guests and conversations stay private." },
      { k: "Easy", v: "A dedicated dispatch team, 24/7, keeps your executive on time while you work. You send the plan; we handle the rest." },
    ],
    stepsSection: { eyebrow: "HOW IT WORKS", title: "Send us the week. We'll take it from there.", dark: true, steps: [
      { n: "1", title: "Set up your profile once", text: "You, your company, everyone you assist and how to bill. Archer saves it, so every booking after is prefilled." },
      { n: "2", title: "Send us the week", text: "List every ride on your executive's calendar in one request: airports, meetings, dinners and anything in between." },
      { n: "3", title: "We build the plan", text: "Dispatch matches the right tier, vehicle and chauffeur to each ride and confirms the whole week back to you." },
      { n: "4", title: "Stay in the loop, not on the phone", text: "Live updates to you and your executive. When plans change, send one message and we take care of it." },
    ], ctas: [{ label: "Create your assistant profile", href: "/book/assistants/profile" }, { label: "Plan your executive's week", href: "/book/assistants/week", ghost: true }, { label: "Call (848) 231-9997", href: TEL, ghost: true }] },
    pricing: { eyebrow: "PRICING", title: "Standard Archer rates. One plan for the whole week.", text: "Every ride in your plan is priced at Archer's standard rates for the service, tier and vehicle you choose: hourly with a 4-hour minimum, or a set point-to-point fare. Corporate billing to one company account: [ARCHER TO CONFIRM].", book: { label: "Book for your executive", href: "/book/assistants/week" } },
    priceCards: [
      { k: "HOURLY · 4-HOUR MINIMUM", v: "From $70/hr", link: "See hourly service →", href: "/services/hourly" },
      { k: "POINT TO POINT · PER TRIP", v: "From $145", link: "See point to point →", href: "/services/point-to-point" },
      { k: "AIRPORT · NJ AIRPORTS", v: "From $145", link: "See airport service →", href: "/services/airport" },
    ],
    faqTitle: "Questions from assistants",
    faq: [
      { q: "Can I book a whole week of rides at once?", a: "Yes. Add every ride to one plan, and dispatch confirms each one back to you. You can also set it up to repeat every week." },
      { q: "Can you keep my executive's preferences on file?", a: "Yes. Preferred tier and vehicle, temperature, drinks, music and anything else that matters, so every chauffeur gets it right." },
      { q: "Who gets the confirmations and updates?", a: "You choose: you, your executive, or both. Updates come by text and email." },
      { q: "What if plans change at the last minute?", a: "Send one message or call your dedicated dispatch team, day or night, and they adjust the ride for you." },
      { q: "Can rides be billed to our company?", a: "[ARCHER TO CONFIRM corporate billing, such as one monthly invoice through Square]." },
      { q: "Is my executive's schedule kept confidential?", a: "Always. Itineraries, guests and conversations stay private, and every chauffeur is vetted and background-checked." },
    ],
    more: moreOf("Hourly Service", "Airport Transportation", "Point to Point", "Concierge Services"),
  },
];

export const bySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);
