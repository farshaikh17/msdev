/** A business's trade put into one of a few plain groups, so a gallery of sites can be scanned and filtered. */
export const NICHES = ["Home services", "Food & drink", "Beauty & health", "Auto", "Shops", "Places & leisure", "Professional services", "Other"] as const;
export type Niche = (typeof NICHES)[number];

const RULES: [Niche, RegExp][] = [
  ["Auto", /\b(auto|car|cars|vehicle|tire|tyre|wheel|mechanic|garage|body ?shop|detailing|towing|oil change|truck)\b/i],
  ["Beauty & health", /\b(beauty|spa|med ?spa|salon|hair|barber|nail|lash|brow|skin|aesthetic|massage|dental|dentist|clinic|chiro|physio|therapy|wellness|fitness|gym|yoga|pilates|doctor|medical|pharmacy|tattoo)\b/i],
  ["Food & drink", /\b(restaurant|cafe|café|coffee|bakery|bar|grill|pizza|burger|diner|food|kitchen|seafood|bbq|taco|catering|brewery|winery|deli|donut|waffle|ice cream|market|grocery|superette|farmers)\b/i],
  ["Home services", /\b(plumb|electric|hvac|air condition|heating|cooling|roof|paving|paint|landscap|lawn|tree|pest|wildlife|clean|pressure wash|handyman|construction|contractor|remodel|floor|fenc|pool|window|gutter|garage door|lock|moving|junk|septic|well|solar|lighting)/i],
  ["Shops", /\b(shop|store|boutique|thrift|retail|florist|flower|gift|jewel|furniture|hardware|paint store|pawn|liquor|vape)\b/i],
  ["Places & leisure", /\b(museum|escape|gallery|park|motel|hotel|inn|lodge|resort|casino|venue|event|theater|theatre|cinema|bowling|golf|club|church|school|library|warehouse|storage|fuel|gas station)\b/i],
  ["Professional services", /\b(law|lawyer|attorney|account|tax|insurance|real estate|realtor|consult|agency|marketing|financial|bank|notary|architect|engineer|vet|veterinar)\b/i],
];

/** "Medical Spa" → "Beauty & health". The trade is read first, then the business name if the trade says nothing. */
export function nicheOf(trade: string, name = ""): Niche {
  for (const text of [trade, name]) for (const [niche, re] of RULES) if (text && re.test(text)) return niche;
  return "Other";
}
