/**
 * app.ts — builds the TripWise API (an Express app) without starting it.
 *
 * Keeping "build" separate from "listen" (server.ts) lets tests create the app with fake
 * parts — a fake AI and a fixed clock — and call it directly, no network needed.
 *
 * Order matters: security headers → CORS → body/cookie parsing → rate limit → routes →
 * 404 → error handler.
 */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { accountRoutes } from './routes/account.js';
import { authRoutes } from './routes/auth.js';
import { avatarRoutes } from './routes/avatars.js';
import { destinationRoutes } from './routes/destinations.js';
import { healthRoutes } from './routes/health.js';
import { itineraryRoutes } from './routes/itineraries.js';
import { meRoutes } from './routes/me.js';
import { profileRoutes } from './routes/profile.js';
import { shareRoutes } from './routes/share.js';
import type { AiChain } from './services/ai/chain.js';
import { createMailer, type Mailer } from './services/mailer.js';

/** The swappable parts of the app (real ones in server.ts, fakes in tests). */
export interface AppDeps {
  /** Writes itineraries (the Gemini → Groq fallback chain). */
  ai: AiChain;
  /** The current time; tests pass a fixed clock. */
  now?: () => Date;
  /** Where the website runs, for CORS. */
  clientOrigin?: string;
  /** The website's address, used in emails and invite links. */
  appUrl?: string;
  /** Sends emails (tests collect them instead). */
  mailer?: Mailer;
}

/** Build the Express app. `extra` lets tests mount throw-away routes under /api. */
export function createApp(deps: AppDeps, extra?: (router: Router) => void): express.Express {
  const app = express();
  const api = Router();

  // Render (and Cloudflare) sit in front of us: trust one proxy hop so we see the real IP.
  app.set('trust proxy', 1);
  // Express shouldn't advertise itself.
  app.disable('x-powered-by');

  // Safe default security headers.
  app.use(helmet());
  // Only our website may call the API with cookies.
  app.use(cors({ origin: deps.clientOrigin ?? 'http://localhost:5173', credentials: true }));
  // JSON bodies, kept small; cookies for the refresh token.
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  // A generous overall limit per IP against floods.
  app.use(globalLimiter());

  // Routes.
  const now = deps.now ?? (() => new Date());
  api.use(healthRoutes());
  api.use(authRoutes(now));
  api.use(destinationRoutes());
  api.use(meRoutes(now));
  api.use(profileRoutes(now));
  api.use(avatarRoutes(now));
  api.use(accountRoutes({ now, mailer: deps.mailer ?? createMailer({}), appUrl: deps.appUrl ?? 'http://localhost:5173' }));
  api.use(itineraryRoutes({ ai: deps.ai, now }));
  api.use(shareRoutes());
  extra?.(api);
  app.use('/api', api);

  // Nothing matched → 404; any error → the API's error shape.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
