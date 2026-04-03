import path from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");

const silentEnvLog = {
  info: () => {},
  error: (...args) => {
    console.error(...args);
  }
};

const { loadedEnvFiles } = loadEnvConfig(projectDir, false, silentEnvLog, true);

function formatLoadedEnvFiles() {
  if (!loadedEnvFiles.length) {
    return "nenhum arquivo .env encontrado";
  }

  return loadedEnvFiles
    .map((file) => path.basename(file.path))
    .filter(Boolean)
    .join(", ");
}

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function resolveEnvValue(preferredName, legacyName, label) {
  const preferredValue = readEnv(preferredName);
  const legacyValue = legacyName ? readEnv(legacyName) : undefined;

  if (preferredValue && legacyValue && preferredValue !== legacyValue) {
    throw new Error(
      `${preferredName} e ${legacyName} estao diferentes. Padronize o ambiente antes de executar o bootstrap.`
    );
  }

  const resolvedValue = preferredValue || legacyValue;

  if (!resolvedValue) {
    throw new Error(`Defina ${preferredName} em .env.local para ${label}.`);
  }

  return resolvedValue;
}

function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const env = {
  supabaseUrl: resolveEnvValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    null,
    "a URL local do Supabase"
  ),
  publishableKey: resolveEnvValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "a chave publica local do Supabase"
  ),
  secretKey: resolveEnvValue(
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "a chave secreta local do Supabase"
  ),
  adminEmail: resolveEnvValue(
    "PORTAL_ADMIN_EMAIL",
    null,
    "o email da advogada bootstrap"
  ).toLowerCase(),
  adminFullName:
    readEnv("PORTAL_ADMIN_FULL_NAME") || "Noemia Paixao",
  adminPassword: resolveEnvValue(
    "PORTAL_ADMIN_TEMP_PASSWORD",
    null,
    "a senha inicial da advogada bootstrap"
  )
};

const adminSupabase = createSupabaseClient(env.supabaseUrl, env.secretKey);
const publicSupabase = createSupabaseClient(env.supabaseUrl, env.publishableKey);

console.log(`[bootstrap] Arquivos de ambiente carregados: ${formatLoadedEnvFiles()}`);
console.log(`[bootstrap] Provisionando a usuaria interna ${env.adminEmail}.`);

const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000
});

if (listError) {
  throw new Error(`Nao foi possivel listar usuarios no Auth: ${listError.message}`);
}

let adminUser = listData.users.find((user) => user.email?.toLowerCase() === env.adminEmail);

if (!adminUser) {
  console.log("[bootstrap] Usuaria nao encontrada no Auth. Criando conta local.");

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: env.adminEmail,
    password: env.adminPassword,
    email_confirm: true,
    user_metadata: {
      role: "advogada",
      full_name: env.adminFullName
    }
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Nao foi possivel criar a usuaria interna.");
  }

  adminUser = data.user;
} else {
  console.log("[bootstrap] Usuaria ja existe no Auth. Alinhando senha e metadata.");

  const { data, error } = await adminSupabase.auth.admin.updateUserById(adminUser.id, {
    email: env.adminEmail,
    password: env.adminPassword,
    email_confirm: true,
    user_metadata: {
      ...(adminUser.user_metadata || {}),
      role: "advogada",
      full_name: env.adminFullName
    }
  });

  if (error || !data.user) {
    throw new Error(
      error?.message || "Nao foi possivel atualizar a usuaria interna existente."
    );
  }

  adminUser = data.user;
}

const preparedAt = new Date().toISOString();

const { data: profileData, error: profileError } = await adminSupabase
  .from("profiles")
  .upsert(
    {
      id: adminUser.id,
      email: env.adminEmail,
      full_name: env.adminFullName,
      role: "advogada",
      is_active: true,
      first_login_completed_at: preparedAt
    },
    {
      onConflict: "id"
    }
  )
  .select("id,email,role,is_active,first_login_completed_at")
  .single();

if (profileError || !profileData) {
  throw new Error(
    profileError?.message || "Nao foi possivel salvar o perfil interno da advogada."
  );
}

const { data: staffData, error: staffError } = await adminSupabase
  .from("staff_members")
  .upsert(
    {
      profile_id: adminUser.id,
      title: "Advogada responsavel",
      receives_notification_emails: true
    },
    {
      onConflict: "profile_id"
    }
  )
  .select("profile_id,title,receives_notification_emails")
  .single();

if (staffError || !staffData) {
  throw new Error(
    staffError?.message || "Nao foi possivel salvar o vinculo interno da advogada."
  );
}

const { data: signInData, error: signInError } = await publicSupabase.auth.signInWithPassword({
  email: env.adminEmail,
  password: env.adminPassword
});

if (signInError || !signInData.user || !signInData.session) {
  throw new Error(
    signInError?.message ||
      "A usuaria foi provisionada, mas o login publico falhou. Revise a chave publica local."
  );
}

await publicSupabase.auth.signOut();

console.log("[bootstrap] Auth validado com sucesso.");
console.log(
  `[bootstrap] Perfil sincronizado: role=${profileData.role}, active=${profileData.is_active}.`
);
console.log(
  `[bootstrap] Staff sincronizado: title=${staffData.title}, notifications=${staffData.receives_notification_emails}.`
);
console.log(`[bootstrap] Login confirmado para ${env.adminEmail}.`);
console.log("[bootstrap] Bootstrap concluido sem necessidade de ajuste manual no Studio.");
