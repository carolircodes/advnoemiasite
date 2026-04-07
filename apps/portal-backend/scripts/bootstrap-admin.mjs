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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isSchemaCacheError(message) {
  return (
    typeof message === "string" &&
    (message.includes("schema cache") || message.includes("Could not find the table"))
  );
}

function formatSupabaseError(error) {
  if (!error) {
    return "";
  }

  const message =
    typeof error.message === "string" ? error.message.trim() : "";

  if (message && message !== "{}") {
    return message;
  }

  const serialized = JSON.stringify(error);
  return message === "{}" || serialized === "{}" ? "servico ainda indisponivel" : serialized;
}

function isTransientBootstrapError(message) {
  return (
    !message ||
    message === "servico ainda indisponivel" ||
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes("fetch failed") ||
    message.includes("Failed to fetch") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Service Unavailable") ||
    message.includes("502")
  );
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

async function waitForTableInSchemaCache(tableName, attempts = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { error } = await adminSupabase.from(tableName).select("*").limit(1);

    if (!error) {
      return;
    }

    if (!isSchemaCacheError(error.message)) {
      throw new Error(
        `Nao foi possivel validar a tabela public.${tableName}: ${error.message}`
      );
    }

    if (attempt === attempts) {
      throw new Error(
        `PostgREST nao recarregou a tabela public.${tableName} depois do reset.`
      );
    }

    console.log(
      `[bootstrap] Aguardando schema cache do Supabase para public.${tableName} (${attempt}/${attempts}).`
    );
    await sleep(delayMs);
  }
}

async function waitForAuthGatewayReady(attempts = 30, delayMs = 3000) {
  const settingsUrl = `${env.supabaseUrl}/auth/v1/settings`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(settingsUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // O gateway ainda pode estar reiniciando.
    }

    if (attempt === attempts) {
      throw new Error("O gateway local de Auth do Supabase nao ficou disponivel a tempo.");
    }

    console.log(`[bootstrap] Aguardando gateway de Auth do Supabase (${attempt}/${attempts}).`);
    await sleep(delayMs);
  }
}

async function listAuthUsersWithRetry(attempts = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (Array.isArray(data?.users)) {
      if (error) {
        console.log(
          `[bootstrap] Auth respondeu com usuarios apesar de um erro transitorio (${formatSupabaseError(error)}).`
        );
      }

      return data;
    }

    const message = formatSupabaseError(error);

    if (attempt === attempts || !isTransientBootstrapError(message)) {
      throw new Error(`Nao foi possivel listar usuarios no Auth: ${message}`);
    }

    console.log(
      `[bootstrap] Aguardando API de Auth do Supabase (${attempt}/${attempts}).`
    );
    await sleep(delayMs);
  }
}

async function findAuthUserByEmail(email) {
  const listData = await listAuthUsersWithRetry();
  return listData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

async function createAuthUserWithRetry(payload, attempts = 12, delayMs = 2500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await adminSupabase.auth.admin.createUser(payload);

    if (data?.user) {
      if (error) {
        console.log(
          `[bootstrap] createUser retornou um erro transitorio apos criar a conta: ${formatSupabaseError(error)}.`
        );
      }

      return data.user;
    }

    const existingUser = await findAuthUserByEmail(payload.email);

    if (existingUser) {
      console.log(
        "[bootstrap] A conta apareceu no Auth apos uma resposta ambigua do createUser. Seguindo com o usuario encontrado."
      );
      return existingUser;
    }

    const message = formatSupabaseError(error);

    if (attempt === attempts || !isTransientBootstrapError(message)) {
      throw new Error(`Nao foi possivel criar a usuaria interna: ${message}`);
    }

    console.log(`[bootstrap] Aguardando criacao da usuaria no Auth (${attempt}/${attempts}).`);
    await sleep(delayMs);
  }
}

async function updateAuthUserWithRetry(userId, payload, attempts = 12, delayMs = 2500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, payload);

    if (data?.user) {
      if (error) {
        console.log(
          `[bootstrap] updateUserById retornou um erro transitorio apos atualizar a conta: ${formatSupabaseError(error)}.`
        );
      }

      return data.user;
    }

    const refreshedUser = await findAuthUserByEmail(payload.email || env.adminEmail);

    if (refreshedUser?.id === userId) {
      console.log(
        "[bootstrap] A conta apareceu atualizada no Auth apos uma resposta ambigua do updateUserById."
      );
      return refreshedUser;
    }

    const message = formatSupabaseError(error);

    if (attempt === attempts || !isTransientBootstrapError(message)) {
      throw new Error(`Nao foi possivel atualizar a usuaria interna existente: ${message}`);
    }

    console.log(
      `[bootstrap] Aguardando atualizacao da usuaria no Auth (${attempt}/${attempts}).`
    );
    await sleep(delayMs);
  }
}

async function signInWithPasswordWithRetry(email, password, attempts = 12, delayMs = 2500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await publicSupabase.auth.signInWithPassword({ email, password });

    if (result.data?.user && result.data?.session) {
      if (result.error) {
        console.log(
          `[bootstrap] signInWithPassword retornou um erro transitorio apos autenticar: ${formatSupabaseError(result.error)}.`
        );
      }

      return result;
    }

    const message = formatSupabaseError(result.error);

    if (attempt === attempts || !isTransientBootstrapError(message)) {
      throw new Error(
        message ||
          "A usuaria foi provisionada, mas o login publico falhou. Revise a chave publica local."
      );
    }

    console.log(`[bootstrap] Aguardando login publico do Supabase (${attempt}/${attempts}).`);
    await sleep(delayMs);
  }
}

console.log(`[bootstrap] Arquivos de ambiente carregados: ${formatLoadedEnvFiles()}`);
console.log(`[bootstrap] Provisionando a usuaria interna ${env.adminEmail}.`);

await waitForAuthGatewayReady();

const listData = await listAuthUsersWithRetry();

let adminUser = listData.users.find((user) => user.email?.toLowerCase() === env.adminEmail);

if (!adminUser) {
  console.log("[bootstrap] Usuaria nao encontrada no Auth. Criando conta local.");
  adminUser = await createAuthUserWithRetry({
    email: env.adminEmail,
    password: env.adminPassword,
    email_confirm: true,
    user_metadata: {
      role: "advogada",
      full_name: env.adminFullName
    }
  });
} else {
  console.log("[bootstrap] Usuaria ja existe no Auth. Alinhando senha e metadata.");
  adminUser = await updateAuthUserWithRetry(adminUser.id, {
    email: env.adminEmail,
    password: env.adminPassword,
    email_confirm: true,
    user_metadata: {
      ...(adminUser.user_metadata || {}),
      role: "advogada",
      full_name: env.adminFullName
    }
  });
}

const preparedAt = new Date().toISOString();

await waitForTableInSchemaCache("profiles");
await waitForTableInSchemaCache("staff_members");

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

const { data: signInData } = await signInWithPasswordWithRetry(
  env.adminEmail,
  env.adminPassword
);

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
