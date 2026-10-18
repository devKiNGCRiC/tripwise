/**
 * username.ts — @usernames and invite codes.
 *
 * A username is 3–20 characters of a–z, 0–9 and _, never starting with a digit, stored
 * lower-case so "Asha" and "asha" are the same name. Everyone gets one at signup, made from
 * their name (with a few digits added if it's taken); they can change it later.
 */
import { randomInt } from 'node:crypto';
import { User, type UserDoc } from '../db/models/index.js';

/** Words that look like site pages or staff, so nobody can take them. */
const RESERVED = new Set(['admin', 'tripwise', 'passport', 'join', 'api', 'login', 'signup', 'u', 'me', 'help', 'support']);

/** Allowed shape, after lower-casing. */
const SHAPE = /^[a-z_][a-z0-9_]{2,19}$/;

/** Letters used in invite codes (no look-alikes needed: they are copied, not typed). */
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** "  Meera_K " → "meera_k". */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Why a (normalized) username can't be used, or null if it's fine. */
export function usernameProblem(name: string): string | null {
  if (name.length < 3 || name.length > 20) return 'Usernames are 3 to 20 characters';
  if (/^[0-9]/.test(name)) return "Usernames can't start with a number";
  if (!SHAPE.test(name)) return 'Use only letters, numbers and _';
  if (RESERVED.has(name)) return "That username isn't available";
  return null;
}

/** A free username based on someone's name ("Asha Rao" → "asharao", or "asharao482"). */
export async function makeUsername(fullName: string): Promise<string> {
  // Keep plain letters and digits; make sure it starts with a letter and is long enough.
  let base = fullName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 14);
  if (!/^[a-z]/.test(base)) base = `t${base}`;
  if (base.length < 3) base = `${base}traveller`.slice(0, 14);
  if (RESERVED.has(base)) base = `${base}_t`;

  // The plain name if it's free, otherwise add 2–4 random digits until one is free.
  if (!(await User.exists({ username: base }))) return base;
  for (let digits = 2; ; digits = Math.min(digits + 1, 4)) {
    const candidate = `${base}${randomInt(10 ** (digits - 1), 10 ** digits)}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
}

/** A fresh 10-character invite code. */
export function newInviteCode(): string {
  return Array.from({ length: 10 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}

/** Give an older account its username and invite code if it doesn't have them yet. */
export async function ensureUsername(user: UserDoc): Promise<UserDoc> {
  if (user.username && user.inviteCode) return user;
  if (!user.username) user.username = await makeUsername(user.name);
  if (!user.inviteCode) user.inviteCode = newInviteCode();
  await user.save();
  return user;
}
