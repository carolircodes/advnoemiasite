import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, PreApprovalPlan } from "mercadopago";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_BASE_URL?.trim();

if (!url || !key || !accessToken || !appUrl) {
  console.error(
    "[phase12.3-bootstrap] Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, MERCADO_PAGO_ACCESS_TOKEN or NEXT_PUBLIC_APP_URL."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const { data: plan, error: planError } = await supabase
    .from("ecosystem_plan_tiers")
    .select("id,code,name,cadence,price_amount,currency_code,billing_plan_reference,billing_status,billing_metadata")
    .eq("code", "circulo_essencial")
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message || "Plano ancora nao encontrado.");
  }

  let providerPlanId = plan.billing_plan_reference;
  let reused = Boolean(plan.billing_plan_reference);
  let providerStatus = plan.billing_status || "live_ready";

  if (!providerPlanId) {
    const mercadopago = new MercadoPagoConfig({ accessToken });
    const providerPlan = new PreApprovalPlan(mercadopago);
    const response = await providerPlan.create({
      body: {
        reason: "Circulo Essencial | assinatura premium do ecossistema",
        status: "active",
        back_url: `${appUrl.replace(/\/$/, "")}/cliente/ecossistema/beneficios`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(Number(plan.price_amount || 0).toFixed(2)),
          currency_id: plan.currency_code || "BRL"
        }
      }
    });

    if (!response.id) {
      throw new Error("Mercado Pago nao retornou o id do plano recorrente.");
    }

    providerPlanId = response.id;
    providerStatus = response.status || "active";
    reused = false;
  }

  const { error: updateError } = await supabase
    .from("ecosystem_plan_tiers")
    .update({
      billing_provider: "mercado_pago_preapproval",
      billing_plan_reference: providerPlanId,
      billing_status: "live_ready",
      billing_activated_at: new Date().toISOString(),
      billing_metadata: {
        ...(plan.billing_metadata || {}),
        phase: "12.3",
        provider_plan_ready: true,
        bootstrap_script: true
      }
    })
    .eq("id", plan.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase.from("ecosystem_billing_events").insert({
    plan_tier_id: plan.id,
    provider: "mercado_pago_preapproval",
    provider_event_type: reused ? "plan_reused" : "plan_bootstrapped",
    billing_status: "live_ready",
    provider_reference: providerPlanId,
    amount: Number(Number(plan.price_amount || 0).toFixed(2)),
    currency_code: plan.currency_code || "BRL",
    payload: {
      phase: "12.3",
      anchor_plan: true,
      reused
    }
  });

  await supabase.from("product_events").insert({
    event_key: "recurring_revenue_signal",
    event_group: "ecosystem",
    page_path: "/internal/advogada/ecossistema",
    payload: {
      phase: "12.3",
      signal: "billing_plan_live_ready",
      plan_code: "circulo_essencial",
      provider: "mercado_pago_preapproval",
      reused
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        reused,
        providerPlanId,
        providerStatus
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.3-bootstrap] Failed:", error.message);
  process.exit(1);
});
