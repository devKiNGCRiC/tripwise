/**
 * tolis.ts (mock data) — Tolis for the demo, and the shapes the mock stores them in:
 *   Kerala Toli    Demo is the Sutradhar, with Raj and Ananya; its Sahyatra is Demo's upcoming
 *                  Kerala trip; one open suggestion, one Tithi poll, a few chat messages, and a
 *                  Lekha: Raj paid the houseboat deposit for all three, Demo a lunch for Demo and
 *                  Ananya, Ananya an auto for all three; Demo's banana chips are personal; on day 2
 *                  two Dharas meet at the Boat jetty; Raj shares where he is; notes, a Potli, and
 *                  Demo's Kushal contact "Maa"
 *   Office offsite Raj leads an office Toli in announcement mode; Demo and Ananya are Sahyatris
 * Stored records mirror the real API's collections (members inside the Toli; suggestions,
 * polls, budgets, messages, raised hands and events alongside).
 */
import type { Category, PayMethod, SujhavChange, ToliRole, TravelMode, TripType } from '@/lib/api/types';
import { dayFromToday } from './social';

/** A member inside a Toli. */
export interface MockMember {
  userId: string;
  role: ToliRole;
  joinedAt: string;
  postUntil?: string | null;
  oneMessage?: boolean;
  requestsOff?: boolean;
  lastReadAt?: string;
  phone?: string;
  upi?: string;
}

/** A Toli. */
export interface MockToli {
  id: string;
  name: string;
  type: TripType;
  announcementMode: boolean;
  tripId: string | null;
  inviteToken: string;
  members: MockMember[];
  choices: { destination?: string; startDate?: string; endDate?: string; transport?: string };
  createdAt: string;
}

/** A suggestion. */
export interface MockSujhav {
  id: string;
  toliId: string;
  authorId: string;
  change: SujhavChange;
  note?: string;
  votes: Record<string, 1 | -1>;
  status: 'open' | 'approved' | 'declined';
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  createdAt: string;
}

/** A poll. */
export interface MockPoll {
  id: string;
  toliId: string;
  authorId: string;
  kind: 'destination' | 'tithi' | 'transport' | 'free';
  question: string;
  options: { id: string; label: string; destination?: string; start?: string; end?: string; mode?: TravelMode }[];
  multi: boolean;
  closesAt?: string;
  status: 'open' | 'closed';
  winner?: string;
  votes: Record<string, string[]>;
  createdAt: string;
}

/** A chat message. */
export interface MockMessage {
  id: string;
  toliId: string;
  authorId: string;
  text: string;
  replyTo?: string;
  mentions: string[];
  card?: { type: 'sujhav' | 'poll' | 'place' | 'plan'; id: string };
  photoIds: string[];
  clientId: string;
  createdAt: string;
}

/** A raised hand. */
export interface MockAnurodh {
  id: string;
  toliId: string;
  userId: string;
  about: string;
  status: 'open' | 'granted' | 'declined' | 'answered';
  grant?: 'one' | '30m' | '1h' | 'trip';
  reply?: string;
  decidedAt?: string;
  createdAt: string;
}

/** An activity event. */
export interface MockToliEvent {
  id: string;
  toliId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  at: string;
}

/** An expense in a Toli's Lekha (paise; `parts` adds up to `amount`). */
export interface MockExpense {
  id: string;
  toliId: string;
  addedBy: string;
  clientId: string;
  personal: boolean;
  title: string;
  amount: number;
  category: Category;
  method: PayMethod;
  day?: number;
  paidBy: string;
  parts: Record<string, number>;
  deletedAt?: string;
  createdAt: string;
}

/** Money paid back between two members. */
export interface MockSettlement {
  id: string;
  toliId: string;
  from: string;
  to: string;
  amount: number;
  method: PayMethod;
  recordedBy: string;
  clientId: string;
  createdAt: string;
}

/** A day's Dharas and Sangam (or fixed Dharas when `day` is null). */
export interface MockSplit {
  id: string;
  toliId: string;
  day: number | null;
  dharas: { id: string; name: string; stops: string[]; memberIds: string[]; leadId?: string }[];
  sangam: { place: string; at: string } | null;
  here: string[];
  status: 'proposed' | 'active';
  createdBy: string;
  createdAt: string;
}

/** Someone sharing where they are (the last point only). */
export interface MockLocation {
  toliId: string;
  userId: string;
  lat: number;
  lon: number;
  at: string;
  until: string;
}

/** A Toli note. */
export interface MockNote {
  id: string;
  toliId: string;
  authorId: string;
  day: number | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** A Potli item. */
export interface MockPotliItem {
  id: string;
  toliId: string;
  addedBy: string;
  text: string;
  mine: boolean;
  claimedBy: string | null;
  packed: boolean;
  createdAt: string;
}

/** Kushal: family contacts, the latest check-ins and who turned automatic check-ins on. */
export interface MockKushal {
  contacts: { id: string; userId: string; name: string; token: string; createdAt: string }[];
  checkIns: Record<string, { place: string; lat?: number; lon?: number; note?: string; at: string }>;
  auto: Record<string, boolean>;
}

/** Everything Toli-related the mock stores. */
export interface MockToliStore {
  tolis: MockToli[];
  sujhavs: MockSujhav[];
  polls: MockPoll[];
  /** Private budget ranges by "toliId|userId". */
  toliBudgets: Record<string, [number, number]>;
  messages: MockMessage[];
  anurodhs: MockAnurodh[];
  toliEvents: MockToliEvent[];
  toliExpenses: MockExpense[];
  toliSettlements: MockSettlement[];
  toliSplits: MockSplit[];
  toliLocations: MockLocation[];
  toliNotes: MockNote[];
  potliItems: MockPotliItem[];
  kushal: MockKushal;
}

/** A time some hours ago, as ISO text. */
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

/** The demo's Tolis and what's happening in them. */
export function seedToliStore(): MockToliStore {
  return {
    tolis: [
      {
        id: 't_seed_kerala',
        name: 'Kerala Toli',
        type: 'friends',
        announcementMode: false,
        tripId: 'it_seed_kerala',
        inviteToken: 'keralaTOLIjoin2026x',
        members: [
          { userId: 'u_demo', role: 'sutradhar', joinedAt: hoursAgo(72), lastReadAt: hoursAgo(5) },
          { userId: 'u_raj', role: 'sahyatri', joinedAt: hoursAgo(70), phone: '+919876543210', upi: 'king@okicici' },
          { userId: 'u_ananya', role: 'sahyatri', joinedAt: hoursAgo(60) },
        ],
        choices: {},
        createdAt: hoursAgo(72),
      },
      {
        id: 't_seed_office',
        name: 'Office offsite',
        type: 'office',
        announcementMode: true,
        tripId: null,
        inviteToken: 'officeTOLIjoin2026x',
        members: [
          { userId: 'u_raj', role: 'sutradhar', joinedAt: hoursAgo(48) },
          { userId: 'u_demo', role: 'sahyatri', joinedAt: hoursAgo(40) },
          { userId: 'u_ananya', role: 'sahyatri', joinedAt: hoursAgo(30) },
        ],
        choices: {},
        createdAt: hoursAgo(48),
      },
    ],
    sujhavs: [
      {
        id: 'sj_seed_1',
        toliId: 't_seed_kerala',
        authorId: 'u_raj',
        change: { kind: 'add-day', theme: 'A slow day on the houseboat' },
        note: 'One more lazy day, please!',
        votes: { u_ananya: 1 },
        status: 'open',
        createdAt: hoursAgo(20),
      },
    ],
    polls: [
      {
        id: 'pl_seed_1',
        toliId: 't_seed_kerala',
        authorId: 'u_demo',
        kind: 'transport',
        question: 'How shall we travel?',
        options: [
          { id: 'o1', label: 'Train', mode: 'train' },
          { id: 'o2', label: 'Flight', mode: 'flight' },
        ],
        multi: false,
        status: 'open',
        votes: { u_raj: ['o1'] },
        createdAt: hoursAgo(18),
      },
    ],
    toliBudgets: { 't_seed_kerala|u_raj': [2500, 3500], 't_seed_kerala|u_ananya': [2000, 3000] },
    messages: [
      { id: 'ms_seed_1', toliId: 't_seed_kerala', authorId: 'u_demo', text: 'Kerala it is! Dates are fixed — now let’s sort the travel.', mentions: [], photoIds: [], clientId: 'seed-1', createdAt: hoursAgo(19) },
      { id: 'ms_seed_2', toliId: 't_seed_kerala', authorId: 'u_demo', text: '', mentions: [], photoIds: [], card: { type: 'poll', id: 'pl_seed_1' }, clientId: 'card:poll:pl_seed_1', createdAt: hoursAgo(18) },
      { id: 'ms_seed_3', toliId: 't_seed_kerala', authorId: 'u_raj', text: '@demotraveller train please — the Kerala coast from the window!', mentions: ['u_demo'], photoIds: [], clientId: 'seed-3', createdAt: hoursAgo(4) },
      { id: 'ms_seed_4', toliId: 't_seed_office', authorId: 'u_raj', text: `Offsite on ${dayFromToday(25)}. Buses leave the office at 7 am sharp.`, mentions: [], photoIds: [], clientId: 'seed-4', createdAt: hoursAgo(28) },
    ],
    anurodhs: [],
    toliExpenses: [
      { id: 'ex_seed_1', toliId: 't_seed_kerala', addedBy: 'u_raj', clientId: 'seed-ex-1', personal: false, title: 'Houseboat deposit', amount: 360000, category: 'stay', method: 'upi', day: 1, paidBy: 'u_raj', parts: { u_demo: 120000, u_raj: 120000, u_ananya: 120000 }, createdAt: hoursAgo(30) },
      { id: 'ex_seed_2', toliId: 't_seed_kerala', addedBy: 'u_demo', clientId: 'seed-ex-2', personal: false, title: 'Karimeen lunch', amount: 84000, category: 'food', method: 'cash', day: 1, paidBy: 'u_demo', parts: { u_demo: 42000, u_ananya: 42000 }, createdAt: hoursAgo(26) },
      { id: 'ex_seed_3', toliId: 't_seed_kerala', addedBy: 'u_ananya', clientId: 'seed-ex-3', personal: false, title: 'Auto to the jetty', amount: 45000, category: 'transport', method: 'cash', paidBy: 'u_ananya', parts: { u_demo: 15000, u_raj: 15000, u_ananya: 15000 }, createdAt: hoursAgo(25) },
      { id: 'ex_seed_4', toliId: 't_seed_kerala', addedBy: 'u_demo', clientId: 'seed-ex-4', personal: true, title: 'Banana chips', amount: 25000, category: 'shopping', method: 'cash', paidBy: 'u_demo', parts: { u_demo: 25000 }, createdAt: hoursAgo(24) },
    ],
    toliSettlements: [],
    toliSplits: [
      {
        id: 'sp_seed_1',
        toliId: 't_seed_kerala',
        day: 2,
        dharas: [
          { id: 'dh_seed_1', name: 'Backwater walk', stops: ['Village canals by canoe'], memberIds: ['u_demo', 'u_ananya'] },
          { id: 'dh_seed_2', name: 'Fort Kochi', stops: ['Chinese fishing nets', 'Jew Town spice market'], memberIds: ['u_raj'] },
        ],
        // 5 pm India time on day 2 of the Sahyatra (which starts 12 days from today).
        sangam: { place: 'Boat jetty', at: `${dayFromToday(13)}T11:30:00.000Z` },
        here: [],
        status: 'active',
        createdBy: 'u_demo',
        createdAt: hoursAgo(10),
      },
    ],
    toliLocations: [{ toliId: 't_seed_kerala', userId: 'u_raj', lat: 9.4935, lon: 76.319, at: hoursAgo(0.05), until: new Date(Date.now() + 3_600_000).toISOString() }],
    toliNotes: [
      { id: 'nt_seed_1', toliId: 't_seed_kerala', authorId: 'u_demo', day: null, text: 'Homestay owner: Ramesh (ask at the gate)', createdAt: hoursAgo(9), updatedAt: hoursAgo(9) },
      { id: 'nt_seed_2', toliId: 't_seed_kerala', authorId: 'u_ananya', day: 1, text: 'Carry sunscreen — the houseboat deck gets hot', createdAt: hoursAgo(8), updatedAt: hoursAgo(8) },
    ],
    potliItems: [
      { id: 'po_seed_1', toliId: 't_seed_kerala', addedBy: 'u_demo', text: 'First-aid kit', mine: false, claimedBy: 'u_raj', packed: false, createdAt: hoursAgo(7) },
      { id: 'po_seed_2', toliId: 't_seed_kerala', addedBy: 'u_ananya', text: 'Speaker', mine: false, claimedBy: null, packed: false, createdAt: hoursAgo(6) },
      { id: 'po_seed_3', toliId: 't_seed_kerala', addedBy: 'u_demo', text: 'Charger', mine: true, claimedBy: null, packed: false, createdAt: hoursAgo(5) },
    ],
    kushal: { contacts: [{ id: 'ku_seed_1', userId: 'u_demo', name: 'Maa', token: 'maaKUSHALdemo2026xxxxxx', createdAt: hoursAgo(30) }], checkIns: {}, auto: {} },
    toliEvents: [
      { id: 'ev_seed_1', toliId: 't_seed_kerala', actorId: 'u_demo', type: 'created', data: { name: 'Kerala Toli' }, at: hoursAgo(72) },
      { id: 'ev_seed_2', toliId: 't_seed_kerala', actorId: 'u_raj', type: 'joined', data: { via: 'link' }, at: hoursAgo(70) },
      { id: 'ev_seed_3', toliId: 't_seed_kerala', actorId: 'u_ananya', type: 'joined', data: { via: 'link' }, at: hoursAgo(60) },
      { id: 'ev_seed_4', toliId: 't_seed_kerala', actorId: 'u_raj', type: 'suggested', data: { sujhavId: 'sj_seed_1', kind: 'add-day' }, at: hoursAgo(20) },
      { id: 'ev_seed_5', toliId: 't_seed_office', actorId: 'u_raj', type: 'created', data: { name: 'Office offsite' }, at: hoursAgo(48) },
    ],
  };
}
