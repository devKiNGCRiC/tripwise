/**
 * users.ts — seed accounts for the mock backend.
 * Passwords are plain text ONLY because this is fake in-browser data;
 * the real backend stores bcrypt hashes.
 *
 * Besides the demo, admin and blocked accounts there is a small circle of travellers so the
 * friends features have someone to show: Kabir (the demo's friend), Zoya (has asked to be
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
  person({ id: 'u_admin', name: 'Ava Admin', username: 'avaadmin', email: 'admin@tripwise.app', password: 'admin12345', role: 'admin', createdAt: '2026-08-15T10:00:00.000Z', inviteCode: 'adminJOIN1' }),
  person({ id: 'u_blocked', name: 'Blocked Bob', username: 'blockedbob', email: 'blocked@tripwise.app', createdAt: '2026-09-10T10:00:00.000Z', blocked: true, inviteCode: 'bobJOIN001' }),
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
  person({ id: 'u_kabir', name: 'Kabir Shah', username: 'kabir', email: 'kabir@tripwise.app', inviteCode: 'kabirJOIN1', bio: 'Weekend treks, weekday spreadsheets.', travellerType: 'adventure', homeCity: 'Mumbai' }),
  person({ id: 'u_zoya', name: 'Zoya Khan', username: 'zoya', email: 'zoya@tripwise.app', inviteCode: 'zoyaJOIN01', travellerType: 'culture-seeker', homeCity: 'Lucknow' }),
  person({ id: 'u_dev', name: 'Dev Patel', username: 'dev', email: 'dev@tripwise.app', inviteCode: 'devJOIN001', travellerType: 'group-organiser', homeCity: 'Ahmedabad' }),
];
