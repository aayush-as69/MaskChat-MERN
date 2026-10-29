import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/maskchat'),
  COOKIE_SECRET: z.string().min(32).default('development-only-change-this-secret-32chars'),
  OBSERVABILITY_WINDOW_MS: z.coerce.number().int().min(10000).max(3600000).default(60000),
  OBSERVABILITY_MAX_SAMPLES: z.coerce.number().int().min(100).max(50000).default(10000),
  ERROR_RATE_ALERT: z.coerce.number().min(0.01).max(1).default(0.1),
  HTTP_P95_ALERT_MS: z.coerce.number().min(100).max(60000).default(1500),
  EVENT_LOOP_P99_ALERT_MS: z.coerce.number().min(10).max(10000).default(250),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  ALLOW_DEV_AUTH: z.enum(['true', 'false']).default('true'),
  ADMIN_EMAIL: z.string().email().default('moderator@example.edu'),
  INSTITUTION_DOMAINS: z.string().default('galgotiacollege.edu'),
  INSTITUTION_EMAIL_PATTERN: z.string().min(1).default('^[^.]+\\.(?<cohort>\\d{2})(?<institutionCode>[a-z]{3})(?<degreeCode>[a-z])(?<programCode>[a-z]{2,5})(?<studentCode>\\d+)@(?<domain>[^@]+)$'),
  REQUIRE_INSTITUTION_DOMAIN: z.enum(['true', 'false']).default('false'),
  PRIVATE_UPLOAD_DIR: z.string().min(1).default('./private-uploads'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(1000).default(20),
  JUNIOR_MENTOR_MIN_RATING: z.coerce.number().min(0).max(5).default(4.5),
  JUNIOR_MENTOR_MIN_SESSIONS: z.coerce.number().int().min(0).max(10000).default(5)
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const config = {
  ...parsed.data,
  CLIENT_ORIGIN: new URL(parsed.data.CLIENT_ORIGIN).origin,
  COOKIE_SECURE: parsed.data.COOKIE_SECURE === 'true',
  ALLOW_DEV_AUTH: parsed.data.ALLOW_DEV_AUTH === 'true',
  INSTITUTION_DOMAINS: parsed.data.INSTITUTION_DOMAINS.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
  INSTITUTION_EMAIL_PATTERN: parsed.data.INSTITUTION_EMAIL_PATTERN,
  REQUIRE_INSTITUTION_DOMAIN: parsed.data.REQUIRE_INSTITUTION_DOMAIN === 'true'
};
try { new RegExp(config.INSTITUTION_EMAIL_PATTERN, 'i'); } catch { throw new Error('INSTITUTION_EMAIL_PATTERN must be a valid regular expression'); }
if (config.NODE_ENV === 'production') {
  if (!process.env.INSTITUTION_DOMAINS?.trim() || !config.INSTITUTION_DOMAINS.length) throw new Error('Set INSTITUTION_DOMAINS explicitly to the institution-approved email domains');
  if (config.COOKIE_SECRET === 'development-only-change-this-secret-32chars' || /replace-with|change-this|example/i.test(config.COOKIE_SECRET)) throw new Error('Set COOKIE_SECRET to a strong, randomly generated secret in production');
  if (!config.COOKIE_SECURE) throw new Error('COOKIE_SECURE=true is required in production');
  if (config.ALLOW_DEV_AUTH) throw new Error('ALLOW_DEV_AUTH must be false in production');
  if (!config.REQUIRE_INSTITUTION_DOMAIN) throw new Error('REQUIRE_INSTITUTION_DOMAIN=true is required in production');
  if (new URL(config.CLIENT_ORIGIN).protocol !== 'https:') throw new Error('CLIENT_ORIGIN must use HTTPS in production');
  if (/localhost|127\.0\.0\.1/i.test(config.MONGODB_URI)) throw new Error('MONGODB_URI must point to a non-local production database');
  if (!process.env.PRIVATE_UPLOAD_DIR?.trim()) throw new Error('Set PRIVATE_UPLOAD_DIR explicitly to a private persistent storage location in production');
}
