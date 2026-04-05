import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),

  NEXT_PUBLIC_PUBLIC_SITE_URL: z.string().url().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),

  // 👇 aceita QUALQUER UMA DAS DUAS (resolve seu problema)
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  INVITE_REDIRECT_URL: z.string().url().optional(),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),

  NOTIFICATIONS_PROVIDER: z.enum(["smtp", "resend"]).optional(),
  NOTIFICATIONS_WORKER_SECRET: z.string().optional(),

  NOTIFICATIONS_SMTP_HOST: z.string().optional(),
  NOTIFICATIONS_SMTP_PORT: z.string().optional(),
  NOTIFICATIONS_SMTP_USER: z.string().optional(),
  NOTIFICATIONS_SMTP_PASS: z.string().optional(),
  NOTIFICATIONS_SMTP_SECURE: z.string().optional(),

  NOTIFICATIONS_REPLY_TO: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  CRON_SECRET: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  PORTAL_ADMIN_EMAIL: z.string().optional(),
  PORTAL_ADMIN_FULL_NAME: z.string().optional(),
  PORTAL_ADMIN_TEMP_PASSWORD: z.string().optional()
});

type ServerEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  inviteRedirectUrl: string;
  passwordResetRedirectUrl: string;
};

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = envSchema.parse(process.env);

  // 👇 resolve automaticamente QUAL chave usar
  const publishableKey =
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const secretKey =
    parsed.SUPABASE_SECRET_KEY ||
    parsed.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error(
      "Configure as chaves do Supabase no .env.local (PUBLISHABLE/ANON + SECRET/SERVICE_ROLE)."
    );
  }

  cachedServerEnv = {
    NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PUBLIC_SITE_URL: parsed.NEXT_PUBLIC_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_SECRET_KEY: secretKey,

    OPENAI_API_KEY: parsed.OPENAI_API_KEY,
    OPENAI_MODEL: parsed.OPENAI_MODEL || "gpt-4o-mini",

    inviteRedirectUrl:
      parsed.INVITE_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`,

    passwordResetRedirectUrl:
      parsed.PASSWORD_RESET_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`
  };

  return cachedServerEnv;
}