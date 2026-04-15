import { z } from "zod";

const PUBLIC_AUTH_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

const ADMIN_AUTH_ENV_KEYS = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

type AuthEnvKey = (typeof PUBLIC_AUTH_ENV_KEYS)[number] | (typeof ADMIN_AUTH_ENV_KEYS)[number];
const PUBLIC_AUTH_ENV_KEY_SET = new Set<string>(PUBLIC_AUTH_ENV_KEYS);
const ADMIN_AUTH_ENV_KEY_SET = new Set<string>(ADMIN_AUTH_ENV_KEYS);

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const optionalString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url()),

    NEXT_PUBLIC_PUBLIC_SITE_URL: optionalUrl(),

    NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url()),

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(),

    SUPABASE_SECRET_KEY: optionalString(),
    SUPABASE_SERVICE_ROLE_KEY: optionalString(),

    INVITE_REDIRECT_URL: optionalUrl(),
    PASSWORD_RESET_REDIRECT_URL: optionalUrl(),

    NOTIFICATIONS_PROVIDER: z.preprocess(
      emptyToUndefined,
      z.enum(["smtp", "resend"]).optional()
    ),
    NOTIFICATIONS_WORKER_SECRET: optionalString(),

    NOTIFICATIONS_SMTP_HOST: optionalString(),
    NOTIFICATIONS_SMTP_PORT: optionalString(),
    NOTIFICATIONS_SMTP_USER: optionalString(),
    NOTIFICATIONS_SMTP_PASS: optionalString(),
    NOTIFICATIONS_SMTP_SECURE: optionalString(),

    NOTIFICATIONS_REPLY_TO: optionalString(),

    RESEND_API_KEY: optionalString(),
    EMAIL_FROM: optionalString(),

    CRON_SECRET: optionalString(),

    OPENAI_API_KEY: optionalString(),
    OPENAI_MODEL: optionalString(),
    TELEGRAM_BOT_TOKEN: optionalString(),
    TELEGRAM_CHANNEL_USERNAME: optionalString(),
    TELEGRAM_CHANNEL_URL: optionalUrl(),
    TELEGRAM_CURATED_GROUP_ID: optionalString(),
    TELEGRAM_CURATED_GROUP_TITLE: optionalString(),

    PORTAL_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
    PORTAL_ADMIN_FULL_NAME: optionalString(),
    PORTAL_ADMIN_TEMP_PASSWORD: optionalString()
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
  });

type ServerEnv = ReturnType<typeof buildServerEnv>;
type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};
type AdminEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
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

export type { ServerEnv, PublicEnv, AdminEnv, NotificationEnv };

export type AuthEnvDiagnostics = {
  appUrlConfigured: boolean;
  supabaseUrlConfigured: boolean;
  publicKeySource: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | null;
  adminKeySource: "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | null;
  missingForPublicAuth: AuthEnvKey[];
  missingForAdminAuth: AuthEnvKey[];
};

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;
let cachedAdminEnv: AdminEnv | null = null;
let cachedNotificationEnv: NotificationEnv | null = null;

function parseOptionalInteger(value?: string) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalBoolean(value?: string) {
  return value === "true" || value === "1";
}

function hasNonEmptyEnv(name: AuthEnvKey | "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_APP_URL") {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function getZodIssueKeys(error: z.ZodError) {
  return error.issues
    .flatMap((issue) => issue.path)
    .filter((pathPart): pathPart is AuthEnvKey | "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_APP_URL" =>
      typeof pathPart === "string"
    );
}

function resolvePublishableKey(parsed: z.infer<typeof envSchema>) {
  return (
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function resolveSecretKey(parsed: z.infer<typeof envSchema>) {
  return parsed.SUPABASE_SECRET_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY;
}

export function getAuthEnvDiagnostics(): AuthEnvDiagnostics {
  const publicKeySource = hasNonEmptyEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    : hasNonEmptyEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : null;

  const adminKeySource = hasNonEmptyEnv("SUPABASE_SECRET_KEY")
    ? "SUPABASE_SECRET_KEY"
    : hasNonEmptyEnv("SUPABASE_SERVICE_ROLE_KEY")
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : null;

  const missingForPublicAuth: AuthEnvKey[] = [];
  const missingForAdminAuth: AuthEnvKey[] = [];

  if (!publicKeySource) {
    missingForPublicAuth.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (!adminKeySource) {
    missingForAdminAuth.push("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    appUrlConfigured: hasNonEmptyEnv("NEXT_PUBLIC_APP_URL"),
    supabaseUrlConfigured: hasNonEmptyEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publicKeySource,
    adminKeySource,
    missingForPublicAuth,
    missingForAdminAuth
  };
}

export function isPublicAuthEnvConfigurationError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issueKeys = getZodIssueKeys(error);

    return issueKeys.some((key) => PUBLIC_AUTH_ENV_KEY_SET.has(key));
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Supabase publico nao configurado corretamente.") ||
    error.message.includes("NEXT_PUBLIC_APP_URL") ||
    error.message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    error.message.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    error.message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export function isAdminAuthEnvConfigurationError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issueKeys = getZodIssueKeys(error);

    return issueKeys.some((key) => ADMIN_AUTH_ENV_KEY_SET.has(key));
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("SUPABASE_SECRET_KEY") ||
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function isAuthEnvConfigurationError(error: unknown) {
  return (
    isPublicAuthEnvConfigurationError(error) || isAdminAuthEnvConfigurationError(error)
  );
}

function buildServerEnv() {
  const parsed = envSchema.parse(process.env);
  const publishableKey = resolvePublishableKey(parsed);

  if (!publishableKey) {
    throw new Error("Supabase publico nao configurado corretamente.");
  }

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_SECRET_KEY: resolveSecretKey(parsed),

    inviteRedirectUrl:
      parsed.INVITE_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`,

    passwordResetRedirectUrl:
      parsed.PASSWORD_RESET_REDIRECT_URL ||
      `${parsed.NEXT_PUBLIC_APP_URL}/auth/callback`
  };
}

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

export function getAdminEnv() {
  if (!cachedAdminEnv) {
    const parsed = envSchema.parse(process.env);
    const secretKey = resolveSecretKey(parsed);

    if (!secretKey) {
      throw new Error(
        "Defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY para operacoes administrativas do Supabase."
      );
    }

    cachedAdminEnv = {
      NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SECRET_KEY: secretKey
    };
  }

  return cachedAdminEnv;
}

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
