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
  // Batch 2 — Sikkim & Darjeeling hills
  { slug: 'pelling', name: 'Pelling', localName: 'पेलिंग', region: 'himalaya', centre: [27.3006, 88.2366], radiusKm: 15, vibes: ['mountains', 'spiritual', 'nature'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 5), ...span(10, 12)], summary: 'Kanchenjunga at arm’s length, Pemayangtse Monastery and the ruins of Rabdentse, Sikkim’s old capital.' },
  { slug: 'lachung', name: 'Lachung & Yumthang', localName: 'लाचुंग', region: 'himalaya', centre: [27.6894, 88.7445], radiusKm: 25, vibes: ['mountains', 'nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: [4, 5, 6, 10, 11], summary: 'A North Sikkim village under snow peaks, and the rhododendron valley of Yumthang above it.' },
  { slug: 'ravangla', name: 'Ravangla', localName: 'रावंगला', region: 'himalaya', centre: [27.3069, 88.3636], radiusKm: 15, vibes: ['spiritual', 'nature', 'mountains'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [...span(3, 5), ...span(10, 12)], summary: 'Buddha Park’s giant statue, Ralang Monastery and the Temi tea garden on a quiet Sikkim ridge.' },
  { slug: 'kalimpong', name: 'Kalimpong', localName: 'कालिम्पोंग', region: 'himalaya', centre: [27.06, 88.47], radiusKm: 15, vibes: ['nature', 'culture', 'mountains'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [...span(3, 5), ...span(10, 12)], summary: 'Orchid nurseries, hilltop monasteries and views over the Teesta to Kanchenjunga.' },
  // Batch 1 — Jammu & Kashmir
  { slug: 'srinagar', name: 'Srinagar', localName: 'श्रीनगर', region: 'himalaya', centre: [34.0837, 74.7973], radiusKm: 12, vibes: ['nature', 'romantic', 'culture'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: span(4, 10), summary: 'Shikaras on Dal Lake, Mughal gardens and houseboats under the Zabarwan hills.' },
  { slug: 'gulmarg', name: 'Gulmarg', localName: 'गुलमर्ग', region: 'himalaya', centre: [34.0484, 74.3805], radiusKm: 12, vibes: ['mountains', 'adventure', 'nature'], budgetTier: 'mid', avgDailyCost: 4000, bestMonths: [...span(12, 3), ...span(5, 9)], summary: 'A meadow of flowers in summer and India’s best ski slopes in winter, with a gondola up Apharwat.' },
  { slug: 'pahalgam', name: 'Pahalgam', localName: 'पहलगाम', region: 'himalaya', centre: [34.0161, 75.315], radiusKm: 15, vibes: ['nature', 'mountains', 'adventure'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: span(4, 10), summary: 'The Lidder valley’s pine meadows — Betaab, Aru and Baisaran — and the start of the Amarnath Yatra.' },
  { slug: 'sonamarg', name: 'Sonamarg', localName: 'सोनमर्ग', region: 'himalaya', centre: [34.303, 75.293], radiusKm: 25, vibes: ['mountains', 'nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 3200, bestMonths: span(5, 9), summary: 'The meadow of gold: Thajiwas glacier, trout streams and the road up to Zoji La.' },
  { slug: 'katra', name: 'Katra & Vaishno Devi', localName: 'कटरा', region: 'himalaya', centre: [32.9917, 74.9319], radiusKm: 12, vibes: ['spiritual', 'mountains'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Base of the 12 km climb to the Vaishno Devi cave shrine in the Trikuta hills.' },
  // Batch 1 — Himachal Pradesh
  { slug: 'kasol', name: 'Kasol & Parvati Valley', localName: 'कसोल', region: 'himalaya', centre: [32.01, 77.315], radiusKm: 25, vibes: ['nature', 'adventure', 'party'], budgetTier: 'budget', avgDailyCost: 1800, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'The pine-lined Parvati river, Manikaran’s hot springs and the trek up to Kheerganga.' },
  { slug: 'dalhousie', name: 'Dalhousie & Khajjiar', localName: 'डलहौज़ी', region: 'himalaya', centre: [32.5387, 75.971], radiusKm: 20, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Colonial churches on five hills, and Khajjiar’s meadow ringed by deodar forest.' },
  { slug: 'bir', name: 'Bir Billing', localName: 'बीड़', region: 'himalaya', centre: [32.0442, 76.7118], radiusKm: 20, vibes: ['adventure', 'nature', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: [...span(3, 5), ...span(9, 11)], summary: 'India’s paragliding capital: take off at Billing, land among Tibetan monasteries in Bir.' },
  { slug: 'kasauli', name: 'Kasauli', localName: 'कसौली', region: 'himalaya', centre: [30.8986, 76.9653], radiusKm: 20, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'A quiet cantonment of pine walks, Christ Church and sunset over the plains.' },
  { slug: 'kinnaur', name: 'Kinnaur (Kalpa & Sangla)', localName: 'किन्नौर', region: 'himalaya', centre: [31.53, 78.27], radiusKm: 40, vibes: ['mountains', 'nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(5, 10), summary: 'Apple orchards under Kinner Kailash, Kalpa’s views and Chitkul, the last village on the road to Tibet.' },
  { slug: 'palampur', name: 'Palampur', localName: 'पालमपुर', region: 'himalaya', centre: [32.1109, 76.5363], radiusKm: 15, vibes: ['nature', 'mountains', 'romantic'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Tea gardens of Kangra under the snowy Dhauladhar range, with old temples close by.' },
  // Batch 1 — Uttarakhand
  { slug: 'mussoorie', name: 'Mussoorie', localName: 'मसूरी', region: 'himalaya', centre: [30.4598, 78.0644], radiusKm: 12, vibes: ['mountains', 'romantic', 'nature'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'The Queen of the Hills: Mall Road, Kempty Falls and Landour’s quiet lanes above the Doon.' },
  { slug: 'nainital', name: 'Nainital', localName: 'नैनीताल', region: 'himalaya', centre: [29.3919, 79.4542], radiusKm: 15, vibes: ['nature', 'romantic', 'mountains'], budgetTier: 'mid', avgDailyCost: 3200, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'Boats on Naini Lake, Snow View point and the lake country of Kumaon around it.' },
  { slug: 'auli', name: 'Auli', localName: 'औली', region: 'himalaya', centre: [30.5287, 79.5664], radiusKm: 15, vibes: ['mountains', 'adventure', 'nature'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: [...span(12, 3), 5, 6, 9, 10, 11], summary: 'Ski slopes and oak meadows facing Nanda Devi, with a long gondola up from Joshimath.' },
  { slug: 'kedarnath', name: 'Kedarnath', localName: 'केदारनाथ', region: 'himalaya', centre: [30.7346, 79.0669], radiusKm: 15, vibes: ['spiritual', 'mountains', 'adventure'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [5, 6, 9, 10], summary: 'The jyotirlinga temple at 3,583 m beneath snow peaks, reached by a trek from Gaurikund.' },
  { slug: 'valley-of-flowers', name: 'Valley of Flowers & Hemkund', localName: 'फूलों की घाटी', region: 'himalaya', centre: [30.728, 79.605], radiusKm: 15, vibes: ['nature', 'adventure', 'mountains'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [7, 8, 9], summary: 'A UNESCO alpine valley in bloom each monsoon, and the glacial lake of Hemkund Sahib above Ghangaria.' },
  { slug: 'corbett', name: 'Jim Corbett National Park', localName: 'जिम कॉर्बेट', region: 'himalaya', centre: [29.53, 78.7747], radiusKm: 25, vibes: ['nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 4500, bestMonths: span(11, 6), summary: 'India’s oldest national park: tiger safaris through the sal forests and grasslands of Dhikala.' },
  { slug: 'chopta', name: 'Chopta & Tungnath', localName: 'चोपता', region: 'himalaya', centre: [30.484, 79.212], radiusKm: 15, vibes: ['mountains', 'adventure', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'Alpine meadows and the trek to Tungnath, the highest Shiva temple, with Chandrashila above.' },
  { slug: 'munsiyari', name: 'Munsiyari', localName: 'मुनस्यारी', region: 'himalaya', centre: [30.067, 80.238], radiusKm: 35, vibes: ['mountains', 'nature', 'adventure'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Face to face with the five Panchachuli peaks, and the gateway to the Milam glacier trek.' },
  { slug: 'kausani', name: 'Kausani', localName: 'कौसानी', region: 'himalaya', centre: [29.8433, 79.6036], radiusKm: 20, vibes: ['mountains', 'nature', 'romantic'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'A 300 km sweep of Himalayan peaks at sunrise, tea estates and Gandhi’s Anasakti Ashram.' },
  { slug: 'almora', name: 'Almora & Binsar', localName: 'अल्मोड़ा', region: 'himalaya', centre: [29.6, 79.66], radiusKm: 20, vibes: ['nature', 'culture', 'mountains'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: [...span(3, 6), ...span(9, 12)], summary: 'An old Kumaoni hill town of temples and bal mithai, with the oak forests of Binsar above.' },

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
  { slug: 'ziro', name: 'Ziro', localName: 'ज़ीरो', region: 'sisters', centre: [27.594, 93.838], radiusKm: 25, vibes: ['nature', 'culture', 'party'], budgetTier: 'mid', avgDailyCost: 2500, bestMonths: span(3, 10), summary: 'Apatani villages and rice fields in a pine valley, home of the Ziro music festival.' },
  // Batch 2 — Meghalaya
  { slug: 'mawlynnong', name: 'Mawlynnong', localName: 'मावलिननॉन्ग', region: 'sisters', centre: [25.2018, 91.9156], radiusKm: 15, vibes: ['nature', 'culture'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(10, 5), summary: 'A famously clean Khasi village, the living root bridge at Riwai and views over the Bangladesh plains.' },
  // Batch 2 — Arunachal Pradesh
  { slug: 'dirang', name: 'Dirang', localName: 'दिरांग', region: 'sisters', centre: [27.3584, 92.2409], radiusKm: 20, vibes: ['mountains', 'nature', 'culture'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'A Monpa valley of hot springs, an old stone dzong and apple orchards on the road to Tawang.' },
  { slug: 'bomdila', name: 'Bomdila', localName: 'बोमडिला', region: 'sisters', centre: [27.2645, 92.4159], radiusKm: 15, vibes: ['mountains', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: [...span(3, 6), ...span(9, 11)], summary: 'Monasteries and apple orchards with Himalayan views, on the way up to Sela Pass.' },
  { slug: 'mechuka', name: 'Mechuka', localName: 'मेचुका', region: 'sisters', centre: [28.6, 94.13], radiusKm: 20, vibes: ['mountains', 'adventure', 'nature'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: [...span(3, 5), ...span(9, 11)], summary: 'A remote valley on the Siyom river near the China border, with an old monastery and snow peaks all round.' },
  { slug: 'namdapha', name: 'Namdapha National Park', localName: 'नामदफा', region: 'sisters', centre: [27.49, 96.39], radiusKm: 30, vibes: ['nature', 'adventure'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(10, 4), summary: 'Rainforest rising to snow peaks: home of four big cats and the hoolock gibbon.' },
  // Batch 2 — Assam
  { slug: 'guwahati', name: 'Guwahati', localName: 'गुवाहाटी', region: 'sisters', centre: [26.1445, 91.7362], radiusKm: 15, vibes: ['city', 'spiritual', 'culture'], budgetTier: 'mid', avgDailyCost: 3000, bestMonths: span(10, 4), summary: 'Gateway to the North-East: Kamakhya Temple, Brahmaputra cruises and Umananda island.' },
  { slug: 'manas', name: 'Manas National Park', localName: 'मानस', region: 'sisters', centre: [26.7, 91.0], radiusKm: 30, vibes: ['nature', 'adventure'], budgetTier: 'mid', avgDailyCost: 3500, bestMonths: span(11, 4), summary: 'A UNESCO tiger reserve on the Bhutan border: golden langurs, wild buffalo and river forest.' },
  { slug: 'sivasagar', name: 'Sivasagar', localName: 'शिवसागर', region: 'sisters', centre: [26.98, 94.64], radiusKm: 15, vibes: ['culture', 'spiritual'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: span(10, 4), summary: 'The old Ahom capital: Rang Ghar, Talatal Ghar and temples beside a great tank.' },
  { slug: 'haflong', name: 'Haflong', localName: 'हाफलोंग', region: 'sisters', centre: [25.1694, 93.0161], radiusKm: 20, vibes: ['nature', 'mountains'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: span(10, 4), summary: 'Assam’s only hill station: a lake, the blue hills of Dima Hasao and the Jatinga ridge.' },
  { slug: 'tezpur', name: 'Tezpur & Nameri', localName: 'तेज़पुर', region: 'sisters', centre: [26.6338, 92.8], radiusKm: 30, vibes: ['nature', 'culture', 'adventure'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(11, 4), summary: 'Ancient ruins and Agnigarh hill by the Brahmaputra, with river rafting at Nameri nearby.' },
  // Batch 2 — Manipur, Mizoram & Tripura
  { slug: 'imphal', name: 'Imphal & Loktak Lake', localName: 'इंफाल', region: 'sisters', centre: [24.817, 93.9368], radiusKm: 30, vibes: ['culture', 'nature'], budgetTier: 'mid', avgDailyCost: 2800, bestMonths: span(10, 4), summary: 'Kangla Fort, the women-run Ima Market and the floating islands of Loktak Lake.' },
  { slug: 'aizawl', name: 'Aizawl', localName: 'आइज़ोल', region: 'sisters', centre: [23.7271, 92.7176], radiusKm: 20, vibes: ['city', 'nature', 'culture'], budgetTier: 'budget', avgDailyCost: 2500, bestMonths: span(10, 3), summary: 'A ridge-top city of churches and Mizo crafts, with the Reiek viewpoint close by.' },
  { slug: 'agartala', name: 'Agartala', localName: 'अगरतला', region: 'sisters', centre: [23.8315, 91.2868], radiusKm: 20, vibes: ['culture', 'city'], budgetTier: 'budget', avgDailyCost: 2200, bestMonths: span(10, 3), summary: 'The white Ujjayanta Palace, the lake palace of Neermahal and Tripura’s old temples.' },
  { slug: 'unakoti', name: 'Unakoti', localName: 'उनाकोटी', region: 'sisters', centre: [24.3156, 92.0632], radiusKm: 10, vibes: ['culture', 'spiritual', 'nature'], budgetTier: 'budget', avgDailyCost: 2000, bestMonths: span(10, 3), summary: 'Huge rock-cut Shiva faces and a hillside of ancient reliefs in the Tripura forest.' },
];
