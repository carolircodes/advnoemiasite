import { z } from "zod";

const envSchema = z
  .object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  INVITE_REDIRECT_URL: z.string().url().optional(),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),
  NOTIFICATIONS_PROVIDER: z.enum(["smtp", "resend"]).optional(),
  NOTIFICATIONS_WORKER_SECRET: z.string().min(12).optional(),
  NOTIFICATIONS_SMTP_HOST: z.string().min(1).optional(),
  NOTIFICATIONS_SMTP_PORT: z.string().min(1).optional(),
  NOTIFICATIONS_SMTP_USER: z.string().min(1).optional(),
  NOTIFICATIONS_SMTP_PASS: z.string().min(1).optional(),
  NOTIFICATIONS_SMTP_SECURE: z.string().min(1).optional(),
  NOTIFICATIONS_REPLY_TO: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  PORTAL_ADMIN_EMAIL: z.string().email().optional(),
  PORTAL_ADMIN_FULL_NAME: z.string().min(3).optional(),
  PORTAL_ADMIN_TEMP_PASSWORD: z.string().min(8).optional()
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
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam ter o mesmo valor quando ambas existirem.",
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
          "SUPABASE_SECRET_KEY e SUPABASE_SERVICE_ROLE_KEY precisam ter o mesmo valor quando ambas existirem.",
        path: ["SUPABASE_SECRET_KEY"]
      });
    }

    if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para a chave publica local do Supabase.",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
      });
    }

    if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Defina SUPABASE_SECRET_KEY para a chave secreta local do Supabase.",
        path: ["SUPABASE_SECRET_KEY"]
      });
    }
  });

type ServerEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  INVITE_REDIRECT_URL?: string;
  PASSWORD_RESET_REDIRECT_URL?: string;
  NOTIFICATIONS_PROVIDER?: "smtp" | "resend";
  NOTIFICATIONS_WORKER_SECRET?: string;
  NOTIFICATIONS_SMTP_HOST?: string;
  NOTIFICATIONS_SMTP_PORT?: string;
  NOTIFICATIONS_SMTP_USER?: string;
  NOTIFICATIONS_SMTP_PASS?: string;
  NOTIFICATIONS_SMTP_SECURE?: string;
  NOTIFICATIONS_REPLY_TO?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  PORTAL_ADMIN_EMAIL?: string;
  PORTAL_ADMIN_FULL_NAME?: string;
  PORTAL_ADMIN_TEMP_PASSWORD?: string;
  inviteRedirectUrl: string;
  passwordResetRedirectUrl: string;
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

type PublicEnv = Pick<
  ServerEnv,
  "NEXT_PUBLIC_APP_URL" | "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
>;

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;
let cachedNotificationEnv: NotificationEnv | null = null;

function parseOptionalInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
}

function parseOptionalBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1";
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = envSchema.parse(process.env);
  const publishableKey =
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = parsed.SUPABASE_SECRET_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error("As chaves do Supabase nao foram configuradas corretamente.");
  }

  cachedServerEnv = {
    NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_SECRET_KEY: secretKey,
    INVITE_REDIRECT_URL: parsed.INVITE_REDIRECT_URL,
    PASSWORD_RESET_REDIRECT_URL: parsed.PASSWORD_RESET_REDIRECT_URL,
    NOTIFICATIONS_PROVIDER: parsed.NOTIFICATIONS_PROVIDER,
    NOTIFICATIONS_WORKER_SECRET: parsed.NOTIFICATIONS_WORKER_SECRET,
    NOTIFICATIONS_SMTP_HOST: parsed.NOTIFICATIONS_SMTP_HOST,
    NOTIFICATIONS_SMTP_PORT: parsed.NOTIFICATIONS_SMTP_PORT,
    NOTIFICATIONS_SMTP_USER: parsed.NOTIFICATIONS_SMTP_USER,
    NOTIFICATIONS_SMTP_PASS: parsed.NOTIFICATIONS_SMTP_PASS,
    NOTIFICATIONS_SMTP_SECURE: parsed.NOTIFICATIONS_SMTP_SECURE,
    NOTIFICATIONS_REPLY_TO: parsed.NOTIFICATIONS_REPLY_TO,
    RESEND_API_KEY: parsed.RESEND_API_KEY,
    EMAIL_FROM: parsed.EMAIL_FROM,
    PORTAL_ADMIN_EMAIL: parsed.PORTAL_ADMIN_EMAIL,
    PORTAL_ADMIN_FULL_NAME: parsed.PORTAL_ADMIN_FULL_NAME,
    PORTAL_ADMIN_TEMP_PASSWORD: parsed.PORTAL_ADMIN_TEMP_PASSWORD,
    inviteRedirectUrl:
      parsed.INVITE_REDIRECT_URL || `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`,
    passwordResetRedirectUrl:
      parsed.PASSWORD_RESET_REDIRECT_URL || `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`
  };

  return cachedServerEnv;
}

export function getPublicEnv() {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const env = getServerEnv();
  cachedPublicEnv = {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  };

  return cachedPublicEnv;
}

export function getNotificationEnv(): NotificationEnv {
  if (cachedNotificationEnv) {
    return cachedNotificationEnv;
  }

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

  return cachedNotificationEnv;
}
