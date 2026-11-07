/** The words on the public Forge website: trades, guides, questions and the default price packs. */

export interface Trade {
  slug: string;
  /** Singular, as in "a plumber". */
  name: string;
  /** Plural, as in "plumbers". */
  who: string;
  /** What a customer of this trade searches for, used in headlines. */
  search: string;
  services: string[];
  /** The one thing that costs this trade customers online. */
  pain: string;
  group: "Home services" | "Health & beauty" | "Food & retail" | "Professional & auto";
}

export const TRADES: Trade[] = [
  { slug: "plumbers", name: "Plumber", who: "plumbers", search: "emergency plumber near me", services: ["Drain Cleaning", "Water Heaters", "Leak Repair", "Repiping", "Emergency Calls"], pain: "People with a burst pipe call the first plumber whose site loads fast and shows a phone number.", group: "Home services" },
  { slug: "electricians", name: "Electrician", who: "electricians", search: "licensed electrician near me", services: ["Panel Upgrades", "Rewiring", "Lighting", "EV Chargers", "Safety Inspections"], pain: "Homeowners look for a licence number and proof of work before they let anyone near their wiring.", group: "Home services" },
  { slug: "hvac", name: "HVAC company", who: "HVAC companies", search: "AC repair near me", services: ["AC Repair", "New Installations", "Maintenance Plans", "Duct Cleaning", "Heating"], pain: "In a heatwave, the company that answers first and looks trustworthy gets the job.", group: "Home services" },
  { slug: "roofers", name: "Roofer", who: "roofers", search: "roof repair near me", services: ["Roof Repair", "Replacements", "Storm Damage", "Inspections", "Gutters"], pain: "A roof is a five-figure decision; people judge the company by how it presents itself online.", group: "Home services" },
  { slug: "landscapers", name: "Landscaper", who: "landscapers", search: "lawn care near me", services: ["Lawn Care", "Landscape Design", "Tree Trimming", "Irrigation", "Hardscaping"], pain: "Landscaping is visual; a site without strong photos loses to one with them.", group: "Home services" },
  { slug: "cleaning", name: "Cleaning company", who: "cleaning companies", search: "house cleaning near me", services: ["Home Cleaning", "Deep Cleaning", "Move-Out Cleaning", "Office Cleaning", "Recurring Visits"], pain: "Customers let strangers into their homes, so they want to see who they are hiring.", group: "Home services" },
  { slug: "pest-control", name: "Pest control company", who: "pest control companies", search: "pest control near me", services: ["Ants & Roaches", "Termites", "Rodents", "Mosquito Control", "Quarterly Plans"], pain: "Pest problems are urgent and embarrassing; people want a fast, discreet answer.", group: "Home services" },
  { slug: "painters", name: "Painter", who: "painters", search: "house painter near me", services: ["Interior Painting", "Exterior Painting", "Cabinet Refinishing", "Pressure Washing", "Color Consulting"], pain: "Painters are chosen on before-and-after photos and reviews, not on price lists.", group: "Home services" },
  { slug: "contractors", name: "General contractor", who: "contractors", search: "home remodeling contractor", services: ["Kitchen Remodels", "Bathroom Remodels", "Additions", "Flooring", "Permits & Planning"], pain: "Big projects need big trust: licence, insurance and a portfolio all have to be visible.", group: "Home services" },
  { slug: "dentists", name: "Dentist", who: "dentists", search: "dentist near me", services: ["Cleanings & Exams", "Whitening", "Implants", "Invisalign", "Emergency Dentistry"], pain: "New patients choose a dentist from the website first; an outdated site reads as an outdated practice.", group: "Health & beauty" },
  { slug: "salons", name: "Salon", who: "salons", search: "hair salon near me", services: ["Cuts & Styling", "Color", "Treatments", "Bridal", "Extensions"], pain: "Salons sell a look; the site has to look like the salon feels.", group: "Health & beauty" },
  { slug: "fitness", name: "Gym or studio", who: "gyms and studios", search: "gym near me", services: ["Memberships", "Personal Training", "Group Classes", "Nutrition", "Free Trial"], pain: "People pick a gym by the vibe they see online and the speed of the sign-up.", group: "Health & beauty" },
  { slug: "restaurants", name: "Restaurant", who: "restaurants", search: "best restaurant near me", services: ["Menu", "Reservations", "Catering", "Private Events", "Takeout"], pain: "Diners decide on the menu and the photos; if they can't find either, they go elsewhere.", group: "Food & retail" },
  { slug: "retail", name: "Local shop", who: "local shops", search: "boutique near me", services: ["Featured Products", "New Arrivals", "Gift Cards", "Events", "Visit Us"], pain: "A shop's site has to make people want to walk in the door.", group: "Food & retail" },
  { slug: "auto-repair", name: "Auto repair shop", who: "auto repair shops", search: "auto repair near me", services: ["Oil Changes", "Brakes", "Diagnostics", "Tires", "A/C Service"], pain: "Car owners fear being overcharged, so they pick the shop that looks honest and open about prices.", group: "Professional & auto" },
  { slug: "real-estate", name: "Real estate agent", who: "real estate agents", search: "real estate agent near me", services: ["Buying", "Selling", "Home Valuation", "Neighborhoods", "Testimonials"], pain: "Agents compete on personal brand, so the site is their storefront.", group: "Professional & auto" },
  { slug: "law-firms", name: "Law firm", who: "law firms", search: "attorney near me", services: ["Practice Areas", "Free Consultation", "Case Results", "Attorney Profiles", "FAQ"], pain: "Clients under stress look for credibility and a clear next step.", group: "Professional & auto" },
];

export const tradeBySlug = (slug: string) => TRADES.find((t) => t.slug === slug);
export const TRADE_GROUPS = ["Home services", "Health & beauty", "Food & retail", "Professional & auto"] as const;

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  { q: "What is Forge?", a: "Forge designs a complete, multi-page website for a local business from just its name and location (and its current website or Google listing, when it has one). Business owners use it to get a site they'd be proud of; agencies and freelancers use it to show every prospect a finished site before they pay." },
  { q: "How fast is a build?", a: "A new site is usually ready in minutes. Forge plans the pages, writes the copy, makes the photos and puts the forms, map and chat in place on its own." },
  { q: "What does a site include?", a: "A home page plus the pages a local business actually needs: services (with a page for each), about, reviews, gallery, service areas, FAQs, quote and contact forms, a map and the legal pages. Every page shares one design, works on phones and has a light and a dark mode." },
  { q: "Is the preview really free?", a: "Yes. Tell us the business and we'll build a complete preview and send you the link. If you'd like it launched on your domain, we'll talk you through the options; there's nothing to pay to see it." },
  { q: "What is a credit?", a: "For partners, one credit is one finished site. If a build fails, the credit is refunded automatically. Re-designing the same business with new instructions uses a new credit." },
  { q: "Can I put my own brand on it?", a: "Partners can. The small credit line at the bottom of every site can carry your agency's name and link, or be removed altogether." },
  { q: "Where do people see the site?", a: "Every site has its own link. Send it by text or email, add it to a GoHighLevel page, or load it into your own system with the API and webhooks." },
  { q: "How do partners pay?", a: "Partners buy credit packs online through a secure payment link, or by invoice from Mianro Systems. We add the credits as soon as the payment arrives." },
  { q: "Who owns the site?", a: "The site you commission is yours. Partners own the previews they build in their account, and when a client signs we help move it onto the client's domain." },
  { q: "Is my data safe?", a: "Each account only ever sees its own sites and form submissions. Sign-in is rate-limited, passwords are stored hashed, sites run isolated from the app, and any account can be switched off at once." },
];

export interface Guide {
  slug: string;
  title: string;
  blurb: string;
  read: string;
  body: { h: string; p: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "demo-first-selling",
    title: "Why demo-first beats pitch-first when you sell websites",
    blurb: "A finished preview answers the question every owner has: what would mine look like?",
    read: "4 min",
    body: [
      { h: "The owner can't picture it", p: ["Most small business owners have never commissioned a website. When you describe one, they imagine something generic, and generic is easy to say no to.", "A preview of their site, with their name, their services and their city on it, turns an abstract pitch into a specific decision."] },
      { h: "What a good demo contains", p: ["It uses the real business name and trade, shows believable services and a working contact form, and feels like a finished site rather than a template. It should load fast and look right on a phone, because that is where the owner will open it.", "Lead with the home page. If they like it, the inner pages sell the rest."] },
      { h: "How to send it", p: ["Keep the message short: who you are, why you built it, the link. Say the preview is free and that you can change anything. Follow up once, a couple of days later, with one question: \"What would you change first?\"", "That question starts a conversation about their business instead of a debate about your price."] },
      { h: "Where it fits", p: ["Demo-first works best for businesses with a weak or missing website: plumbers, dentists, salons, restaurants. If you can see the problem in thirty seconds, you can show the fix in the same time."] },
    ],
  },
  {
    slug: "what-to-charge-local-business-website",
    title: "What to charge for a local business website",
    blurb: "A simple way to price a site so it's easy to say yes to and still profitable.",
    read: "5 min",
    body: [
      { h: "Start from the value, not your hours", p: ["A local service business that wins one extra job a month from its site often covers the whole cost within weeks. Price against that, not against the time you spent."] },
      { h: "Two numbers: set-up and monthly", p: ["Most agencies charge a one-off build fee and a monthly fee for hosting, edits and support. The monthly part is what turns a project into a business.", "Keep the first number low enough that a small owner decides on the spot, and the second easy to explain: hosting, small edits, and someone to call."] },
      { h: "Know your cost to deliver", p: ["With Forge, a preview costs you one credit and a few minutes. The finishing work, domain, hosting and edits, is where your time goes. Work out your real hours for that and price from there."] },
      { h: "Don't discount, add", p: ["If an owner hesitates, add something they value (an extra page, a month of edits) instead of cutting the price. It protects your rate and still feels like a win to them."] },
    ],
  },
  {
    slug: "white-label-website-reselling",
    title: "White-label website reselling, explained",
    blurb: "How agencies resell a service built by someone else, under their own name.",
    read: "4 min",
    body: [
      { h: "What white-label means", p: ["You sell the service under your brand. Your client sees your agency, your emails and your invoices; the tool that does the building stays in the background."] },
      { h: "What you control", p: ["The credit line on each site can carry your name and link. You pick the businesses to target, set your own prices, and own the relationship with the client."] },
      { h: "What to check before you start", p: ["Ask who owns the finished work, what happens if a build fails, how credits are counted, and whether you can export what you've made. A good partner answers all four in plain words."] },
      { h: "A realistic first month", p: ["Pick one trade and one city. Build ten previews, send them, follow up once. Learn which message and which trade respond, then repeat with the better one."] },
    ],
  },
  {
    slug: "local-business-website-checklist",
    title: "The website checklist every local business needs",
    blurb: "Eleven things a local site must do. Use it to audit a prospect's current site.",
    read: "3 min",
    body: [
      { h: "Be found and be clear", p: ["The business name, city and what it does should be obvious in the first screen. The phone number should be tappable on a phone, and the address should match its Google listing exactly."] },
      { h: "Make the next step easy", p: ["One primary button (call, get a quote, book) visible without scrolling. A short form that asks for as little as possible. A map and opening hours."] },
      { h: "Show proof", p: ["Real reviews, photos of real work, licences and insurance where relevant. Proof turns a stranger into a customer."] },
      { h: "Cover the basics", p: ["Fast on mobile, readable text, working links, privacy and terms pages. These are the things owners don't notice until a customer does."] },
    ],
  },
  {
    slug: "cold-outreach-with-a-ready-made-demo",
    title: "Cold outreach that works when you attach a ready-made demo",
    blurb: "A short, honest message and one link. Here is the structure.",
    read: "4 min",
    body: [
      { h: "Open with what you did", p: ["\"I made a preview of a new website for your business.\" It is specific, it takes no effort to say yes to, and it is true."] },
      { h: "Keep it to four lines", p: ["Who you are. What you built. The link. A single question. Long messages read like sales pitches; short ones read like a favour."] },
      { h: "Follow up once", p: ["Two days later, ask whether they had a look. If there is no reply, stop. Respect is part of the pitch, and a clean exit leaves the door open."] },
      { h: "Use the right channel", p: ["Email or the business's own contact form for professional services; text or WhatsApp where that's how the trade talks. Always follow local rules on unsolicited messages."] },
    ],
  },
  {
    slug: "choosing-niches-to-sell-to",
    title: "Choosing which local trades to sell websites to",
    blurb: "Look for high job values, urgent needs and weak current sites.",
    read: "3 min",
    body: [
      { h: "High value per customer", p: ["Roofers, dentists and remodelers earn a lot from one new customer, so they can justify paying for a good site."] },
      { h: "Urgent searches", p: ["Plumbers, HVAC and pest control are chosen in a hurry. Being first to load with a clear phone number matters more than polish."] },
      { h: "Weak sites you can see", p: ["Search the trade in your city and open the first ten results. If half look dated, that is your market."] },
      { h: "Start narrow", p: ["One trade and one city lets you reuse the same message and the same proof. Widen once it works."] },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

export interface Plan {
  name: string;
  credits: number;
  price: string;
  blurb: string;
  featured?: boolean;
  /** A Stripe or GoHighLevel payment link (https). Without one, choosing the pack opens the partner application. */
  payUrl?: string;
}

/** Starting prices. Mianro staff can change them under Admin → Website. */
export const DEFAULT_PLANS: Plan[] = [
  { name: "Starter", credits: 10, price: "$59", blurb: "Try Forge on your first ten prospects." },
  { name: "Agency", credits: 50, price: "$249", blurb: "A steady month of outreach for one trade.", featured: true },
  { name: "Studio", credits: 200, price: "$799", blurb: "For teams building previews every day." },
];

export const INCLUDED = [
  "A multi-page site per business: home, services, about, reviews, gallery, contact and legal pages",
  "AI-made photos and a hero video that suits the trade",
  "Contact and quote forms, with every submission saved for you",
  "Google Map and opening hours on the contact page",
  "A footer credit line that can carry your name, or none",
  "Unlimited team members and a webhook for your own system",
  "A refund of the credit if a build ever fails",
];

export const STEPS = [
  { n: "1", t: "Type the business", d: "A name and city, or paste its Google Maps link. If it has a website, Forge reads the details from it." },
  { n: "2", t: "Forge designs it", d: "AI plans the pages, writes the copy, makes the photos and builds a design that fits the trade." },
  { n: "3", t: "Share the link", d: "Send it by email, drop it on a GoHighLevel page, or let your own system pick it up through the API." },
  { n: "4", t: "Win the client", d: "When they say yes, you finish and publish. Their form submissions are already being captured." },
];
