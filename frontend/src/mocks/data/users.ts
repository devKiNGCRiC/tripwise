/**
 * users.ts — seed accounts for the mock backend.
 * Passwords are plain text ONLY because this is fake in-browser data;
 * the real backend will store bcrypt hashes.
 */
import type { User } from '@/lib/api/types';

/** A user record as the (fake) database stores it — includes the password. */
export interface MockUser extends User {
  password: string;
}

export const seedUsers: MockUser[] = [
  {
    id: 'u_demo',
    name: 'Demo Traveller',
    email: 'demo@tripwise.app',
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-01T10:00:00.000Z',
    blocked: false,
  },
  {
    id: 'u_admin',
    name: 'Ava Admin',
    email: 'admin@tripwise.app',
    password: 'admin12345',
    role: 'admin',
    createdAt: '2026-08-15T10:00:00.000Z',
    blocked: false,
  },
  {
    id: 'u_blocked',
    name: 'Blocked Bob',
    email: 'blocked@tripwise.app',
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-10T10:00:00.000Z',
    blocked: true,
  },
];
