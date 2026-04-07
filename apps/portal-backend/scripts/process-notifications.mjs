import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";

const projectRoot = path.resolve(import.meta.dirname, "..");
const envPath = path.join(projectRoot, ".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config({ override: true });
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const workerSecret = process.env.NOTIFICATIONS_WORKER_SECRET;
const requestedLimit = Number.parseInt(process.argv[2] || "10", 10);

if (!appUrl) {
  console.error("[notifications.process] Defina NEXT_PUBLIC_APP_URL no .env.local.");
  process.exit(1);
}

if (!workerSecret) {
  console.error(
    "[notifications.process] Defina NOTIFICATIONS_WORKER_SECRET no .env.local."
  );
  process.exit(1);
}

const route = new URL("/api/worker/notifications/process", appUrl).toString();

try {
  const response = await fetch(route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": workerSecret
    },
    body: JSON.stringify({
      limit: Number.isNaN(requestedLimit) ? 10 : requestedLimit
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("[notifications.process] Falha ao processar notificacoes.", data);
    process.exit(1);
  }

  console.log("[notifications.process] Resultado do processamento:");
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(
    "[notifications.process] Nao foi possivel chamar o worker local.",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
