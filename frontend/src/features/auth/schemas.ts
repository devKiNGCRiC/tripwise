/**
 * schemas.ts — form validation rules (Zod) for login and signup.
 * The same rules give us TypeScript types for the form values for free.
 * The backend re-validates everything — client checks are for fast, friendly feedback.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
  password: z.string().min(1, { error: 'Enter your password' }),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Tell us your name (2+ characters)' })
    .max(50, { error: 'Keep it under 50 characters' }),
  email: z.email({ error: 'Enter a valid email address' }),
  password: z
    .string()
    .min(8, { error: 'Use at least 8 characters' })
    .max(72, { error: 'Keep it under 72 characters' }),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
