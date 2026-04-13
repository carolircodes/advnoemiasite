import fs from "fs";
import path from "path";

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

function fail(message) {
  console.error(`[schema-governance] ${message}`);
  process.exitCode = 1;
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

if (process.exitCode !== 1) {
  console.log("[schema-governance] OK");
}
