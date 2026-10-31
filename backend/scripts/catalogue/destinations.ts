/**
 * destinations.ts (catalogue) — the Indian destinations the import script fetches places for.
 *
 * Each has a centre and a search radius (km) for Wikidata. Destinations already in
 * src/data/destinations.json list only slug, centre and radius here — their other fields stay
 * as they are. New ones also carry their written fields:
 *   summary, vibes, budgetTier, avgDailyCost  written by us; costs are ESTIMATES in INR per
 *                                             person per day (stay + food + local transport)
 *   bestMonths                                from frontend/src/world/regionMonths.ts where the
 *                                             place is listed there, otherwise general season
 *   localName                                 the name in Devanagari
 * Highlights and the photo are filled in by the import script from the place catalogue.
 */
/** Explore vibes (same list as the website's filters). */
type Vibe = 'beach' | 'mountains' | 'culture' | 'food' | 'nature' | 'adventure' | 'spiritual' | 'city' | 'romantic' | 'party';
/** Budget levels. */
type BudgetTier = 'budget' | 'mid' | 'luxury';

/** Months from a to b inclusive (wrapping past December). */
function span(a: number, b: number): number[] {
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b) return out;
  }
}

/** Where to look for places. */
export interface Search {
  slug: string;
  /** [latitude, longitude] */
  centre: [number, number];
  radiusKm: number;
}

/** A new destination's written fields. */
export interface NewDestination extends Search {
  name: string;
  localName: string;
  region: 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters';
  vibes: Vibe[];
  budgetTier: BudgetTier;
  avgDailyCost: number;
  bestMonths: number[];
  summary: string;
}

/** Destinations already in destinations.json: just where to search. */
export const EXISTING: Search[] = [
  { slug: 'goa', centre: [15.4909, 73.8278], radiusKm: 35 },
  { slug: 'manali', centre: [32.2432, 77.1892], radiusKm: 15 },
  { slug: 'jaipur', centre: [26.9124, 75.7873], radiusKm: 15 },
  { slug: 'kerala', centre: [9.4981, 76.3388], radiusKm: 25 },
  { slug: 'ladakh', centre: [34.1526, 77.5771], radiusKm: 35 },
  { slug: 'varanasi', centre: [25.3176, 82.9739], radiusKm: 10 },
];

/** New destinations, by world. */
export const NEW: NewDestination[] = [
  // ── Himalaya ──
  { slug: 'rishikesh', name: 'Rishikesh', localName: 'ऋषिकेश', region: 'himalaya', centre: [30.0869, 78.2676], radiusKm: 10, vibes: ['spiritual', 'adventure', 'nature'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: [...span(2, 4), ...span(9, 11)], summary: 'Yoga capital on the Ganga: suspension bridges, evening aarti and white-water rafting.' },
  { slug: 'dharamshala', name: 'Dharamshala & McLeod Ganj', localName: 'धर्मशाला', region: 'himalaya', centre: [32.219, 76.3234], radiusKm: 10, vibes: ['mountains', 'spiritual', 'nature'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Little Lhasa under the Dhauladhars: monasteries, Tibetan momos and the Triund trek.' },
  { slug: 'shimla', name: 'Shimla', localName: 'शिमला', region: 'himalaya', centre: [31.1048, 77.1734], radiusKm: 12, vibes: ['mountains', 'romantic', 'nature'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: [...span(3, 6), ...span(10, 12)], summary: 'The old summer capital: Mall Road, colonial churches and the toy train through the hills.' },
  { slug: 'spiti', name: 'Spiti Valley', localName: 'स्पीति', region: 'himalaya', centre: [32.227, 78.0716], radiusKm: 45, vibes: ['mountains', 'adventure', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(6, 9), summary: 'A cold desert at 3,800 m: cliff-top monasteries, fossil villages and endless night skies.' },
  { slug: 'darjeeling', name: 'Darjeeling', localName: 'दार्जिलिंग', region: 'himalaya', centre: [27.041, 88.2663], radiusKm: 12, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 5), 10, 11], summary: 'Tea gardens, the toy train and Kanchenjunga at sunrise from Tiger Hill.' },
  { slug: 'gangtok', name: 'Gangtok', localName: 'गंगटोक', region: 'himalaya', centre: [27.3389, 88.6065], radiusKm: 20, vibes: ['mountains', 'spiritual', 'nature'], budgetTier: 'mid', avgDailyCost: 3200, bestMonths: [...span(3, 5), ...span(10, 12)], summary: 'Sikkim’s tidy hill capital: monasteries, MG Marg and high lakes towards Nathu La.' },

  // ── Thar ──
  { slug: 'jaisalmer', name: 'Jaisalmer', localName: 'जैसलमेर', region: 'thar', centre: [26.9157, 70.9083], radiusKm: 15, vibes: ['culture', 'adventure', 'romantic'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 3), summary: 'The Golden City: a living sandstone fort, carved havelis and nights on the Thar dunes.' },
  { slug: 'jodhpur', name: 'Jodhpur', localName: 'जोधपुर', region: 'thar', centre: [26.2389, 73.0243], radiusKm: 12, vibes: ['culture', 'food', 'city'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 3), summary: 'The Blue City under Mehrangarh Fort, with spice markets and stepwells in the old town.' },
  { slug: 'udaipur', name: 'Udaipur', localName: 'उदयपुर', region: 'thar', centre: [24.5854, 73.7125], radiusKm: 12, vibes: ['romantic', 'culture', 'city'], budgetTier: 'mid', avgDailyCost: 4000, bestMonths: span(9, 3), summary: 'The City of Lakes: palaces on Lake Pichola, rooftop sunsets and old-city lanes.' },
  { slug: 'pushkar', name: 'Pushkar', localName: 'पुष्कर', region: 'thar', centre: [26.4897, 74.5511], radiusKm: 8, vibes: ['spiritual', 'culture', 'party'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 3), summary: 'A holy lake ringed by 52 ghats, the rare Brahma temple and the famous camel fair.' },
  { slug: 'bikaner', name: 'Bikaner', localName: 'बीकानेर', region: 'thar', centre: [28.0229, 73.3119], radiusKm: 30, vibes: ['culture', 'food', 'adventure'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: span(10, 3), summary: 'Junagarh Fort, the camel research farm and the original home of bhujia.' },

  // ── Gangetic Plains ──
  { slug: 'agra', name: 'Agra', localName: 'आगरा', region: 'ganga', centre: [27.1767, 78.0081], radiusKm: 12, vibes: ['culture', 'romantic', 'city'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 3), summary: 'The Taj Mahal at dawn, Agra Fort and Mughal tombs along the Yamuna.' },
  { slug: 'delhi', name: 'Delhi', localName: 'दिल्ली', region: 'ganga', centre: [28.6139, 77.209], radiusKm: 15, vibes: ['city', 'food', 'culture'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: span(10, 3), summary: 'Seven cities in one: Old Delhi’s food lanes, Mughal tombs and Lutyens’ boulevards.' },
  { slug: 'amritsar', name: 'Amritsar', localName: 'अमृतसर', region: 'ganga', centre: [31.634, 74.8723], radiusKm: 12, vibes: ['spiritual', 'food', 'culture'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: span(10, 3), summary: 'The Golden Temple’s langar, Jallianwala Bagh and kulchas worth the trip alone.' },
  { slug: 'bodh-gaya', name: 'Bodh Gaya', localName: 'बोधगया', region: 'ganga', centre: [24.6961, 84.9869], radiusKm: 8, vibes: ['spiritual', 'culture'], budgetTier: 'budget', avgDailyCost: 1800, bestMonths: span(10, 3), summary: 'Where the Buddha found enlightenment: the Mahabodhi Temple and monasteries of many nations.' },
  { slug: 'lucknow', name: 'Lucknow', localName: 'लखनऊ', region: 'ganga', centre: [26.8467, 80.9462], radiusKm: 12, vibes: ['food', 'culture', 'city'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 3), summary: 'Nawabi city of kebabs and chikan embroidery, with the Bara Imambara’s maze.' },

  // ── Deccan Plateau ──
  { slug: 'hampi', name: 'Hampi', localName: 'हम्पी', region: 'deccan', centre: [15.335, 76.462], radiusKm: 8, vibes: ['culture', 'adventure', 'nature'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 2), summary: 'The ruined Vijayanagara capital among giant boulders, with sunrise from Matanga Hill.' },
  { slug: 'hyderabad', name: 'Hyderabad', localName: 'हैदराबाद', region: 'deccan', centre: [17.385, 78.4867], radiusKm: 15, vibes: ['food', 'culture', 'city'], budgetTier: 'mid', avgDailyCost: 3200, bestMonths: span(10, 2), summary: 'Charminar, Golconda Fort and the biryani the city is famous for.' },
  { slug: 'ellora', name: 'Ellora & Aurangabad', localName: 'एलोरा', region: 'deccan', centre: [19.95, 75.25], radiusKm: 25, vibes: ['culture', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(7, 3), summary: 'The rock-cut Kailasa temple, Buddhist and Jain caves, and Daulatabad’s hill fort.' },
  { slug: 'mysuru', name: 'Mysuru', localName: 'मैसूरु', region: 'deccan', centre: [12.2958, 76.6394], radiusKm: 15, vibes: ['culture', 'city', 'food'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 2), summary: 'The illuminated Mysore Palace, Chamundi Hill and silk, sandalwood and Mysore pak.' },
  { slug: 'badami', name: 'Badami, Aihole & Pattadakal', localName: 'बादामी', region: 'deccan', centre: [15.95, 75.75], radiusKm: 20, vibes: ['culture', 'adventure'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 2), summary: 'Chalukya cave temples above a red-sandstone lake, and the cradle of temple architecture.' },
  { slug: 'bijapur', name: 'Vijayapura (Bijapur)', localName: 'विजयपुरा', region: 'deccan', centre: [16.8302, 75.71], radiusKm: 10, vibes: ['culture'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 2), summary: 'The Gol Gumbaz whispering gallery and the Adil Shahi tombs and mosques.' },

  // ── Western Ghats ──
  { slug: 'munnar', name: 'Munnar', localName: 'मुन्नार', region: 'ghats', centre: [10.0889, 77.0595], radiusKm: 20, vibes: ['nature', 'mountains', 'romantic'], budgetTier: 'mid', avgDailyCost: 3200, bestMonths: span(9, 3), summary: 'Tea estates rolling over the hills, misty viewpoints and the Nilgiri tahr of Eravikulam.' },
  { slug: 'coorg', name: 'Coorg', localName: 'कूर्ग', region: 'ghats', centre: [12.4244, 75.7382], radiusKm: 30, vibes: ['nature', 'food', 'romantic'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: span(10, 3), summary: 'Coffee estates, waterfalls and Kodava pork curry in the misty hills of Kodagu.' },
  { slug: 'ooty', name: 'Ooty', localName: 'ऊटी', region: 'ghats', centre: [11.4102, 76.695], radiusKm: 15, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'The Nilgiri toy train, botanical gardens and tea country around the lake.' },
  { slug: 'wayanad', name: 'Wayanad', localName: 'वायनाड', region: 'ghats', centre: [11.6854, 76.132], radiusKm: 35, vibes: ['nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 5), summary: 'Rainforest, the Edakkal caves’ ancient carvings and wildlife at Muthanga.' },
  { slug: 'kodaikanal', name: 'Kodaikanal', localName: 'कोडैकनाल', region: 'ghats', centre: [10.2381, 77.4892], radiusKm: 15, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: [...span(3, 6), 9, 10], summary: 'A star-shaped lake, pine forests and cliff-edge views over the plains.' },
  { slug: 'mahabaleshwar', name: 'Mahabaleshwar', localName: 'महाबळेश्वर', region: 'ghats', centre: [17.9237, 73.6586], radiusKm: 15, vibes: ['nature', 'romantic', 'mountains'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 5), summary: 'Strawberry farms, Sahyadri viewpoints and Shivaji’s Pratapgad fort nearby.' },

  // ── Konkan & Malabar ──
  { slug: 'kochi', name: 'Kochi', localName: 'कोच्चि', region: 'konkan', centre: [9.9312, 76.2673], radiusKm: 12, vibes: ['culture', 'food', 'city'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 3), summary: 'Chinese fishing nets, Jew Town’s spice lanes and Kathakali in Fort Kochi.' },
  { slug: 'mumbai', name: 'Mumbai', localName: 'मुंबई', region: 'konkan', centre: [18.94, 72.835], radiusKm: 15, vibes: ['city', 'food', 'party'], budgetTier: 'mid', avgDailyCost: 4500, bestMonths: span(11, 2), summary: 'Gateway of India, Marine Drive at night and vada pav on every corner.' },
  { slug: 'gokarna', name: 'Gokarna', localName: 'गोकर्ण', region: 'konkan', centre: [14.5479, 74.3188], radiusKm: 12, vibes: ['beach', 'spiritual', 'nature'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 3), summary: 'A temple town with quiet coves — Om, Kudle and Half Moon beaches on a cliff trail.' },
  { slug: 'varkala', name: 'Varkala', localName: 'वर्कला', region: 'konkan', centre: [8.7379, 76.7163], radiusKm: 10, vibes: ['beach', 'spiritual', 'romantic'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(11, 3), summary: 'Red laterite cliffs above the Arabian Sea, with cafés on the edge and a 2,000-year-old temple.' },

  // ── Seven Sisters ──
  { slug: 'shillong', name: 'Shillong', localName: 'शिलांग', region: 'sisters', centre: [25.5788, 91.8933], radiusKm: 15, vibes: ['nature', 'city', 'romantic'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 4), summary: 'The Scotland of the East: pine hills, Ward’s Lake, live music and waterfalls nearby.' },
  { slug: 'cherrapunji', name: 'Cherrapunji (Sohra)', localName: 'चेरापूंजी', region: 'sisters', centre: [25.2702, 91.7323], radiusKm: 20, vibes: ['nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 5), summary: 'Living root bridges, plunging waterfalls and caves in one of the wettest places on earth.' },
  { slug: 'tawang', name: 'Tawang', localName: 'तवांग', region: 'sisters', centre: [27.5861, 91.8594], radiusKm: 30, vibes: ['mountains', 'spiritual', 'adventure'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 6), 9, 10], summary: 'India’s largest monastery at 3,000 m, high lakes and the drive over Sela Pass.' },
  { slug: 'kaziranga', name: 'Kaziranga', localName: 'काज़ीरंगा', region: 'sisters', centre: [26.5775, 93.1711], radiusKm: 30, vibes: ['nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 4000, bestMonths: span(11, 4), summary: 'Home of two-thirds of the world’s one-horned rhinos; jeep and elephant-grass safaris.' },
  { slug: 'kohima', name: 'Kohima', localName: 'कोहिमा', region: 'sisters', centre: [25.6751, 94.1086], radiusKm: 15, vibes: ['culture', 'nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 5), summary: 'Naga hill capital: the WWII cemetery, Dzukou Valley and the Hornbill Festival in December.' },
  { slug: 'majuli', name: 'Majuli', localName: 'माजुली', region: 'sisters', centre: [26.95, 94.1667], radiusKm: 25, vibes: ['spiritual', 'culture', 'nature'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 3), summary: 'A huge river island on the Brahmaputra with Vaishnavite satras and mask-making.' },
  { slug: 'ziro', name: 'Ziro', localName: 'ज़ीरो', region: 'sisters', centre: [27.594, 93.838], radiusKm: 15, vibes: ['nature', 'culture', 'party'], budgetTier: 'mid', avgDailyCost: 2500, bestMonths: span(3, 10), summary: 'Apatani villages and rice fields in a pine valley, home of the Ziro music festival.' },
];
