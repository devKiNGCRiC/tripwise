/**
 * tolis.ts (mock data) — Tolis for the demo, and the shapes the mock stores them in:
 *   Kerala Toli    Demo is the Sutradhar, with Raj and Ananya; its Sahyatra is Demo's upcoming
 *                  Kerala trip; one open suggestion, one Tithi poll and a few chat messages
 *   Office offsite Raj leads an office Toli in announcement mode; Demo and Ananya are Sahyatris
 * Stored records mirror the real API's collections (members inside the Toli; suggestions,
 * polls, budgets, messages, raised hands and events alongside).
 */
import type { SujhavChange, ToliRole, TravelMode, TripType } from '@/lib/api/types';
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
          { userId: 'u_raj', role: 'sahyatri', joinedAt: hoursAgo(70), phone: '+919876543210' },
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
    toliEvents: [
      { id: 'ev_seed_1', toliId: 't_seed_kerala', actorId: 'u_demo', type: 'created', data: { name: 'Kerala Toli' }, at: hoursAgo(72) },
      { id: 'ev_seed_2', toliId: 't_seed_kerala', actorId: 'u_raj', type: 'joined', data: { via: 'link' }, at: hoursAgo(70) },
      { id: 'ev_seed_3', toliId: 't_seed_kerala', actorId: 'u_ananya', type: 'joined', data: { via: 'link' }, at: hoursAgo(60) },
      { id: 'ev_seed_4', toliId: 't_seed_kerala', actorId: 'u_raj', type: 'suggested', data: { sujhavId: 'sj_seed_1', kind: 'add-day' }, at: hoursAgo(20) },
      { id: 'ev_seed_5', toliId: 't_seed_office', actorId: 'u_raj', type: 'created', data: { name: 'Office offsite' }, at: hoursAgo(48) },
    ],
  };
}
