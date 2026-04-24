import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import officialSchema from "../lib/schema/official-schema.json" with { type: "json" };

const root = process.cwd();
const officialDir = path.join(root, "supabase", "migrations");
const forbiddenFiles = [
  path.join(root, "SCHEMA_COMPLETO_SUPABASE.sql"),
  path.join(root, "SCHEMA_SUPABASE_CORRIGIDO.sql")
];
const forbiddenDirs = [
  path.join(root, "migrations"),
  path.join(root, "database", "migrations")
];
const envPath = path.join(root, ".env.local");

function fail(message) {
  console.error(`[schema-governance] ${message}`);
  process.exitCode = 1;
}

function parseSupabaseTarget(url) {
  if (!url) {
    return {
      target: "unconfigured"
    };
  }

  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    return {
      target: "local"
    };
  }

  return {
    target: "remote"
  };
}

function classifySchemaProbeError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = String(error?.message || "").toLowerCase();

  return {
    missingRelation:
      code === "PGRST205" ||
      ((message.includes("relation") && message.includes("does not exist")) ||
        (message.includes("could not find the table") && message.includes("public."))),
    missingColumn:
      code === "42703" ||
      ((message.includes("column") && message.includes("does not exist")) ||
        message.includes("could not find the '"))
  };
}

async function checkRuntimeSchemaCompatibility() {
  dotenv.config({ path: envPath });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    console.log(
      "[schema-governance] runtime schema check skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing."
    );
    return;
  }

  const { target } = parseSupabaseTarget(url);
  console.log(`[schema-governance] runtime target: ${url} (${target})`);

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const missing = [];

  for (const [table, requiredColumns] of Object.entries(officialSchema.requiredTables)) {
    const missingColumns = [];

    for (const column of requiredColumns) {
      const { error } = await supabase.from(table).select(column).limit(1);

      if (!error) {
        continue;
      }

      const { missingRelation, missingColumn } = classifySchemaProbeError(error);

      if (missingRelation || missingColumn) {
        missingColumns.push(column);
        continue;
      }

      fail(`Runtime schema inspection failed on ${table}.${column}: ${error.message}`);
      return;
    }

    if (missingColumns.length > 0) {
      missing.push(`${table}(${missingColumns.join(",")})`);
    }
  }

  if (missing.length > 0) {
    fail(
      `Runtime schema drift detected on ${url}. Expected ${officialSchema.schemaVersion}, missing: ${missing.join("; ")}`
    );
    return;
  }

  console.log(
    `[schema-governance] runtime schema OK for ${officialSchema.schemaVersion}`
  );
}

if (!fs.existsSync(officialDir)) {
  fail("Missing official migration directory: supabase/migrations");
} else {
  const files = fs
    .readdirSync(officialDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    fail("Official migration directory is empty.");
  } else {
    console.log(`[schema-governance] official migrations: ${files.length}`);
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(file)) {
    fail(`Manual schema file still present in active tree: ${path.relative(root, file)}`);
  }
}

for (const dir of forbiddenDirs) {
  if (fs.existsSync(dir)) {
    fail(`Legacy migration directory still present in active tree: ${path.relative(root, dir)}`);
  }
}

await checkRuntimeSchemaCompatibility();

if (process.exitCode !== 1) {
  console.log("[schema-governance] OK");
}
