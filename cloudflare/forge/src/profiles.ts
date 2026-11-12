/**
 * What kind of business a site is for, which decides its pages and its wording. A bar and grill
 * needs Menu, Events and Reserve a Table, not Services, Service Areas and Get a Quote. Trades that
 * work at the customer's place (plumbers, roofers, landscapers…) keep the contractor pages, which is
 * also the fallback when we can't tell.
 */

export interface Profile {
  id: "contractor" | "restaurant" | "beauty" | "health" | "professional" | "fitness" | "retail" | "lodging" | "attraction";
  /** The page listing what the business offers, and the pages under it. */
  items: { name: string; path: string; one: string; many: string; example: string };
  /** The main action a visitor takes. */
  cta: { name: string; path: string; form: string; about: string };
  /** Where a visitor finds the business (replaces "Service Areas"). */
  visit: { name: string; path: string; brief: string };
  /** The explainer page (replaces "Our Process"). */
  steps: { name: string; path: string; brief: string };
  gallery: { name: string; brief: string };
  about: string;
  /** Home page sections 3–9 (the hero, proof, reviews, FAQs, form and close are shared). */
  home: string[];
  /** What a page for one item covers. */
  item: string;
  faq: string;
}

const P: Record<Exclude<Profile["id"], "contractor">, Omit<Profile, "id">> = {
  restaurant: {
    items: { name: "Menu", path: "/menu", one: "menu section", many: "menu sections", example: "Burgers & Sandwiches, Steaks, Starters, Drinks" },
    cta: {
      name: "Reserve a Table",
      path: "/reserve",
      form: "name, phone, email, date, time, party size, occasion or notes",
      about: "how reservations and walk-ins work, large parties, and how quickly we confirm (no invented times)",
    },
    visit: {
      name: "Hours & Location",
      path: "/visit",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for today's hours'); the address with the real map embed large; parking and getting here (general, nothing invented); the phone as a tel: link; what to expect when you arrive (walk-ins, the bar, families, groups); closing CTA.",
    },
    steps: {
      name: "Private Events",
      path: "/events",
      brief: "Page hero; the kinds of gatherings the place hosts (birthdays, teams, rehearsal dinners, work parties) as cards; how booking an event works in 4–5 steps; food and drink for groups (no invented prices or package names); the space described honestly from the facts given; an event inquiry form (name, phone, email, date, guests, details) with the privacy note; FAQs; closing CTA.",
    },
    gallery: {
      name: "Gallery",
      brief: "Page hero; a gallery of the food, the drinks, the room and the people, using only the supplied photos and the generated preview photos, each with a short appetising caption; what the atmosphere is like; a review; closing CTA to reserve.",
    },
    about: "Page hero; the story of the place in the owner's voice (only facts given; warm and general if few are known); the kitchen and the bar: how the food is made and what the place is proud of; the people; what regulars say (2–3 reviews); hours and location summary; closing CTA.",
    home: [
      "Signature dishes: the food and drink people come for, as an appetising, photo-led feature (not a card grid), each linking to its menu section.",
      "The menu at a glance: every menu section ({items}) with two or three example dishes each (plausible for this kind of place, no prices unless given), plus 'See the full menu' → {itemsPath}.",
      "The room and the atmosphere: what a night here feels like, with photos, linking to /gallery.",
      "Our story: a short introduction to the place and the people behind it, linking to /about.",
      "Events and groups: parties, teams and get-togethers, linking to {stepsPath}.",
      "This week: specials, game nights or live music ONLY if given in the facts; otherwise the bar: what's poured and what pairs with what.",
      "Hours and location: opening hours (only if given), the real map embed and the address, linking to {visitPath}.",
    ],
    item: "A page for the menu section \"{name}\". Page hero (breadcrumb Home / Menu / {name}); the dishes or drinks in this section as a designed menu list: name and a one-line description each (plausible for this kind of place; write 'Sample menu — the real menu replaces this at launch' in small type unless real items were given; never a price unless given); what makes them good (ingredients, how they're cooked); pairings from other sections; a photo; a reserve or call CTA; links to 2–3 other menu sections.",
    faq: "reservations and walk-ins, hours, the menu and dietary needs, groups and events, parking and getting here",
  },
  beauty: {
    items: { name: "Services", path: "/services", one: "service", many: "services", example: "Cuts & Styling, Colour, Facials, Nails" },
    cta: {
      name: "Book Now",
      path: "/book",
      form: "name, phone, email, service select, preferred day and time, stylist or therapist preference, notes",
      about: "how booking works, what to expect at a first appointment, and the cancellation approach (no invented fees or times)",
    },
    visit: {
      name: "Location & Hours",
      path: "/location",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for availability'); the address with the real map embed large; parking and finding us (general, nothing invented); the phone as a tel: link; closing CTA to book.",
    },
    steps: {
      name: "Your Visit",
      path: "/your-visit",
      brief: "Page hero; what an appointment is like from booking to walking out, as a visual timeline (4–5 steps); the consultation; products and hygiene standards (general, no invented brands); how to prepare and aftercare; FAQs; closing CTA to book.",
    },
    gallery: {
      name: "Our Work",
      brief: "Page hero; a lookbook of results and the space, using only the supplied photos and the generated preview photos with short captions; the styles and treatments the team is known for; a review; closing CTA to book.",
    },
    about: "Page hero; the story of the salon or studio in the owner's voice (only facts given); the team and their approach; the space and the experience; what clients say (2–3 reviews); closing CTA.",
    home: [
      "Services: a refined list or cards for every service page ({items}), each linking to its page, plus 'All services' → {itemsPath}.",
      "Results: a lookbook strip of the work (supplied or preview photos), linking to /gallery.",
      "The experience: what a visit feels like, from the welcome to the finish, linking to {stepsPath}.",
      "The team: the people and their approach, linking to /about.",
      "Why clients stay: 4–5 specific, supportable reasons.",
      "A signature service told in more depth.",
      "Location and hours: the real map embed, the address and hours (only if given), linking to {visitPath}.",
    ],
    item: "A detail page for the service \"{name}\". Page hero (breadcrumb Home / Services / {name}); what it is and who it suits; what's included, step by step; how long it takes and how to prepare (general, no invented prices); results (photos if supplied, or a review); aftercare; FAQs; a booking CTA; links to 2–3 related services.",
    faq: "booking and cancellations, services and what suits you, preparing and aftercare, products and hygiene",
  },
  health: {
    items: { name: "Treatments", path: "/treatments", one: "treatment", many: "treatments", example: "Check-ups & Cleaning, Whitening, Implants, Emergency Care" },
    cta: {
      name: "Book an Appointment",
      path: "/book",
      form: "name, phone, email, new or returning patient, reason for visit, preferred day and time, notes",
      about: "how appointments work, what to bring, and how the team confirms (no invented times, prices or insurance claims)",
    },
    visit: {
      name: "Location & Hours",
      path: "/location",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for appointment times'); the address with the real map embed large; parking and access (general, nothing invented); the phone as a tel: link; what to do in an urgent case (call the practice; never medical advice); closing CTA.",
    },
    steps: {
      name: "Your First Visit",
      path: "/first-visit",
      brief: "Page hero; what a first appointment is like from booking to follow-up, as a calm visual timeline (4–5 steps); what to bring; comfort and how nervous patients are looked after; how costs and estimates are explained before treatment (no invented prices or insurance claims); FAQs; closing CTA to book.",
    },
    gallery: {
      name: "Our Practice",
      brief: "Page hero; a look around the practice and the team at work, using only the supplied photos and the generated preview photos with short captions; the standards the practice keeps (general, nothing invented); a review; closing CTA.",
    },
    about: "Page hero; the practice and its philosophy of care (only facts given; never invent qualifications, years or memberships); the team; the standards kept; what patients say (2–3 reviews); closing CTA.",
    home: [
      "Treatments: clear cards for every treatment page ({items}), each linking to its page, plus 'All treatments' → {itemsPath}.",
      "A calm welcome: how the practice looks after people, especially nervous or new patients, linking to {stepsPath}.",
      "The team: the people and their approach to care, linking to /about.",
      "Why patients choose us: 4–5 specific, supportable reasons (no clinical claims or guarantees).",
      "The practice: the rooms and equipment in photos, linking to /gallery.",
      "A common concern answered in more depth, linking to its treatment page.",
      "Location and hours: the real map embed, the address and hours (only if given), linking to {visitPath}.",
    ],
    item: "A detail page for the treatment \"{name}\". Page hero (breadcrumb Home / Treatments / {name}); what it is and who it helps, in plain language; what happens at the appointment, step by step; how to prepare and recovery or aftercare in general terms; common questions; a reassurance panel; a booking CTA; links to 2–3 related treatments. No diagnosis, guarantees, prices or clinical claims.",
    faq: "appointments and what to bring, treatments, comfort and nervous patients, costs and how estimates work",
  },
  professional: {
    items: { name: "Services", path: "/services", one: "service", many: "services", example: "Family Law, Estate Planning, Business Formation, Disputes" },
    cta: {
      name: "Book a Consultation",
      path: "/consultation",
      form: "name, phone, email, what you need help with (select), a short description, preferred way to be contacted",
      about: "what a first consultation covers, what to have ready, and that sending the form creates no professional relationship (no invented fees or outcomes)",
    },
    visit: {
      name: "Areas We Serve",
      path: "/areas",
      brief: "Page hero; the real map embed large with the places served beside it; the office address and hours if given; how meetings work (in person, phone or video, stated generally); 'Not sure if we cover you? Call us'; closing CTA.",
    },
    steps: {
      name: "How We Work",
      path: "/how-we-work",
      brief: "Page hero; working with the firm from first call to finished matter as a visual timeline (4–6 steps), each with what happens and what the client provides; how communication and updates work; how fees are explained up front (no invented prices); confidentiality; FAQs; closing CTA.",
    },
    gallery: {
      name: "Our Firm",
      brief: "Page hero; the office, the team and the firm in the community, using only the supplied photos and the generated preview photos with short captions; the kinds of clients and matters the firm takes on (general; never a named client, case or result); a review; closing CTA.",
    },
    about: "Page hero; the firm and how it works for clients (only facts given; never invent credentials, years, awards or results); the people; the principles as cards; what clients say (2–3 reviews); closing CTA.",
    home: [
      "Services: precise cards for every service page ({items}), each linking to its page, plus 'All services' → {itemsPath}.",
      "Who we help: the situations clients come with, in their own words, each pointing to the right service.",
      "How we work: 3–5 steps from first call to resolution, linking to {stepsPath}.",
      "The firm: the people and principles, linking to /about.",
      "Why clients choose us: 4–5 specific, supportable reasons (no promised outcomes).",
      "A question clients often ask, answered plainly and in depth.",
      "Areas we serve: the real map embed with the places served, linking to {visitPath}.",
    ],
    item: "A detail page for the service \"{name}\". Page hero (breadcrumb Home / Services / {name}); what it covers and who it's for; the situations where people need it; how the firm handles it, step by step; what the client should have ready; common questions answered in general terms (information, not advice; no promised outcomes or prices); a consultation CTA; links to 2–3 related services.",
    faq: "getting started, how the work goes, fees and how they're explained, confidentiality and communication",
  },
  fitness: {
    items: { name: "Classes", path: "/classes", one: "class or programme", many: "classes and programmes", example: "Strength, HIIT, Yoga, Personal Training" },
    cta: {
      name: "Try a Free Class",
      path: "/join",
      form: "name, phone, email, what you're interested in (select), experience level, preferred days",
      about: "how a first visit works and what to bring (write 'free class' only if a free trial was given in the facts; otherwise call it 'Book your first visit'; no invented prices)",
    },
    visit: {
      name: "Location & Hours",
      path: "/location",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for the current schedule'); the address with the real map embed large; parking and finding us (general); the phone as a tel: link; closing CTA.",
    },
    steps: {
      name: "Getting Started",
      path: "/getting-started",
      brief: "Page hero; the first four weeks as a visual timeline: first visit, finding your level, building the habit, seeing progress; what to bring; how coaching works; for complete beginners; memberships explained in general terms (no invented prices); FAQs; closing CTA.",
    },
    gallery: {
      name: "Gallery",
      brief: "Page hero; the space, the equipment and people training, using only the supplied photos and the generated preview photos with short energetic captions; the community; a review; closing CTA.",
    },
    about: "Page hero; why the place exists and who it's for (only facts given); the coaches and their approach; the community; what members say (2–3 reviews); closing CTA.",
    home: [
      "Classes and programmes: bold cards for every page ({items}), each linking to its page, plus 'Everything we offer' → {itemsPath}.",
      "Who it's for: beginners, returners and regulars, each with where to start.",
      "The coaches and the community, linking to /about.",
      "The space: the floor and the kit in photos, linking to /gallery.",
      "Your first month: 4 steps, linking to {stepsPath}.",
      "Why members stay: 4–5 specific, supportable reasons (no promised results).",
      "Location and hours: the real map embed, the address and hours (only if given), linking to {visitPath}.",
    ],
    item: "A detail page for \"{name}\". Page hero (breadcrumb Home / Classes / {name}); what a session is like; who it suits and the level needed; what you'll work on; what to bring; how often to come (general, no promised results); a review or photo; FAQs; a CTA to book a first visit; links to 2–3 related classes.",
    faq: "getting started, classes and levels, memberships in general terms, the facility and what to bring",
  },
  retail: {
    items: { name: "Shop", path: "/shop", one: "product range", many: "product ranges", example: "Bouquets, Gifts, Plants, Wedding Flowers" },
    cta: {
      name: "Make an Enquiry",
      path: "/enquire",
      form: "name, phone, email, what you're looking for (select), when you need it, details",
      about: "how orders, holds and custom requests work, and how quickly the shop replies (no invented times or prices)",
    },
    visit: {
      name: "Visit Us",
      path: "/visit",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for today's hours'); the address with the real map embed large; parking and finding the shop (general); the phone as a tel: link; what you'll find in store; closing CTA.",
    },
    steps: {
      name: "Custom Orders",
      path: "/custom-orders",
      brief: "Page hero; how a special or custom order works from idea to pick-up as a visual timeline (4–5 steps); what the shop needs to know; lead times in general terms (nothing invented); gifts and occasions; an enquiry form with the privacy note; FAQs; closing CTA.",
    },
    gallery: {
      name: "Gallery",
      brief: "Page hero; the shop, the products and the details, using only the supplied photos and the generated preview photos with short captions; what's new or in season (only in general terms); a review; closing CTA.",
    },
    about: "Page hero; the story of the shop in the owner's voice (only facts given); what it stocks and why; the people; what customers say (2–3 reviews); closing CTA.",
    home: [
      "What we sell: photo-led cards for every range ({items}), each linking to its page, plus 'See everything' → {itemsPath}.",
      "Favourites: a few things the shop is known for, shown large (no prices unless given).",
      "The shop: what it's like to visit, with photos, linking to /gallery.",
      "Our story: the people behind the counter, linking to /about.",
      "Custom and special orders, linking to {stepsPath}.",
      "Why customers come back: 4–5 specific, supportable reasons.",
      "Visit us: the real map embed, the address and hours (only if given), linking to {visitPath}.",
    ],
    item: "A page for the range \"{name}\". Page hero (breadcrumb Home / Shop / {name}); what's in the range, as designed tiles with a short description each (plausible for this kind of shop; 'Sample selection — the real range replaces this at launch' in small type unless real items were given; never a price unless given); what makes it good; who it suits or the occasions; a photo; an enquiry CTA; links to 2–3 other ranges.",
    faq: "opening hours and visiting, orders and custom requests, the products, gifts and occasions",
  },
  lodging: {
    items: { name: "Rooms", path: "/rooms", one: "room type or amenity", many: "rooms and amenities", example: "Standard Rooms, Family Suites, Extended Stays, Breakfast" },
    cta: {
      name: "Check Rates",
      path: "/rates",
      form: "name, phone, email, check-in date, check-out date, guests, room type (select), notes",
      about: "how the team replies with open rooms and rates, that nothing is booked until the guest confirms, and check-in and check-out in general terms (no invented prices or times)",
    },
    visit: {
      name: "Location",
      path: "/location",
      brief: "Page hero; the address with the real map embed large; getting here by road (general, nothing invented); parking; front desk hours and check-in if given, otherwise 'Call the front desk'; what's nearby in general terms (never a named attraction that wasn't given); the phone as a tel: link; closing CTA.",
    },
    steps: {
      name: "Your Stay",
      path: "/your-stay",
      brief: "Page hero; a stay from asking about rates to check-out as a calm visual timeline (4–5 steps); what's in every room and what's included (only what was given; otherwise general comforts without specifics); families, work crews and long stays; policies in general terms (no invented fees); FAQs; closing CTA.",
    },
    gallery: {
      name: "Gallery",
      brief: "Page hero; the rooms, the building and the surroundings, using only the supplied photos and the generated preview photos with short captions; what guests notice first; a review; closing CTA to check rates.",
    },
    about: "Page hero; the story of the place and the people who run it (only facts given; warm and general if few are known); what kind of stay it offers and who it suits; what guests say (2–3 reviews); location summary; closing CTA.",
    home: [
      "Rooms: photo-led cards for every room or amenity page ({items}), each linking to its page, plus 'All rooms' → {itemsPath}.",
      "What's included: the comforts guests get (only those given; otherwise general ones without specifics), shown as a calm editorial list, not a card grid.",
      "The place: the building, the rooms and the setting in photos, linking to /gallery.",
      "Who stays here: travellers passing through, families, work crews, long stays, each with what suits them.",
      "Our story: the people who run it, linking to /about.",
      "Your stay, step by step, linking to {stepsPath}.",
      "Location: the real map embed and the address, linking to {visitPath}.",
    ],
    item: "A detail page for \"{name}\". Page hero (breadcrumb Home / Rooms / {name}); what it is and who it suits; what's included (a checklist of only what was given, otherwise general comforts; never a price, size or bed count that wasn't given); photos; how to ask about it; FAQs; a 'Check Rates' CTA; links to 2–3 other rooms or amenities.",
    faq: "rates and booking, check-in and check-out, the rooms and what's included, parking, pets and long stays",
  },
  attraction: {
    items: { name: "What's On", path: "/whats-on", one: "exhibit, tour or programme", many: "exhibits, tours and programmes", example: "Permanent Exhibits, Guided Tours, School Programs, Special Events" },
    cta: {
      name: "Plan Your Visit",
      path: "/plan-your-visit",
      form: "name, phone, email, preferred date, group size, what they're planning (select: a visit, a group or school trip, an event, research, other), notes",
      about: "how the team replies to help plan the visit, group and school bookings, and what happens next (no invented prices, dates or times)",
    },
    visit: {
      name: "Hours & Directions",
      path: "/visit",
      brief: "Page hero; opening hours as a clear table (only the hours given; otherwise 'Call for today's hours'); admission in general terms (never a price unless given); the address with the real map embed large; parking and accessibility in general terms (nothing invented); the phone as a tel: link; closing CTA.",
    },
    steps: {
      name: "Groups & Events",
      path: "/groups",
      brief: "Page hero; the kinds of groups and occasions (schools, families, clubs, tours, private events) as cards; how booking a group visit or an event works in 4–5 steps; what to expect on the day; an enquiry form (name, phone, email, date, group size, details) with the privacy note; FAQs; closing CTA.",
    },
    gallery: {
      name: "Gallery",
      brief: "Page hero; the place, its highlights and visitors enjoying it, using only the supplied photos and the generated preview photos with short captions; what visitors notice first; a review; closing CTA to plan a visit.",
    },
    about: "Page hero; the story of the place and the people who keep it (only facts given; warm and general if few are known); what it is for and who it welcomes; the team or volunteers; what visitors say (2–3 reviews); hours and location summary; closing CTA.",
    home: [
      "What's on: photo-led features for every exhibit, tour or programme page ({items}), each linking to its page, plus 'Everything on offer' → {itemsPath}.",
      "Why visit: what makes the place worth the trip, as an editorial feature with photos (not a card grid).",
      "Groups, schools and events, linking to {stepsPath}.",
      "Our story: the place and the people who keep it, linking to /about.",
      "The place in pictures, linking to /gallery.",
      "What visitors say: 2–3 reviews.",
      "Plan your visit: opening hours (only if given), the real map embed and the address, linking to {visitPath}.",
    ],
    item: "A page for \"{name}\". Page hero (breadcrumb Home / What's On / {name}); what it is and what visitors see or do; who it suits (families, schools, researchers, groups); how to join or book in general terms (never a price, date, time or length that wasn't given); photos; FAQs; a 'Plan Your Visit' CTA; links to 2–3 other things on offer.",
    faq: "opening hours and admission, getting here and parking, group and school visits, accessibility, events and photography",
  },
};

const MATCH: [RegExp, Exclude<Profile["id"], "contractor">][] = [
  [/\b(motel|hotel|inn|lodge|lodging|resort|bed (and|&) breakfast|b&b|guest ?house|hostel|cabins?|campground|rv park|vacation rentals?)\b/i, "lodging"],
  [/\b(restaurant|bar|grill|grille|pub|tavern|saloon|brewery|brewing|taproom|steakhouse|bbq|barbecue|diner|kitchen|eatery|bistro|cantina|taqueria|pizza|pizzeria|sushi|burgers?|wings|cafe|café|coffee|bakery|deli|donuts?|bagels?|ice cream|creamery|food truck|catering)\b/i, "restaurant"],
  [/\b(salon|barber|barbershop|hair|nails?|lash|lashes|brows?|beauty|spa|med ?spa|massage|tattoo|aesthetic|waxing|makeup)\b/i, "beauty"],
  [/\b(dental|dentist|dentistry|orthodont\w*|medical|clinic|doctor|physician|chiropract\w*|physio\w*|physical therapy|therap(y|ist)|optomet\w*|eye care|dermatolog\w*|pediatric\w*|veterinar\w*|vet|animal hospital|hospital|urgent care|counsel(l)?ing)\b/i, "health"],
  [/\b(law|lawyers?|attorneys?|legal|accounting|accountants?|cpa|bookkeep\w*|tax|insurance|financial|wealth|advisors?|mortgage|real estate|realty|realtors?|consult\w*|notary|architect\w*|marketing agency)\b/i, "professional"],
  [/\b(gym|fitness|yoga|pilates|crossfit|boxing|martial arts|karate|jiu[- ]?jitsu|dance|personal train\w*|bootcamp|climbing)\b/i, "fitness"],
  [/\b(boutique|florist|flowers|store|shop|market|jewel\w*|bookstore|gift|gifts|furniture|nursery|garden cent(er|re)|bike shop|pet store|thrift|antiques?)\b/i, "retail"],
  // Last, so a more specific kind wins ("Gallery Salon" is a salon, "Temple Family Dental" a dentist).
  [/\b(museums?|galler(y|ies)|historic(al)? (site|society|house|home|village)|heritage|monument|tours?|zoo|aquarium|botanical gardens?|arboretum|planetarium|science cent(er|re)|nature cent(er|re)|(water|amusement|theme|trampoline|state|national) park|theat(re|er)|playhouse|cinema|event (venue|space|center|centre)|wedding venue|venue|escape rooms?|bowling|arcade|mini ?golf|golf (course|club)|winery|vineyard|farm|orchard|pumpkin patch|church|ministr(y|ies)|temple|mosque|synagogue|community cent(er|re)|library|nonprofit|foundation)\b/i, "attraction"],
];
/** Trades that travel to the customer keep the contractor pages even if a word above appears ("Spa Repair", "Bar Stool Refinishing"). */
const TRADE = /\b(plumb\w*|hvac|heating|cooling|air condition\w*|roof\w*|electric\w*|landscap\w*|lawn|tree|cleaning|cleaners?|maid|janitorial|pest|exterminat\w*|remodel\w*|construction|contractors?|painting|painters?|flooring|fenc\w*|concrete|paving|masonry|handyman|garage doors?|locksmith|moving|movers|pressure wash\w*|pool (service|repair|cleaning)|repair|installation|restoration|towing|septic|gutter\w*|siding|windows?|drywall|insulation|solar|irrigation|junk|hauling|detailing)\b/i;

/** Resale shops take donations: that, not custom orders, is the page they need. */
const RESALE = /\b(thrift|resale|consignment|second[- ]?hand|charity shop|goodwill|habitat restore|donation)\b/i;
const DONATE: Pick<Profile, "steps"> = {
  steps: {
    name: "Donate",
    path: "/donate",
    brief: "Page hero; what the shop gladly takes and what it can't (in general terms unless a list was given); how to drop off, step by step (where and when only if given; otherwise 'Call before you bring large items'); what happens to donations; a short donation enquiry form (name, phone, what you'd like to donate, large items yes or no) with the privacy note; FAQs; closing CTA.",
  },
};

export function profileFor(i: { industry?: string; businessName?: string; services?: string }): Profile {
  const p = baseProfile(i);
  return p.id === "retail" && RESALE.test(`${i.industry ?? ""} ${i.businessName ?? ""} ${i.services ?? ""}`) ? { ...p, ...DONATE } : p;
}

function baseProfile(i: { industry?: string; businessName?: string; services?: string }): Profile {
  const contractor = { id: "contractor" } as Profile;
  // The trade that was typed (or worked out by the planner) decides; the name is only a hint.
  const trade = i.industry ?? "";
  if (trade) {
    if (TRADE.test(trade)) return contractor;
    const hit = MATCH.find(([re]) => re.test(trade));
    return hit ? { id: hit[1], ...P[hit[1]] } : contractor;
  }
  const text = `${i.businessName ?? ""} ${i.services ?? ""}`;
  if (TRADE.test(text)) return contractor;
  const hit = MATCH.find(([re]) => re.test(text));
  return hit ? { id: hit[1], ...P[hit[1]] } : contractor;
}
