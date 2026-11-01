/**
 * users.ts — seed accounts for the mock backend.
 * Passwords are plain text ONLY because this is fake in-browser data;
 * the real backend stores bcrypt hashes.
 *
 * Besides the demo, admin and blocked accounts there is a small circle of travellers so the
 * friends features have someone to show: Raj (the demo's friend), Ananya (has asked to be
 * friends), Dev (the demo asked him) and Meera (a public passport anyone can open).
 */
import type { Preferences, Privacy, ThemePalette, TravellerType, User } from '@/lib/api/types';

/** A user record as the (fake) database stores it — includes the password and profile. */
export interface MockUser extends User {
  password: string;
  bio: string;
  travellerType: TravellerType | null;
  homeCity: string;
  preferences: Preferences;
  privacy: Privacy;
  theme: ThemePalette | null;
  inviteCode: string;
  usernameChangedAt?: string;
  /** Set when a profile photo has been uploaded (the version changes its URL). */
  avatarVersion?: number;
}

/** A new user record with the default profile parts filled in. */
export function person(user: Partial<MockUser> & Pick<MockUser, 'id' | 'name' | 'username' | 'email' | 'inviteCode'>): MockUser {
  return {
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-01T10:00:00.000Z',
    blocked: false,
    bio: '',
    travellerType: null,
    homeCity: '',
    preferences: {},
    privacy: { passport: 'friends', showJournal: true },
    theme: null,
    ...user,
  };
}

export const seedUsers: MockUser[] = [
  person({
    id: 'u_demo',
    name: 'Demo Traveller',
    username: 'demotraveller',
    email: 'demo@tripwise.app',
    inviteCode: 'demoJOIN01',
    bio: 'Chai, mountains and slow mornings. Always hunting the best thali in town.',
    travellerType: 'foodie',
    homeCity: 'Pune',
    preferences: { budget: 4000, pace: 'chill', interests: ['food', 'culture'], travellers: 'couple' },
  }),
  person({ id: 'u_admin', name: 'Aditi Admin', username: 'aditiadmin', email: 'admin@tripwise.app', password: 'admin12345', role: 'admin', createdAt: '2026-08-15T10:00:00.000Z', inviteCode: 'adminJOIN1' }),
  person({ id: 'u_blocked', name: 'Bhola Blocked', username: 'blockedbhola', email: 'blocked@tripwise.app', createdAt: '2026-09-10T10:00:00.000Z', blocked: true, inviteCode: 'bholaJOIN1' }),
  person({
    id: 'u_meera',
    name: 'Meera Iyer',
    username: 'meera',
    email: 'meera@tripwise.app',
    inviteCode: 'meeraJOIN1',
    bio: 'Backpacking India one sleeper train at a time.',
    travellerType: 'backpacker',
    homeCity: 'Chennai',
    privacy: { passport: 'everyone', showJournal: true },
  }),
  person({ id: 'u_raj', name: 'Raj Roy', username: 'king', email: 'raj@tripwise.app', inviteCode: 'kingJOIN01', bio: 'Weekend treks, weekday spreadsheets.', travellerType: 'adventure', homeCity: 'Mumbai' }),
  person({ id: 'u_ananya', name: 'Ananya Das', username: 'ananya', email: 'ananya@tripwise.app', inviteCode: 'ananyaJOIN', travellerType: 'culture-seeker', homeCity: 'Lucknow' }),
  person({ id: 'u_dev', name: 'Dev Patel', username: 'dev', email: 'dev@tripwise.app', inviteCode: 'devJOIN001', travellerType: 'group-organiser', homeCity: 'Ahmedabad' }),
];
