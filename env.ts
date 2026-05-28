import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// Load .env in development
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(process.cwd(), '../../.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    require('dotenv').config();
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().default(20),
  DATABASE_POOL_MIN: z.coerce.number().default(2),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16),

  ENCRYPTION_KEY: z.string().min(32),
  HASH_ROUNDS: z.coerce.number().default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  FAWRY_MERCHANT_CODE: z.string().optional(),
  FAWRY_SECURITY_KEY: z.string().optional(),
  FAWRY_BASE_URL: z.string().default('https://www.atfawry.com/ECommerceWeb/Fawry/payments'),
  FAWRY_RETURN_URL: z.string().optional(),

  VODAFONE_MERCHANT_ID: z.string().optional(),
  VODAFONE_API_KEY: z.string().optional(),
  VODAFONE_BASE_URL: z.string().default('https://api.vodafone.com.eg/payment/v1'),
  VODAFONE_CALLBACK_URL: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Academy Mustafa <noreply@academy.example.com>'),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('me-south-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_CDN_URL: z.string().optional(),
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  BULL_CONCURRENCY: z.coerce.number().default(5),
  BULL_RETRY_ATTEMPTS: z.coerce.number().default(3),
  BULL_RETRY_DELAY: z.coerce.number().default(5000),

  APP_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:3000'),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,

  database: {
    url: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    poolMin: env.DATABASE_POOL_MIN,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpires: env.JWT_ACCESS_EXPIRES,
    refreshExpires: env.JWT_REFRESH_EXPIRES,
  },

  cookieSecret: env.COOKIE_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
  hashRounds: env.HASH_ROUNDS,

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },

  fawry: {
    merchantCode: env.FAWRY_MERCHANT_CODE,
    securityKey: env.FAWRY_SECURITY_KEY,
    baseUrl: env.FAWRY_BASE_URL,
    returnUrl: env.FAWRY_RETURN_URL,
  },

  vodafone: {
    merchantId: env.VODAFONE_MERCHANT_ID,
    apiKey: env.VODAFONE_API_KEY,
    baseUrl: env.VODAFONE_BASE_URL,
    callbackUrl: env.VODAFONE_CALLBACK_URL,
  },

  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  },

  storage: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    cdnUrl: env.S3_CDN_URL,
    maxFileSizeMb: env.MAX_FILE_SIZE_MB,
  },

  corsOrigins: env.CORS_ORIGINS.split(',').map(s => s.trim()),

  logLevel: env.LOG_LEVEL,

  bull: {
    concurrency: env.BULL_CONCURRENCY,
    retryAttempts: env.BULL_RETRY_ATTEMPTS,
    retryDelay: env.BULL_RETRY_DELAY,
  },

  appUrl: env.APP_URL,
  apiUrl: env.API_URL,

  admin: {
    seedEmail: env.ADMIN_SEED_EMAIL,
    seedPassword: env.ADMIN_SEED_PASSWORD,
  },
} as const;
