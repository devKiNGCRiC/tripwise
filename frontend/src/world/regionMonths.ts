/**
 * regionMonths.ts — what each of the seven worlds is like month by month: the weather
 * (official long-term averages), festivals (with dates for the coming edition where they
 * have been announced or can be worked out from the calendar), and when each signature
 * experience and starting place is at its best.
 *
 * Sources (checked on CHECKED):
 *   Weather   India Meteorological Department climate normals, 1991–2020 (Madikeri: the
 *             latest published, 1981–2010), as tabled on each station's Wikipedia page.
 *   Festivals official tourism listings first (Incredible India, Goa Tourism, Karnataka
 *             Tourism, Government of Nagaland); otherwise dates from the Hindu/lunar
 *             calendar or travel press, marked "expected" — never shown as confirmed.
 *   Seasons   official opening windows where they exist (Kaziranga 1 Nov–30 Apr, Valley of
 *             Flowers 1 Jun–31 Oct, the west-coast fishing ban 1 Jun–31 Jul).
 * Lunar festivals move every year, so a festival with no upcoming dates shows when it
 * usually happens instead. Months are 1 = January … 12 = December.
 */
import type { RegionKey } from './regions';

/** The day these facts were last checked (shown on the page). */
export const CHECKED = '2026-10-20';

/** Monthly averages at one weather station, January first. */
export interface Climate {
  /** The station, e.g. "Manali" */
  station: string;
  /** Short source line, e.g. "IMD 1991–2020 averages" */
  source: string;
  /** Mean daily high and low, °C */
  high: number[];
  low: number[];
  /** Days with rain (≥ 2.5 mm) */
  rainDays: number[];
}

/** A festival or seasonal event. */
export interface Festival {
  name: string;
  place: string;
  /** Where to plan a trip for it (the planner's destination) */
  plan: string;
  /** Months it falls in (for the month view) */
  months: number[];
  /** When it usually happens, for years without dates, e.g. "Usually late November" */
  usually: string;
  /** The coming edition, if known: ISO dates; `expected` = not yet officially confirmed */
  next?: { start: string; end?: string; expected?: boolean };
  /** One line on what it is */
  about: string;
  /** Where the dates come from */
  source: string;
}

/** Everything month-by-month for one world. */
export interface RegionMonths {
  climate: Climate;
  festivals: Festival[];
  /** Best months for each signature experience (same names as Region.sig), and where to plan it */
  experiences: Record<string, { plan: string; months: number[]; note?: string }>;
  /** Best months for each starting place (same names as Region.places) */
  places: Record<string, number[]>;
}

/** Months from `a` to `b` inclusive, wrapping past December. */
function span(a: number, b: number): number[] {
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b) return out;
  }
}
/** Several spans joined. */
const spans = (...pairs: [number, number][]) => pairs.flatMap(([a, b]) => span(a, b));
/** Every month. */
const ALL_YEAR = span(1, 12);

/** Source lines. */
const IMD = 'IMD 1991–2020 averages';
const INCREDIBLE_INDIA = 'https://www.incredibleindia.gov.in/en/festivals-and-events';

export const REGION_MONTHS: Record<RegionKey, RegionMonths> = {
  himalaya: {
    climate: {
      station: 'Manali',
      source: IMD,
      high: [10.5, 12.0, 17.1, 21.4, 24.9, 26.4, 25.7, 25.3, 24.2, 21.6, 17.3, 13.5],
      low: [-1.1, 0.3, 3.3, 6.4, 9.3, 13.0, 16.0, 16.1, 12.2, 6.3, 2.6, 0.3],
      rainDays: [5.6, 6.7, 8.4, 6.0, 6.2, 7.9, 12.9, 14.9, 8.1, 1.9, 1.8, 2.2],
    },
    festivals: [
      {
        name: 'Kullu Dussehra',
        plan: 'Kullu',
        place: 'Dhalpur Maidan, Kullu',
        months: [10],
        usually: 'Usually October, from Vijayadashami for a week',
        next: { start: '2026-10-20', end: '2026-10-26', expected: true },
        about: 'Hundreds of valley deities carried in procession to meet Lord Raghunath.',
        source: 'https://www.holidify.com/pages/kullu-dussehra-celebrations-4709.html',
      },
      {
        name: 'Losar (Ladakhi New Year)',
        plan: 'Leh',
        place: 'Leh & monasteries across Ladakh',
        months: [12],
        usually: 'Usually December',
        next: { start: '2026-12-09' },
        about: 'Ladakh’s new year: lamps on every roof, masked dances and fire processions.',
        source: `${INCREDIBLE_INDIA}/ladakh/losar`,
      },
      {
        name: 'Hemis Festival',
        plan: 'Leh',
        place: 'Hemis Monastery, Ladakh',
        months: [6, 7],
        usually: 'Usually late June or July (10th day of the Tibetan month)',
        about: 'Masked cham dances honouring Guru Padmasambhava in Ladakh’s largest monastery.',
        source: 'https://www.travelindiasmart.com/leh-ladakh/leh_festivals',
      },
    ],
    experiences: {
      'Char Dham — Badrinath & Mana': { plan: 'Badrinath', months: spans([5, 6], [9, 10]), note: 'Temple open about May–November' },
      'Valley of Flowers trek': { plan: 'Valley of Flowers', months: [7, 8], note: 'Park open 1 June–31 October; flowers peak July–August' },
      'Pangong Tso at first light': { plan: 'Leh', months: span(5, 9) },
    },
    places: {
      Badrinath: spans([5, 6], [9, 10]),
      Mana: spans([5, 6], [9, 10]),
      Leh: span(5, 9),
      Spiti: span(6, 9),
      Rishikesh: spans([2, 4], [9, 11]),
    },
  },

  thar: {
    climate: {
      station: 'Jaisalmer',
      source: IMD,
      high: [23.4, 27.3, 33.4, 38.9, 42.1, 41.1, 38.4, 36.6, 36.9, 36.4, 31.2, 25.8],
      low: [9.3, 12.5, 18.4, 23.6, 26.5, 27.6, 27.1, 25.9, 25.0, 22.0, 16.2, 11.0],
      rainDays: [0.4, 0.5, 0.6, 0.5, 0.9, 1.0, 3.5, 3.2, 1.8, 0.4, 0.1, 0.2],
    },
    festivals: [
      {
        name: 'Marwar Festival',
        plan: 'Jodhpur',
        place: 'Mehrangarh Fort & Umaid Stadium, Jodhpur',
        months: [10],
        usually: 'Usually October, at Sharad Purnima',
        next: { start: '2026-10-24', end: '2026-10-25' },
        about: 'Folk music and dance of the Marwar heroes under a full moon.',
        source: `${INCREDIBLE_INDIA}/rajasthan/marwar-festival-2026`,
      },
      {
        name: 'Pushkar Camel Fair',
        plan: 'Pushkar',
        place: 'Pushkar',
        months: [11],
        usually: 'Usually November, ending on Kartik Purnima',
        next: { start: '2026-11-17', end: '2026-11-24', expected: true },
        about: 'Tens of thousands of camels, traders and pilgrims at the holy lake.',
        source: 'https://hindutone.com/festivals/pushkar-fair-2026/',
      },
      {
        name: 'Bikaner Camel Festival',
        plan: 'Bikaner',
        place: 'Junagarh Fort, Bikaner',
        months: [1],
        usually: 'Usually mid-January',
        about: 'Camel races, decorated camels and fire dancers on the dunes.',
        source: 'https://www.indianholiday.com/fairs-and-festivals/rajasthan/',
      },
      {
        name: 'Jaisalmer Desert Festival',
        plan: 'Jaisalmer',
        place: 'Jaisalmer Fort & Sam dunes',
        months: [2],
        usually: 'Usually February, ending on Magh Purnima',
        next: { start: '2027-02-18', end: '2027-02-20', expected: true },
        about: 'Turban-tying, Mr Desert and folk nights on the Sam dunes.',
        source: 'https://www.topindianholidays.com/fair/desert-festival',
      },
    ],
    experiences: {
      'A night at a desert camp': { plan: 'Jaisalmer', months: span(10, 3) },
      'Jaisalmer fort at golden hour': { plan: 'Jaisalmer', months: span(10, 3) },
      'Camel trail at sunset': { plan: 'Jaisalmer', months: span(11, 2) },
    },
    places: {
      Jaisalmer: span(10, 3),
      Jodhpur: span(10, 3),
      Bikaner: span(10, 3),
      Pushkar: span(10, 3),
      Barmer: span(11, 2),
    },
  },

  ganga: {
    climate: {
      station: 'Varanasi',
      source: IMD,
      high: [21.9, 26.7, 32.8, 38.9, 40.4, 38.5, 33.8, 33.1, 33.1, 32.5, 29.2, 24.1],
      low: [9.0, 12.4, 16.7, 22.1, 25.9, 27.8, 26.6, 26.2, 25.3, 20.9, 14.5, 10.1],
      rainDays: [1.5, 1.7, 1.2, 0.8, 1.4, 5.2, 12.3, 12.9, 8.6, 1.9, 0.3, 0.3],
    },
    festivals: [
      {
        name: 'Chhath Puja',
        plan: 'Varanasi',
        place: 'Ghats of Patna & Varanasi',
        months: [11],
        usually: 'Usually late October or November, six days after Diwali',
        next: { start: '2026-11-13', end: '2026-11-16', expected: true },
        about: 'Offerings to the setting and rising sun, waist-deep in the river.',
        source: 'https://www.happyfares.in/blog/?p=12531',
      },
      {
        name: 'Dev Deepawali',
        plan: 'Varanasi',
        place: 'Ghats of Varanasi',
        months: [11],
        usually: 'Usually November, on Kartik Purnima',
        next: { start: '2026-11-24', expected: true },
        about: 'Every ghat lit with a million clay lamps, fifteen days after Diwali.',
        source: 'https://hindutone.com/festivals/kartika-purnima-2026-tripurari-purnima-dev-deepawali-date-significance-varanasi/',
      },
      {
        name: 'Magh Mela',
        plan: 'Prayagraj',
        place: 'Sangam, Prayagraj',
        months: [1, 2, 3],
        usually: 'Usually January to early March',
        next: { start: '2027-01-22', end: '2027-03-06', expected: true },
        about: 'A tent city of pilgrims at the Sangam; Mauni Amavasya (6 Feb 2027) is the biggest bathing day.',
        source: 'https://www.bhaktibharat.com/festival/magh-mela',
      },
      {
        name: 'Holi on the ghats',
        plan: 'Varanasi',
        place: 'Varanasi, and Mathura–Vrindavan',
        months: [3],
        usually: 'Usually March, on Phalguna Purnima',
        next: { start: '2027-03-22', expected: true },
        about: 'Colours on the ghats; Mathura and Vrindavan celebrate for about ten days before.',
        source: 'https://vrindavanmathuratourism.com/blogs/holi-2027-date-in-india',
      },
    ],
    experiences: {
      'Ganga aarti at Dashashwamedh': { plan: 'Varanasi', months: ALL_YEAR, note: 'Every evening; moved to rooftops when the river floods' },
      'Dawn boat past 80 ghats': { plan: 'Varanasi', months: span(10, 3), note: 'Boats can stop when the river is high, July–September' },
      'Old-city food trail': { plan: 'Varanasi', months: span(10, 3), note: 'Winter-only malaiyo, November–February' },
    },
    places: {
      Varanasi: span(10, 3),
      Rishikesh: spans([2, 4], [9, 11]),
      Prayagraj: span(10, 3),
      'Bodh Gaya': span(10, 3),
      Ayodhya: span(10, 3),
    },
  },

  deccan: {
    climate: {
      station: 'Hyderabad',
      source: IMD,
      high: [28.6, 31.8, 35.2, 37.6, 38.8, 34.4, 30.5, 29.6, 30.1, 30.4, 28.8, 27.8],
      low: [13.9, 15.5, 20.3, 24.1, 26.0, 23.9, 22.5, 22.0, 21.7, 20.0, 16.4, 13.1],
      rainDays: [0.6, 0.6, 0.9, 2.0, 2.5, 6.8, 9.5, 11.3, 8.4, 5.6, 1.3, 0.3],
    },
    festivals: [
      {
        name: 'Mysuru Dasara',
        plan: 'Mysuru',
        place: 'Mysuru Palace',
        months: [9, 10],
        usually: 'Usually late September or October, for the ten days of Navaratri',
        about: 'The palace lit with 100,000 bulbs and the Jumboo Savari elephant procession.',
        source: 'https://www.karnatakatourism.org/',
      },
      {
        name: 'Hampi Utsav',
        plan: 'Hampi',
        place: 'Hampi',
        months: [11],
        usually: 'Moving to 3–5 November each year (announced Feb 2026); dates not yet published',
        about: 'Music, dance and light shows among the Vijayanagara ruins.',
        source: 'https://karnatakatourism.org/en/events/hampi-utsav/',
      },
      {
        name: 'Bonalu',
        plan: 'Hyderabad',
        place: 'Golconda & old Hyderabad',
        months: [7, 8],
        usually: 'Usually July–August (Ashada month), Sundays, starting at Golconda',
        about: 'Hyderabad’s goddess festival: decorated pots of offerings and drumming processions.',
        source: 'https://www.telangana.gov.in/',
      },
    ],
    experiences: {
      'Hampi from Matanga Hill at sunrise': { plan: 'Hampi', months: span(10, 2) },
      'Ajanta & Ellora caves': { plan: 'Aurangabad', months: span(7, 3), note: 'Waterfalls by Ajanta in the monsoon; Ajanta closed Mondays, Ellora Tuesdays' },
      'Golconda fort by lantern': { plan: 'Hyderabad', months: span(10, 2) },
    },
    places: {
      Hampi: span(10, 2),
      Ellora: span(7, 3),
      Hyderabad: span(10, 2),
      Bijapur: span(10, 2),
      Badami: span(10, 2),
    },
  },

  ghats: {
    climate: {
      station: 'Madikeri (Coorg)',
      source: 'IMD 1981–2010 averages',
      high: [26.4, 28.2, 29.8, 29.4, 27.5, 23.3, 21.6, 21.6, 23.6, 25.0, 25.3, 25.3],
      low: [12.4, 13.1, 15.0, 17.5, 18.1, 17.6, 17.2, 17.2, 17.1, 16.9, 15.6, 13.2],
      rainDays: [0.2, 0.3, 1.6, 5.0, 7.8, 22.2, 27.0, 26.2, 16.2, 12.2, 4.4, 1.1],
    },
    festivals: [
      {
        name: 'Kaveri Sankramana',
        plan: 'Coorg',
        place: 'Talakaveri, Coorg',
        months: [10],
        usually: 'Usually mid-October (Tula Sankramana)',
        about: 'Pilgrims gather as the sacred spring of the Kaveri rises at its source.',
        source: 'https://hindutone.com/festivals/kaveri-sankramana-2026-talakaveri-theerthodbhava/',
      },
      {
        name: 'Madikeri Dasara',
        plan: 'Coorg',
        place: 'Madikeri, Coorg',
        months: [10],
        usually: 'Usually October, through Navaratri to Vijayadashami',
        about: 'Four Karagas and a night-long procession of lit tableaux.',
        source: 'https://hindutone.com/festivals/madikeri-dasara-2026-karaga-mantapa-procession/',
      },
      {
        name: 'Puttari (harvest)',
        plan: 'Coorg',
        place: 'Villages across Coorg',
        months: [11, 12],
        usually: 'Usually late November or December, on a full moon set by local astrologers',
        about: 'The Kodava rice harvest: the first sheaves cut by torchlight, then feasts.',
        source: 'https://www.coorgtourisminfo.com/culture/festival/',
      },
    ],
    experiences: {
      'Monsoon waterfall treks': { plan: 'Coorg', months: span(6, 9), note: 'Some forest trails close in heavy rain' },
      'Munnar tea-estate mornings': { plan: 'Munnar', months: span(9, 3) },
      'Coorg coffee trails': { plan: 'Coorg', months: span(11, 2), note: 'Coffee is picked December–February' },
    },
    places: {
      Munnar: span(9, 3),
      Coorg: span(10, 3),
      Matheran: span(10, 5),
      Wayanad: span(10, 5),
      Agumbe: span(6, 2),
    },
  },

  konkan: {
    climate: {
      station: 'Panaji (Goa)',
      source: IMD,
      high: [32.5, 32.4, 32.6, 33.4, 33.8, 30.9, 29.3, 29.5, 30.2, 32.0, 33.5, 33.1],
      low: [20.0, 20.6, 23.3, 25.4, 26.3, 24.9, 24.2, 24.2, 24.0, 24.0, 22.7, 20.9],
      rainDays: [0.1, 0.0, 0.1, 0.3, 3.6, 21.2, 26.7, 23.0, 13.7, 6.8, 1.5, 0.2],
    },
    festivals: [
      {
        name: 'Feast of St Francis Xavier',
        plan: 'Goa',
        place: 'Basilica of Bom Jesus, Old Goa',
        months: [12],
        usually: 'Every year on 3 December',
        next: { start: '2026-12-03' },
        about: 'Goa’s biggest feast day, with a novena and fair beforehand.',
        source: 'https://goatourism.gov.in/',
      },
      {
        name: 'Theyyam season',
        plan: 'Kannur',
        place: 'Temples of North Malabar (Kannur, Kasaragod)',
        months: spans([12, 4]),
        usually: 'December to April, at village temples on set nights',
        about: 'Dancers become gods in towering costumes, through the night.',
        source: 'https://www.keralatourism.org/',
      },
      {
        name: 'Goa Carnival',
        plan: 'Goa',
        place: 'Panaji, Margao, Vasco, Mapusa',
        months: [2],
        usually: 'Usually February, the days before Ash Wednesday',
        next: { start: '2027-02-06', end: '2027-02-09', expected: true },
        about: 'King Momo’s float parades and street parties across Goa.',
        source: 'https://goatourism.gov.in/wp-content/uploads/2018/12/State-Festival-2026-2027.pdf',
      },
      {
        name: 'Shigmo',
        plan: 'Goa',
        place: 'Panaji, Margao, Vasco',
        months: [3],
        usually: 'March (Goa Tourism lists March 2027; exact days to be announced)',
        about: 'Goa’s spring festival: folk dancers and giant mythological floats.',
        source: 'https://goatourism.gov.in/wp-content/uploads/2018/12/State-Festival-2026-2027.pdf',
      },
      {
        name: 'Nehru Trophy Boat Race',
        plan: 'Alleppey',
        place: 'Punnamada Lake, Alappuzha',
        months: [8],
        usually: 'Usually the second Saturday of August',
        about: 'Hundred-oar snake boats racing on the backwaters.',
        source: 'https://www.keralatourism.org/',
      },
      {
        name: 'Onam',
        plan: 'Kerala',
        place: 'All over Kerala',
        months: [8, 9],
        usually: 'Usually late August or September',
        next: { start: '2027-09-12', expected: true },
        about: 'Kerala’s harvest festival: flower carpets, the sadya feast and boat races.',
        source: 'https://www.drikpanchang.com/festivals/onam/onam-thiruvonam-date.html?year=2027',
      },
    ],
    experiences: {
      'A night on a backwater houseboat': { plan: 'Alleppey', months: span(9, 3) },
      'Sunset from a sea fort': { plan: 'Malvan', months: span(10, 5), note: 'Ferries to sea forts stop in the monsoon' },
      'Fish-thali crawl along the coast': { plan: 'Goa', months: span(8, 5), note: 'Fishing ban 1 June–31 July' },
    },
    places: {
      Goa: span(11, 3),
      Gokarna: span(10, 3),
      Alleppey: span(9, 3),
      Varkala: span(11, 3),
      Malvan: span(10, 5),
    },
  },

  sisters: {
    climate: {
      station: 'Shillong',
      source: IMD,
      high: [15.2, 17.5, 21.4, 23.4, 23.7, 24.2, 24.2, 24.4, 23.7, 21.9, 19.3, 16.4],
      low: [5.7, 7.5, 11.2, 14.1, 15.6, 17.4, 17.9, 17.7, 16.8, 14.2, 10.4, 7.2],
      rainDays: [1.6, 1.9, 4.0, 9.9, 16.1, 18.0, 17.3, 17.3, 14.5, 8.4, 1.5, 0.7],
    },
    festivals: [
      {
        name: 'Wangala (100 Drums)',
        plan: 'Tura',
        place: 'Asanang, near Tura, Garo Hills',
        months: [11],
        usually: 'Usually November',
        next: { start: '2026-11-11', end: '2026-11-14', expected: true },
        about: 'The Garo harvest festival — its 50th year in 2026, planned as 1,000 drums.',
        source: 'https://www.sentinelassam.com/north-east-india-news/meghalaya-news/meghalaya-cm-sanctions-rs-20-crore-for-1000-drums-wangala-2026-golden-jubilee',
      },
      {
        name: 'Hornbill Festival',
        plan: 'Kohima',
        place: 'Kisama Heritage Village, Kohima',
        months: [12],
        usually: 'Every year 1–10 December',
        next: { start: '2026-12-01', end: '2026-12-10' },
        about: 'All of Nagaland’s tribes in one village: dances, games, food and music.',
        source: 'https://en.wikipedia.org/wiki/Hornbill_Festival',
      },
      {
        name: 'Torgya',
        plan: 'Tawang',
        place: 'Tawang Monastery',
        months: [1],
        usually: 'Usually January (set by the Buddhist calendar)',
        about: 'Three days of masked dances to drive away evil before the new year.',
        source: 'https://en.wikipedia.org/wiki/Torgya',
      },
      {
        name: 'Rongali Bihu',
        plan: 'Guwahati',
        place: 'All over Assam, and Majuli',
        months: [4],
        usually: 'Every year from 14 April',
        next: { start: '2027-04-14' },
        about: 'Assam’s new year: Bihu dances, dhol drums and feasts.',
        source: 'https://en.wikipedia.org/wiki/Bihu',
      },
      {
        name: 'Ziro Festival of Music',
        plan: 'Ziro',
        place: 'Ziro Valley',
        months: [9],
        usually: 'Usually late September (2026: 24–27 Sep)',
        about: 'An outdoor indie music festival among the Apatani rice fields.',
        source: 'https://www.outlooktraveller.com/destinations/india/ziro-festival-2026-dates-venue-lineup-and-everything-you-need-to-know',
      },
    ],
    experiences: {
      'Double-decker living root bridge': { plan: 'Cherrapunji', months: span(10, 4), note: 'Steep, slippery steps in the monsoon' },
      'Tawang monastery in the clouds': { plan: 'Tawang', months: spans([3, 6], [9, 10]), note: 'Sela Pass can close with snow in winter' },
      'Kaziranga rhino safari': { plan: 'Kaziranga', months: span(11, 4), note: 'Park open 1 November–30 April' },
    },
    places: {
      Shillong: span(10, 4),
      Cherrapunji: span(10, 5),
      Tawang: spans([3, 6], [9, 10]),
      Ziro: span(3, 10),
      Majuli: span(10, 3),
    },
  },
};
