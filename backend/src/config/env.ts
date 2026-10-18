/**
 * env.ts — reads and checks the API's settings (from `.env` locally, from Render's
 * dashboard in production). If something required is missing or too weak, the API stops
 * at start-up with a clear message instead of failing later in a confusing way.
 */
import { z } from 'zod';

/** "a, b ,c" → ["a", "b", "c"] (empty parts dropped). */
const commaList = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    );

/** Every setting, its type and its default. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string({ error: 'MONGO_URI is required (your MongoDB Atlas connection string).' }).min(1, 'MONGO_URI is required.'),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required.' })
    .min(32, 'JWT_SECRET must be at least 32 characters long.'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_MODELS: commaList('gemini-flash-latest,gemini-flash-lite-latest'),
  GROQ_MODELS: commaList('openai/gpt-oss-120b,qwen/qwen3.8-27b'),
  // Where the website lives (used in emails and invite links).
  APP_URL: z.string().default('http://localhost:5173'),
  // Email (Brevo) and photo storage (Cloudinary): optional until those accounts are set up.
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

/** The checked settings the rest of the API uses. */
export type Env = z.infer<typeof envSchema>;

/**
 * Check the given variables (process.env by default) and return typed settings.
 * Throws one readable error naming each problem setting.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`TripWise API settings are not valid:\n- ${problems.join('\n- ')}`);
  }
  return result.data;
}
