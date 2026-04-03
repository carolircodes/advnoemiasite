import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INVITE_REDIRECT_URL: z.string().url().optional(),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  PORTAL_ADMIN_EMAIL: z.string().email().optional(),
  PORTAL_ADMIN_FULL_NAME: z.string().min(3).optional(),
  PORTAL_ADMIN_TEMP_PASSWORD: z.string().min(8).optional()
});

const publicEnvSchema = envSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true
});

type ServerEnv = z.infer<typeof envSchema> & {
  inviteRedirectUrl: string;
  passwordResetRedirectUrl: string;
};

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = envSchema.parse(process.env);
  cachedServerEnv = {
    ...parsed,
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

  cachedPublicEnv = publicEnvSchema.parse(process.env);
  return cachedPublicEnv;
}
