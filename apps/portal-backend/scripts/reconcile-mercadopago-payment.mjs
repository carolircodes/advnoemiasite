import { createClient } from "@supabase/supabase-js";

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value || "";
}

const mercadoPagoAccessToken = readEnv("MERCADO_PAGO_ACCESS_TOKEN");
const supabaseUrl =
  readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("SUPABASE_URL");
const supabaseSecretKey =
  readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SUPABASE_SECRET_KEY");

if (!mercadoPagoAccessToken || !supabaseUrl || !supabaseSecretKey) {
  console.error(
    "Missing required environment configuration for reconciliation. Define MERCADO_PAGO_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY."
  );
  process.exit(1);
}

const paymentId = process.argv[2];

if (!paymentId) {
  console.error("Usage: node scripts/reconcile-mercadopago-payment.mjs <mercado-pago-payment-id>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function parseExternalReference(externalReference) {
  if (typeof externalReference !== "string") {
    return null;
  }

  const match = externalReference.match(/^(.*)_([0-9a-fA-F-]{36})_(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    offerCode: match[1],
    leadId: match[2]
  };
}

function mergeMercadoPagoMetadata(currentMetadata, paymentInfo) {
  return {
    ...(currentMetadata || {}),
    mercado_pago_payment_id: paymentInfo.id,
    mercado_pago_status: paymentInfo.status,
    mercado_pago_status_detail: paymentInfo.status_detail
  };
}

async function recordRevenueEvent(eventKey, payload) {
  const existingEvents = await supabase
    .from("product_events")
    .select("id,event_key,payload")
    .eq("event_group", "revenue")
    .eq("event_key", eventKey)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (existingEvents.error) {
    return existingEvents;
  }

  const duplicate = (existingEvents.data || []).find((event) => {
    const eventPayload = event.payload || {};

    return (
      String(eventPayload.lead_id || "") === String(payload.lead_id) &&
      String(eventPayload.payment_id || "") === String(payload.payment_id)
    );
  });

  if (duplicate?.id) {
    return { data: duplicate, error: null, skipped: true };
  }

  return supabase.from("product_events").insert({
    event_key: eventKey,
    event_group: "revenue",
    page_path: "/pagamento/sucesso",
    payload,
    occurred_at: new Date().toISOString()
  });
}

async function main() {
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken}`
    }
  });

  if (!paymentResponse.ok) {
    const errorText = await paymentResponse.text();
    throw new Error(`Mercado Pago payment lookup failed: ${paymentResponse.status} ${errorText}`);
  }

  const paymentInfo = await paymentResponse.json();
  const reference = parseExternalReference(paymentInfo.external_reference);

  if (!reference) {
    throw new Error(`Invalid external reference: ${paymentInfo.external_reference}`);
  }

  const { leadId, offerCode } = reference;

  const paymentsLookup = await supabase
    .from("payments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (paymentsLookup.error) {
    throw new Error(`Internal payment lookup failed: ${paymentsLookup.error.message}`);
  }

  const previousPayment =
    (paymentsLookup.data || []).find(
      (payment) => payment?.metadata?.external_reference === paymentInfo.external_reference
    ) ||
    (paymentsLookup.data || [])[0] ||
    null;

  if (!previousPayment?.id) {
    throw new Error(`No internal payment found for lead ${leadId}`);
  }

  const paymentUpdate = await supabase
    .from("payments")
    .update({
      external_id: String(paymentInfo.id),
      status: paymentInfo.status,
      payment_method_id: paymentInfo.payment_method_id,
      payment_type_id: paymentInfo.payment_type_id,
      status_detail: paymentInfo.status_detail,
      transaction_amount: paymentInfo.transaction_amount,
      approved_at:
        paymentInfo.status === "approved"
          ? new Date().toISOString()
          : previousPayment.approved_at || null,
      metadata: mergeMercadoPagoMetadata(previousPayment.metadata, paymentInfo)
    })
    .eq("id", previousPayment.id)
    .select()
    .single();

  if (paymentUpdate.error) {
    throw new Error(`Internal payment update failed: ${paymentUpdate.error.message}`);
  }

  const leadUpdatePayload =
    paymentInfo.status === "approved"
      ? {
          status: "paid",
          payment_status: "confirmed",
          payment_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      : {
          updated_at: new Date().toISOString()
        };

  const leadUpdate = await supabase
    .from("noemia_leads")
    .update(leadUpdatePayload)
    .eq("id", leadId)
    .select()
    .single();

  if (leadUpdate.error) {
    throw new Error(`Lead update failed: ${leadUpdate.error.message}`);
  }

  const existingConfirmationMessage = await supabase
    .from("noemia_lead_conversations")
    .select("id")
    .eq("lead_id", leadId)
    .eq("message_type", "payment_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const confirmationMessageInsert = existingConfirmationMessage.data?.id
    ? { data: existingConfirmationMessage.data, error: null, skipped: true }
    : await supabase.from("noemia_lead_conversations").insert({
        lead_id: leadId,
        message: `Recebemos a confirmacao do seu pagamento.\n\nAgora vamos dar andamento ao seu atendimento com prioridade.\n\nEm instantes voce recebera as proximas orientacoes.`,
        sender: "noemia",
        message_type: "payment_confirmation",
        metadata: {
          payment_confirmed: true,
          reconciled_via_script: true,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

  const existingFollowUp = await supabase
    .from("follow_up_events")
    .select("id")
    .eq("lead_id", leadId)
    .eq("event_type", "payment_confirmed")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const followUpInsert =
    existingFollowUp.data?.id || existingFollowUp.error
      ? {
          data: existingFollowUp.data || null,
          error: existingFollowUp.error || null,
          skipped: Boolean(existingFollowUp.data?.id)
        }
      : await supabase.from("follow_up_events").insert({
          lead_id: leadId,
          event_type: "payment_confirmed",
          trigger: "automatic",
          message: "Pagamento confirmado automaticamente via reconciliacao operacional",
          metadata: {
            payment_id: previousPayment.id,
            mercado_pago_payment_id: paymentInfo.id,
            amount: paymentInfo.transaction_amount,
            payment_method: paymentInfo.payment_method_id,
            reconciled_via_script: true
          },
          sent_at: new Date().toISOString()
        });

  const eventPayloadBase = {
    lead_id: leadId,
    payment_id: previousPayment.id,
    external_id: paymentInfo.id,
    amount: paymentInfo.transaction_amount,
    offer_code:
      previousPayment?.metadata?.offer_code || paymentInfo.metadata?.offer_code || offerCode,
    offer_kind:
      previousPayment?.metadata?.offer_kind || paymentInfo.metadata?.offer_kind || "consultation",
    monetization_path:
      previousPayment?.metadata?.monetization_path ||
      paymentInfo.metadata?.monetization_path ||
      "noemia_consultation_flow",
    monetization_source:
      previousPayment?.metadata?.monetization_source ||
      paymentInfo.metadata?.monetization_source ||
      "noemia",
    payment_method: paymentInfo.payment_method_id,
    reconciled_via_script: true
  };

  const revenueResults = await Promise.all([
    recordRevenueEvent("payment_approved", eventPayloadBase),
    recordRevenueEvent("paid_consultation", {
      lead_id: leadId,
      payment_id: previousPayment.id,
      amount: paymentInfo.transaction_amount,
      offer_code: eventPayloadBase.offer_code,
      offer_kind: eventPayloadBase.offer_kind,
      reconciled_via_script: true
    }),
    recordRevenueEvent("revenue_confirmed", {
      lead_id: leadId,
      payment_id: previousPayment.id,
      amount: paymentInfo.transaction_amount,
      offer_code: eventPayloadBase.offer_code,
      offer_kind: eventPayloadBase.offer_kind,
      monetization_path: eventPayloadBase.monetization_path,
      reconciled_via_script: true
    })
  ]);

  console.log(
    JSON.stringify(
      {
        mercadoPagoPaymentId: paymentInfo.id,
        mercadoPagoStatus: paymentInfo.status,
        externalReference: paymentInfo.external_reference,
        previousPaymentId: previousPayment.id,
        leadId,
        paymentUpdateError: paymentUpdate.error?.message || null,
        leadUpdateError: leadUpdate.error?.message || null,
        confirmationMessageError: confirmationMessageInsert.error?.message || null,
        followUpInsertError: followUpInsert.error?.message || null,
        revenueEventErrors: revenueResults.map((result) => result.error?.message || null)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
