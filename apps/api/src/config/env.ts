import { z } from 'zod';

const trustProxySchema = z
  .string()
  .default('false')
  .transform((value) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    if (/^\d+$/.test(value)) {
      return Number(value);
    }

    return value;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .refine(
      (origins) => origins.every((origin) => URL.canParse(origin)),
      'CORS_ORIGIN must be valid URLs',
    ),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: z.stringbool().default(false),
  TRUST_PROXY: trustProxySchema,
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(30),
  // OpenRouter (chat + vision). The API is the only process that talks to it.
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_BASE_URL: z.url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_CHAT_MODEL: z.string().default('google/gemini-2.5-flash'),
  OPENROUTER_VISION_MODEL: z.string().default('google/gemini-2.5-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  // Local bge-m3 embeddings (transformers.js). No external API involved.
  EMBEDDING_MODEL: z.string().default('Xenova/bge-m3'),
  EMBEDDING_CACHE_DIR: z.string().default('.models'),
  EMBEDDING_MAX_CHARS: z.coerce.number().int().positive().default(8192),
  // Document ingestion limits.
  DOCUMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 1024 * 1024),
  // At-rest encryption for uploaded documents (AES-256-GCM over
  // documento.contenido). Generate with: openssl rand -base64 32.
  DOCUMENTO_ENCRYPTION_KEY: z
    .base64()
    .refine(
      (value) => Buffer.from(value, 'base64').byteLength === 32,
      'DOCUMENTO_ENCRYPTION_KEY must decode to exactly 32 bytes',
    ),
  // Market research (SearXNG) and cache TTL.
  SEARXNG_URL: z.url().default('http://localhost:8888'),
  SEARXNG_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),
  MERCADO_CACHE_HORAS: z.coerce.number().int().positive().default(24),
  // Batch evaluation: parallel proposals per evaluation run.
  EVALUACION_CONCURRENCY: z.coerce.number().int().positive().default(4),
  // IMAP (correo scanning). Leave IMAP_HOST empty to disable the module;
  // the password is an application password, never the account primary one.
  IMAP_HOST: z.string().default(''),
  IMAP_PORT: z.coerce.number().int().positive().default(993),
  IMAP_TLS: z.stringbool().default(true),
  IMAP_USER: z.string().default(''),
  IMAP_PASSWORD: z.string().default(''),
  IMAP_CORREOS_LIMITE: z.coerce.number().int().positive().default(50),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
