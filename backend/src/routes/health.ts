/**
 * health.ts — GET /api/health.
 * Render pings it to know the server is up, and the website can call it to "wake"
 * a sleeping free-tier server before the traveller needs it.
 */
import { Router } from 'express';

/** The health route. */
export function healthRoutes(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  return router;
}
