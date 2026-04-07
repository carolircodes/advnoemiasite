import { z } from "zod";

const envSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),

    NEXT_PUBLIC_PUBLIC_SITE_URL: z.string().url().optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    INVITE_REDIRECT_URL: z.string().url().optional(),
    PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),

    NOTIFICATIONS_PROVIDER: z.enum(["smtp", "resend"]).optional(),
    NOTIFICATIONS_WORKER_SECRET: z.string().min(1).optional(),

    NOTIFICATIONS_SMTP_HOST: z.string().min(1).optional(),
    NOTIFICATIONS_SMTP_PORT: z.string().min(1).optional(),
    NOTIFICATIONS_SMTP_USER: z.string().min(1).optional(),
    NOTIFICATIONS_SMTP_PASS: z.string().min(1).optional(),
    NOTIFICATIONS_SMTP_SECURE: z.string().min(1).optional(),

    NOTIFICATIONS_REPLY_TO: z.string().min(1).optional(),

    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),

    CRON_SECRET: z.string().min(1).optional(),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).optional(),

    PORTAL_ADMIN_EMAIL: z.string().email().optional(),
    PORTAL_ADMIN_FULL_NAME: z.string().min(1).optional(),
    PORTAL_ADMIN_TEMP_PASSWORD: z.string().min(1).optional()
  })
  .superRefine((env, ctx) => {
    if (
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam ter o mesmo valor.",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
      });
    }

    if (
      env.SUPABASE_SECRET_KEY &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      env.SUPABASE_SECRET_KEY !== env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SUPABASE_SECRET_KEY e SUPABASE_SERVICE_ROLE_KEY precisam ter o mesmo valor.",
        path: ["SUPABASE_SECRET_KEY"]
      });
    }

    if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
      });
    }

    if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.",
        path: ["SUPABASE_SECRET_KEY"]
      });
    }
  });

type ServerEnv = ReturnType<typeof buildServerEnv>;
type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};

type NotificationEnv = {
  provider: "smtp" | "resend";
  workerSecret?: string;
  emailFrom?: string;
  replyTo?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure: boolean;
};

// Exportar tipos para uso externo
export type { ServerEnv, PublicEnv, NotificationEnv };

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;
let cachedNotificationEnv: NotificationEnv | null = null;

function parseOptionalInteger(value?: string) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalBoolean(value?: string) {
  return value === "true" || value === "1";
}

function buildServerEnv() {
  const parsed = envSchema.parse(process.env);

  const publishableKey =
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const secretKey =
    parsed.SUPABASE_SECRET_KEY ||
    parsed.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error("Supabase não configurado corretamente.");
  }

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_SECRET_KEY: secretKey,

    inviteRedirectUrl:
      parsed.INVITE_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`,

    passwordResetRedirectUrl:
      parsed.PASSWORD_RESET_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`
  };
}

/**
 * 🔥 EXPORT PRINCIPAL (garante que Vercel reconheça)
 */
export function getServerEnv() {
  if (!cachedServerEnv) {
    cachedServerEnv = buildServerEnv();
  }
  return cachedServerEnv;
}

export function getPublicEnv() {
  if (!cachedPublicEnv) {
    const env = getServerEnv();
    cachedPublicEnv = {
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    };
  }
  return cachedPublicEnv;
}

/**
 * 🔥 ESSA É A FUNÇÃO QUE ESTAVA QUEBRANDO NO BUILD
 */
export function getNotificationEnv(): NotificationEnv {
  if (!cachedNotificationEnv) {
    const env = getServerEnv();

    cachedNotificationEnv = {
      provider: env.NOTIFICATIONS_PROVIDER || (env.RESEND_API_KEY ? "resend" : "smtp"),
      workerSecret: env.NOTIFICATIONS_WORKER_SECRET,
      emailFrom: env.EMAIL_FROM,
      replyTo: env.NOTIFICATIONS_REPLY_TO,
      resendApiKey: env.RESEND_API_KEY,
      smtpHost: env.NOTIFICATIONS_SMTP_HOST,
      smtpPort: parseOptionalInteger(env.NOTIFICATIONS_SMTP_PORT),
      smtpUser: env.NOTIFICATIONS_SMTP_USER,
      smtpPass: env.NOTIFICATIONS_SMTP_PASS,
      smtpSecure: parseOptionalBoolean(env.NOTIFICATIONS_SMTP_SECURE)
    };
  }

  return cachedNotificationEnv;
}