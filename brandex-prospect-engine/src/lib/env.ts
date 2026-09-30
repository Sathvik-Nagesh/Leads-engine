import { z } from 'zod';

/**
 * Server-side environment validation.
 * Import this everywhere you need env vars — never import process.env directly.
 */

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),

  // AI: DeepSeek
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_DEFAULT_MODEL: z.string().default('deepseek-chat'),
  DEEPSEEK_FLASH_MODEL: z.string().default('deepseek-chat'),

  // AI: Jev (optional)
  JEV_API_KEY: z.string().optional(),
  JEV_BASE_URL: z.string().url().optional().or(z.literal('')),
  JEV_DEFAULT_MODEL: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_PLACES_URL: z
    .string()
    .url()
    .default('https://maps.googleapis.com/maps/api/place'),

  // Website fetcher
  FETCHER_MAX_BYTES: z.coerce.number().default(5_242_880),
  FETCHER_TIMEOUT_MS: z.coerce.number().default(15_000),
  FETCHER_USER_AGENT: z
    .string()
    .default('BrandexProspectEngine/1.0 (+https://brandex.in/bot)'),

  // Jina (optional fallback)
  JINA_API_KEY: z.string().optional(),
  JINA_BASE_URL: z.string().url().optional().or(z.literal('')),

  // Budget
  BUDGET_MONTHLY_INR: z.coerce.number().default(1200),
  USD_TO_INR_RATE: z.coerce.number().default(84),

  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 chars'),

  // SMTP (optional for V1)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration. Check .env.local.');
  }
  return result.data;
}

// Singleton — validated once at startup
export const env = validateEnv();
