/**
 * admin.ts (middleware) — admins only. Runs after requireAuth (which checks the login and that
 * the account isn't blocked); anyone who isn't an admin gets 403.
 */
import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../lib/errors.js';
import { currentUser } from './auth.js';

/** 403 unless the signed-in user is an admin. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  next(currentUser(req).role === 'admin' ? undefined : forbidden('Admins only.'));
}
