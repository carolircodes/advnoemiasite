import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, ".env.local"));
loadEnvFile(path.join(cwd, ".env"));

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PORTAL_ADMIN_EMAIL",
  "PORTAL_ADMIN_TEMP_PASSWORD"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Defina a variável ${key} antes de executar o bootstrap.`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const adminEmail = process.env.PORTAL_ADMIN_EMAIL.toLowerCase();
const adminFullName = process.env.PORTAL_ADMIN_FULL_NAME || "Noemia Paixao";
const adminPassword = process.env.PORTAL_ADMIN_TEMP_PASSWORD;

const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200
});

if (listError) {
  throw new Error(`Não foi possível listar usuários: ${listError.message}`);
}

let adminUser = listData.users.find((user) => user.email?.toLowerCase() === adminEmail);

if (!adminUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: "advogada",
      full_name: adminFullName
    }
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Não foi possível criar a usuária administradora.");
  }

  adminUser = data.user;
}

const { error: profileError } = await supabase.from("profiles").upsert(
  {
    id: adminUser.id,
    email: adminEmail,
    full_name: adminFullName,
    role: "advogada",
    is_active: true,
    first_login_completed_at: new Date().toISOString()
  },
  {
    onConflict: "id"
  }
);

if (profileError) {
  throw new Error(`Não foi possível salvar o perfil da advogada: ${profileError.message}`);
}

const { error: staffError } = await supabase.from("staff_members").upsert(
  {
    profile_id: adminUser.id,
    title: "Advogada responsável",
    receives_notification_emails: true
  },
  {
    onConflict: "profile_id"
  }
);

if (staffError) {
  throw new Error(`Não foi possível salvar o vínculo interno: ${staffError.message}`);
}

console.log("Bootstrap concluído.");
console.log(`Usuária interna preparada: ${adminEmail}`);
console.log("Acesse /auth/login ou /internal/advogada depois de iniciar a aplicação.");

