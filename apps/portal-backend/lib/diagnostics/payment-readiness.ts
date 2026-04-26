import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";
import { shouldEnforceWebhookSignature } from "../http/webhook-security.ts";

type PaymentSiteUrlSource =
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_BASE_URL"
  | "NEXT_PUBLIC_APP_URL"
  | null;

export type PaymentRuntimeDiagnostics = {
  mercadoPagoAccessTokenConfigured: boolean;
  mercadoPagoPublicKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseSecretConfigured: boolean;
  siteUrlConfigured: boolean;
  siteUrlSource: PaymentSiteUrlSource;
  signatureEnforced: boolean;
};

export function getPaymentRuntimeDiagnostics(): PaymentRuntimeDiagnostics {
  const siteUrlSource = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    ? "NEXT_PUBLIC_SITE_URL"
    : process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.trim()
      ? "NEXT_PUBLIC_PUBLIC_SITE_URL"
      : process.env.NEXT_PUBLIC_BASE_URL?.trim()
        ? "NEXT_PUBLIC_BASE_URL"
        : process.env.NEXT_PUBLIC_APP_URL?.trim()
          ? "NEXT_PUBLIC_APP_URL"
          : null;
  const webhookSecretConfigured = Boolean(
    process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()
  );

  return {
    mercadoPagoAccessTokenConfigured: Boolean(
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()
    ),
    mercadoPagoPublicKeyConfigured: Boolean(
      process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim()
    ),
    webhookSecretConfigured,
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseSecretConfigured: Boolean(
      process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ),
    siteUrlConfigured: Boolean(siteUrlSource),
    siteUrlSource,
    signatureEnforced: shouldEnforceWebhookSignature(
      "MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"
    )
  };
}

export function buildPaymentReadinessSection(): DiagnosticSection {
  const diagnostics = getPaymentRuntimeDiagnostics();
  const coreReady =
    diagnostics.mercadoPagoAccessTokenConfigured &&
    diagnostics.webhookSecretConfigured &&
    diagnostics.supabaseUrlConfigured &&
    diagnostics.supabaseSecretConfigured;
  const checkoutReady =
    diagnostics.mercadoPagoPublicKeyConfigured && diagnostics.siteUrlConfigured;

  if (coreReady && checkoutReady && diagnostics.signatureEnforced) {
    return buildDiagnosticSection({
      status: "healthy",
      code: "payments_fully_ready",
      summary: "Pagamento pronto para create, retorno publico e webhook protegido.",
      operatorAction:
        "Usar o readiness protegido como confirmacao final e validar um fluxo de pagamento apos deploy.",
      verification: [
        "Confirmar access token, public key e webhook secret configurados.",
        "Confirmar assinatura do webhook em modo enforced.",
        "Confirmar que o host de retorno aponta para o dominio esperado."
      ],
      details: diagnostics
    });
  }

  if (!coreReady) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "payments_core_missing_configuration",
      summary: "Pagamento sem configuracao essencial para create ou reconciliacao webhook.",
      operatorAction:
        "Preencher as credenciais de pagamento e chaves administrativas antes de expor o fluxo.",
      verification: [
        "Configurar MERCADO_PAGO_ACCESS_TOKEN.",
        "Configurar MERCADO_PAGO_WEBHOOK_SECRET.",
        "Confirmar SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL."
      ],
      details: diagnostics
    });
  }

  return buildDiagnosticSection({
    status: "degraded",
    code: diagnostics.signatureEnforced
      ? "payments_checkout_partial"
      : "payments_signature_not_enforced",
    summary: diagnostics.signatureEnforced
      ? "Pagamento operacional, mas checkout publico ou retorno ainda estao incompletos."
      : "Pagamento operacional, mas a assinatura do webhook ainda nao esta em modo enforced.",
    operatorAction:
      "Completar as variaveis publicas do checkout e garantir enforcement de assinatura antes da promocao final.",
    verification: [
      "Confirmar NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.",
      "Confirmar URL publica usada pelas paginas de retorno.",
      "Confirmar MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE no ambiente alvo."
    ],
    details: diagnostics
  });
}
