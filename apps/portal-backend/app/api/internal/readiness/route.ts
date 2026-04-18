import { NextResponse } from "next/server";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { getDurableProtectionStatus } from "@/lib/http/durable-abuse-protection";

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveHostKind(value: string | undefined) {
  if (!hasConfiguredValue(value)) {
    return "missing";
  }

  try {
    const host = new URL(value as string).host.toLowerCase();

    if (host === "portal.advnoemia.com.br") {
      return "portal";
    }

    if (host === "advnoemia.com.br" || host === "www.advnoemia.com.br") {
      return "marketing";
    }

    return "custom";
  } catch {
    return "invalid";
  }
}

export async function GET(request: Request) {
  const access = await requireRouteSecretOrStaffAccess({
    request,
    service: "internal_readiness",
    action: "read",
    expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "diagnostics_require_internal_access",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true
  });

  if (!access.ok) {
    return access.response;
  }

  const durableProtection = await getDurableProtectionStatus();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    undefined;

  return NextResponse.json({
    ok: true,
    actor: access.actor,
    readiness: {
      deployment: {
        appUrlConfigured: hasConfiguredValue(appUrl),
        appUrlHostKind: resolveHostKind(appUrl)
      },
      abuseProtection: durableProtection,
      payments: {
        accessTokenConfigured: hasConfiguredValue(process.env.MERCADO_PAGO_ACCESS_TOKEN),
        webhookSecretConfigured: hasConfiguredValue(process.env.MERCADO_PAGO_WEBHOOK_SECRET)
      },
      notifications: {
        cronSecretConfigured: hasConfiguredValue(process.env.CRON_SECRET),
        workerSecretConfigured: hasConfiguredValue(process.env.NOTIFICATIONS_WORKER_SECRET)
      },
      telegram: {
        botTokenConfigured: hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN),
        webhookSecretConfigured: hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET)
      }
    }
  });
}
