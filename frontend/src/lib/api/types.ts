/**
 * types.ts — the data contract between frontend and backend.
 *
 * These shapes are copied from the design spec (§5). The mock API (src/mocks)
 * and the real Express backend MUST both return exactly these shapes, which is
 * what lets us switch from mock to real by flipping one env variable.
 */
import type { Category, PayMethod, Split } from '@lekha-rules';
import type { SujhavChange, ToliRole, TripType } from '@toli-rules';

/* ── Users & auth ─────────────────────────────────────────────────────── */

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  /** "@" handle without the @, e.g. "asharao" (unique, lower-case). */
  username: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  /** Which plan the account is on (decides daily limits). */
  plan?: 'free' | 'premium';
  /** ISO date string, e.g. "2026-10-02T09:00:00.000Z" */
  createdAt: string;
  blocked: boolean;
}

/** Returned by login / signup / google: who you are + a short-lived access token. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

/* ── Destinations ─────────────────────────────────────────────────────── */

export type Vibe = 'beach' | 'mountains' | 'culture' | 'party' | 'adventure' | 'spiritual' | 'food' | 'nature' | 'city' | 'romantic';

export type BudgetTier = 'budget' | 'mid' | 'luxury';

/** Money is always amount + ISO currency code, e.g. { amount: 3500, currency: "INR" }. */
export interface Money {
  amount: number;
  currency: string;
}

export interface Destination {
  id: string;
  /** URL-friendly name used in /destinations/:slug, e.g. "goa" */
  slug: string;
  name: string;
  /** The name in Hindi (Devanagari), e.g. "गोवा". */
  localName?: string;
  /** Which of India's seven worlds it belongs to (pages show that living landscape). Absent abroad. */
  region?: 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters';
  country: string;
  vibes: Vibe[];
  budgetTier: BudgetTier;
  /** Best months to visit, 1 = January … 12 = December */
  bestMonths: number[];
  summary: string;
  highlights: string[];
  avgDailyCost: Money;
  image: { url: string; credit: string; creditUrl: string };
}

/** What kind of place it is (backend services/placeKinds.ts). */
export type PlaceKind = 'temple' | 'shrine' | 'ghat' | 'fort' | 'palace' | 'museum' | 'wildlife' | 'heritage' | 'beach' | 'water' | 'garden' | 'nature' | 'market' | 'monument';

/** A place to visit at a destination, from the catalogue (Wikidata; photos from Commons, credited). */
export interface Place {
  /** Stable id from the Wikidata item, e.g. "p_Q1234" */
  id: string;
  /** The destination's slug */
  destination: string;
  name: string;
  description?: string;
  kind: PlaceKind;
  interests: Interest[];
  lat: number;
  lon: number;
  /** How many Wikipedias cover it (higher = more famous) */
  fame: number;
  wikidata: string;
  wikipedia?: string;
  image?: { url: string; credit: string; creditUrl: string };
}

/** Optional filters for GET /destinations. */
export interface DestinationFilters {
  vibe?: Vibe;
  budget?: BudgetTier;
  month?: number;
  q?: string;
}

/* ── Itineraries (used from Plan 2 onward) ────────────────────────────── */

export type Interest = 'food' | 'culture' | 'adventure' | 'nightlife' | 'nature' | 'shopping' | 'history' | 'relaxation' | 'photography' | 'spiritual';

export type Travellers = 'solo' | 'couple' | 'friends' | 'family';

export type Pace = 'chill' | 'balanced' | 'packed';

/** Everything the user tells the planner. */
export interface TripRequest {
  destination: string;
  /** ISO dates "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  budget: Money;
  travellers: Travellers;
  interests: Interest[];
  pace: Pace;
  /** Planning a Toli's shared trip (leaders only). */
  toliId?: string;
}

/** How you get from one activity to the next. */
export type TransferMode = 'walk' | 'auto' | 'cab' | 'bus' | 'train' | 'boat';

export interface Activity {
  time: 'morning' | 'afternoon' | 'evening';
  /** Planned start, 24-hour "HH:MM" */
  startTime?: string;
  title: string;
  description: string;
  location?: string;
  estCost?: number;
  /** Getting to the NEXT activity (absent on the day's last one) */
  transfer?: { mode: TransferMode; minutes: number };
  /** The catalogue place this stop is at, when it is one (id and coordinates, for maps later). */
  place?: { id: string; lat: number; lon: number };
}

export interface Day {
  dayNumber: number;
  date: string;
  theme: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  /** Present once the user creates a public share link. */
  shareId?: string;
  request: TripRequest;
  title: string;
  summary: string;
  days: Day[];
  estimatedCost: {
    total: number;
    breakdown: { stay: number; food: number; transport: number; activities: number };
    currency: string;
  };
  tips: string[];
  packingList: string[];
  /** The Toli this trip is the Sahyatra of (null for a solo trip). */
  toliId?: string | null;
  /** Which AI wrote it — or 'tripwise' for TripWise's own planner (no AI). */
  provider: 'gemini' | 'groq' | 'tripwise';
  /** 'ai' = written for this trip; 'cache' = re-used from a similar trip (instant, free);
   *  'local' = planned by TripWise from its places catalogue (no AI, free). */
  source?: 'ai' | 'cache' | 'local';
  /** Which of India's seven worlds the trip is in ('abroad' outside India; null if unknown). */
  region?: RegionKey | 'abroad' | null;
  createdAt: string;
}

/** Daily AI-generation allowance. */
export interface Quota {
  used: number;
  limit: number;
  /** ISO time when `used` resets to 0 */
  resetsAt: string;
}

/** Response of POST /itineraries/generate. */
export interface GenerateResponse {
  itinerary: Itinerary;
  quota: Quota;
}

/**
 * One line of POST /itineraries/generate/stream: the trip arrives piece by piece.
 * `reset` means a model failed part-way and another starts over (drop what was shown).
 */
export type GenerateEvent =
  | { type: 'meta'; title: string; summary: string }
  | { type: 'day'; day: Day }
  | { type: 'reset' }
  | { type: 'done'; itinerary: Itinerary; quota: Quota }
  | { type: 'error'; error: { code: ApiErrorCode; message: string } };

/* ── Profile, passport, journals & friends ────────────────────────────── */

/** India's seven worlds. */
export type RegionKey = 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters';

/** The kind of traveller someone says they are. */
export type TravellerType =
  | 'solo-explorer'
  | 'backpacker'
  | 'couple'
  | 'family-planner'
  | 'group-organiser'
  | 'luxury'
  | 'foodie'
  | 'culture-seeker'
  | 'adventure'
  | 'slow-traveller';

/** Who can see a passport. */
export type PassportVisibility = 'friends' | 'everyone' | 'private';

/** Planner defaults (any may be missing). */
export interface Preferences {
  budget?: number;
  interests?: Interest[];
  pace?: Pace;
  travellers?: Travellers;
  /** How feature names read: Hindi/Sanskrit (default) or plain English. */
  names?: 'indian' | 'english';
}

/** Privacy choices. */
export interface Privacy {
  passport: PassportVisibility;
  showJournal: boolean;
}

/** Colours read from photos that tint the app (same shape as world/palette.ts's Palette). */
export interface ThemePalette {
  tint: string;
  swatches: [string, string, string, string];
  accents: { day: [string, string]; night: [string, string] };
}

/** The signed-in traveller's own profile (Account tab). */
export interface Profile extends User {
  bio: string;
  travellerType: TravellerType | null;
  homeCity: string;
  preferences: Preferences;
  privacy: Privacy;
  theme: ThemePalette | null;
  inviteCode: string;
}

/** What PATCH /me/profile accepts (any subset). */
export type ProfilePatch = Partial<Pick<Profile, 'name' | 'username' | 'bio' | 'travellerType' | 'homeCity' | 'theme'>> & {
  preferences?: Preferences;
  privacy?: Partial<Privacy>;
};

/** One of the seven worlds on a passport. */
export interface PassportWorld {
  key: RegionKey;
  name: string;
  visited: boolean;
}

/** One Yatra mark (badge). */
export interface Mark {
  id: string;
  emoji: string;
  name: string;
  how: string;
  /** "YYYY-MM-DD" when earned, null if not yet. */
  earnedAt: string | null;
}

/** A stamp on the visa pages. */
export interface Stamp {
  id: string;
  destination: string;
  localName?: string;
  region: RegionKey | 'abroad' | null;
  startDate: string;
  endDate: string;
  status: 'completed' | 'upcoming';
  daysUntil?: number;
  journal?: { rating: number | null; hasMemory: boolean; photoCount: number; coverPhotoUrl?: string };
}

/** A whole passport (yours or someone else's). */
export interface Passport {
  cover: {
    name: string;
    username: string;
    avatarUrl?: string;
    bio: string;
    travellerType: TravellerType | null;
    homeCity: string;
    joined: string;
    theme: ThemePalette | null;
  };
  stats: { trips: number; worlds: number; daysAway: number; marks: number };
  worlds: PassportWorld[];
  abroadCount: number;
  nextWorld: { key: RegionKey; name: string; bestMonths: number[]; suggest: string; line: string } | null;
  marks: Mark[];
  stamps: Stamp[];
}

/** One photo in a journal. */
export interface JournalPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** A trip's journal. */
export interface Journal {
  itineraryId: string;
  rating: number | null;
  memory: string;
  photos: JournalPhoto[];
  updatedAt: string | null;
}

/** How you're connected to someone. */
export type Relation = 'self' | 'friend' | 'pending-out' | 'pending-in' | 'none' | 'blocked';

/** A traveller's small card. */
export interface Card {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  travellerType: TravellerType | null;
  trips: number;
}

/** A friend request (incoming or sent). */
export interface FriendRequest {
  id: string;
  user: Card;
  createdAt: string;
}

/** GET /friends. */
export interface FriendsList {
  friends: Card[];
  incoming: FriendRequest[];
  sent: FriendRequest[];
}

/* ── Errors ───────────────────────────────────────────────────────────── */

/** Machine-readable error codes. NETWORK is client-side only (server unreachable). */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'NO_CATALOGUE'
  | 'CONFLICT'
  | 'SERVER'
  | 'NETWORK';

/** Shape of every error response body from the API. */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

/* ── Toli: planning and travelling together ────────────────────────────── */

/** Toli roles, trip types, suggested changes and stops — the same definitions the API uses. */
export type { SujhavChange, StopDraft, ToliRole, TripType } from '@toli-rules';

/** A Sahyatri as their Toli shows them. */
export interface ToliMember {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: ToliRole;
  /** Only when they chose to share it with this Toli. */
  phone?: string;
  /** Their UPI ID, only when they chose to share it with this Toli. */
  upi?: string;
}

/** A Toli as a member sees it. */
export interface Toli {
  id: string;
  name: string;
  type: TripType;
  announcementMode: boolean;
  /** The Sahyatra (shared trip), once planned. */
  tripId: string | null;
  /** What polls decided. */
  choices: { destination?: string; startDate?: string; endDate?: string; transport?: string };
  me: { role: ToliRole; canPost: boolean; requestsOff: boolean; phone?: string; upi?: string };
  members: ToliMember[];
  memberCount: number;
  /** For planning: members' favourite interests, and the top of the budget range that suits all. */
  planDefaults: { interests: Interest[]; budget?: number };
  /** Leaders only. */
  inviteUrl?: string;
  /** In "my Tolis" only: chat messages I haven't read. */
  unread?: number;
}

/** What an invite link leads to. */
export interface ToliInvite {
  toliId: string;
  name: string;
  type: TripType;
  memberCount: number;
  sutradhar?: { id: string; name: string; username: string; avatarUrl?: string };
  alreadyMember: boolean;
}

/** Someone in a Toli feature (author, voter, actor). */
export interface ToliPerson {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

/** A suggestion on the Sahyatra. */
export interface Sujhav {
  id: string;
  author: ToliPerson | null;
  change: SujhavChange;
  note?: string;
  up: number;
  down: number;
  myVote: 1 | -1 | 0;
  status: 'open' | 'approved' | 'declined';
  decidedBy?: ToliPerson | null;
  decidedAt?: string;
  reason?: string;
  createdAt: string;
}

/** Kinds of poll. */
export type PollKind = 'destination' | 'tithi' | 'transport' | 'free';
/** Ways of travelling a transport poll offers. */
export type TravelMode = 'train' | 'bus' | 'flight' | 'car' | 'bike';

/** One option of a poll. */
export interface PollOption {
  id: string;
  label: string;
  start?: string;
  end?: string;
  mode?: TravelMode;
  /** Destination polls: TripWise's facts when the place is in the catalogue (null otherwise). */
  facts?: { slug: string; bestMonths: number[]; avgDailyCost: number | null; topPlaces: string[] } | null;
}

/** A poll as a member sees it. */
export interface Poll {
  id: string;
  kind: PollKind;
  question: string;
  options: PollOption[];
  multi: boolean;
  closesAt?: string;
  status: 'open' | 'closed';
  winner?: string;
  counts: Record<string, number>;
  myVotes: string[];
  leading: string[];
  notVoted: ToliPerson[];
  authorId: string;
  createdAt: string;
}

/** A new poll. */
export type NewPoll =
  | { kind: 'destination'; question?: string; options: { label: string }[]; closesAt?: string }
  | { kind: 'tithi'; question?: string; options: { start: string; end: string }[]; closesAt?: string }
  | { kind: 'transport'; question?: string; options: { mode: TravelMode }[]; closesAt?: string }
  | { kind: 'free'; question: string; options: { label: string }[]; closesAt?: string };

/** Budget comfort: my private range and what suits everyone (never anyone else's numbers). */
export interface ToliBudget {
  mine: [number, number] | null;
  group: { answered: number; members: number; range: [number, number] | null; closest?: [number, number] };
}

/** A chat (Chaupal) message. */
export interface ChaupalMessage {
  id: string;
  author: ToliPerson;
  text: string;
  replyTo?: { id: string; text: string; authorName: string };
  /** Mentioned members' ids. */
  mentions: string[];
  card?: { type: 'sujhav' | 'poll' | 'place' | 'plan'; id: string; title: string };
  photos: { id: string; url: string }[];
  clientId: string;
  createdAt: string;
}

/** A new chat message. */
export interface NewMessage {
  text: string;
  /** Made on the phone, so an offline retry is stored once. */
  clientId: string;
  replyTo?: string;
  photoIds?: string[];
  card?: { type: 'place' | 'plan'; id: string };
}

/** A raised hand (Anurodh). `reply` only ever reaches the person who asked. */
export interface Anurodh {
  id: string;
  user: ToliPerson;
  about: string;
  status: 'open' | 'granted' | 'declined' | 'answered';
  grant?: 'one' | '30m' | '1h' | 'trip';
  reply?: string;
  createdAt: string;
}

/** A leader's answer to a raised hand. */
export type AnurodhAction = 'one' | '30m' | '1h' | 'trip' | 'reply' | 'decline';

/* ── Lekha (a Toli's money; amounts in whole paise) ───────────────────── */

export type { Category, PayMethod, Split } from '@lekha-rules';

/** An expense as a member sees it. */
export interface ToliExpense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  method: PayMethod;
  /** Which day of the Sahyatra (1 = first), when given. */
  day?: number;
  /** Personal ones are only ever shown to their owner. */
  personal: boolean;
  paidBy: ToliPerson;
  shares: { person: ToliPerson; amount: number }[];
  addedBy: ToliPerson;
  canDelete: boolean;
  createdAt: string;
}

/** A new expense (`clientId` is made on the phone, so an offline retry is stored once). */
export interface NewExpense {
  clientId: string;
  title: string;
  amount: number;
  category: Category;
  method: PayMethod;
  day?: number;
  personal?: boolean;
  /** Default: me. */
  paidBy?: string;
  /** Default: everyone, equally. */
  split?: Split;
}

/** Money paid back between two Sahyatris (never deleted). */
export interface Settlement {
  id: string;
  from: ToliPerson;
  to: ToliPerson;
  amount: number;
  method: PayMethod;
  recordedBy: ToliPerson;
  createdAt: string;
}

/** A payment back to record. */
export interface NewSettlement {
  clientId: string;
  from: string;
  to: string;
  amount: number;
  method: PayMethod;
}

/** Everything the Lekha tab shows (my personal spending only ever to me). */
export interface LekhaSummary {
  /** Members, largest owed first; positive = gets money back. */
  balances: { person: ToliPerson; net: number }[];
  /** The fewest payments that settle everyone (a UPI link when the payee shared a UPI ID). */
  settleUp: { from: ToliPerson; to: ToliPerson; amount: number; upiLink?: string }[];
  totals: {
    total: number;
    byCategory: Record<Category, number>;
    perPerson: { person: ToliPerson; share: number }[];
    mine: { share: number; personal: number; total: number };
    /** TripWise's estimate for the Sahyatra (paise), null without one. */
    estimate: number | null;
  };
  settlements: Settlement[];
}

/* ── On the trip (Dharas, locations, notes, Potli, Kushal) ──────────── */

export type { ShareFor } from '@yatra-rules';

/** A Toli splitting up: Dharas that meet again at a Sangam (or fixed Dharas for the whole trip). */
export interface ToliSplit {
  id: string;
  /** A day of the Sahyatra, or null for fixed Dharas (Bus 1, Section A). */
  day: number | null;
  status: 'proposed' | 'active';
  dharas: { id: string; name: string; stops: string[]; members: ToliPerson[]; lead?: ToliPerson }[];
  sangam: { place: string; at: string } | null;
  headcount: { here: ToliPerson[]; missing: ToliPerson[] };
  createdBy: ToliPerson;
}

/** A new split. */
export interface NewSplit {
  day: number | null;
  dharas: { name: string; stops?: string[]; leadId?: string }[];
  sangam?: { place: string; at: string };
}

/** Where a Sahyatri is, as the Toli sees it. */
export interface SharedLocation {
  person: ToliPerson;
  near: { name: string; km: number } | null;
  at: string;
  until: string;
  mapsLink: string;
}

/** A note the Toli keeps (whole trip, or one day). */
export interface ToliNote {
  id: string;
  text: string;
  day: number | null;
  author: ToliPerson;
  canEdit: boolean;
  updatedAt: string;
}

/** A Potli (packing list) item. */
export interface PotliItem {
  id: string;
  text: string;
  /** On my own private list. */
  mine: boolean;
  claimedBy: ToliPerson | null;
  packed: boolean;
  canDelete: boolean;
}

/** A Kushal (family) contact. */
export interface KushalContact {
  id: string;
  name: string;
  link: string;
  createdAt: string;
}

/** My latest check-in, as I see it. */
export interface KushalLatest {
  place: string;
  at: string;
  note?: string;
}

/** What a family sees on a Kushal link. */
export interface KushalView {
  traveller: string;
  latest: (KushalLatest & { position?: { lat: number; lon: number }; mapsLink?: string }) | null;
}

/* ── Admin ──────────────────────────────────────────────────────────── */

/** How TripWise is being used (counts only). */
export interface AdminOverview {
  travellers: { total: number; newThisWeek: number };
  trips7d: { ai: number; cache: number; local: number };
  today: { plans: number; regens: number; asks: number };
  tolis: number;
  signups30d: { date: string; count: number }[];
  topDestinations: { name: string; trips: number }[];
}

/** A traveller as admins see them (account basics only). */
export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium';
  blocked: boolean;
  joined: string;
  trips: number;
}

/** A catalogue destination as admins see it. */
export interface AdminDestination {
  slug: string;
  name: string;
  region: string | null;
  country: string;
  bestMonths: number[];
  places: number;
  trips30d: number;
  hidden: boolean;
}

/** Why a passport was reported. */
export type ReportReason = 'spam' | 'offensive' | 'impersonation' | 'other';

/** A report of a public passport. */
export interface AdminReport {
  id: string;
  reason: ReportReason;
  note?: string;
  status: 'open' | 'dismissed' | 'actioned';
  action?: 'dismiss' | 'remove-content' | 'block';
  reporter: { id: string; name: string; username: string };
  target: { id: string; name: string; username: string; bio: string; blocked: boolean };
  createdAt: string;
}

/** One line of the admin audit log. */
export interface AdminLogEntry {
  id: string;
  admin: { id: string; name: string };
  action: string;
  targetType: 'user' | 'destination' | 'report';
  target: string;
  detail: string;
  at: string;
}

/* ── Ask TripWise ─────────────────────────────────────────────────────── */

/** A message in my Ask TripWise conversation about a trip. */
export interface AskMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Real catalogue places the answer mentions. */
  places?: { id: string; name: string; destination: string }[];
  /** Questions to tap next. */
  followUps?: string[];
  /** The answer used MET Norway's forecast (show the credit). */
  weatherCredit?: boolean;
  at: string;
}

/** One event in a Toli's activity feed. */
export interface ToliEvent {
  id: string;
  actor: ToliPerson;
  type: string;
  data: Record<string, unknown>;
  at: string;
}
