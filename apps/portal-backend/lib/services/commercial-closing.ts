export type ConsultationOfferState =
  | "not_offered"
  | "recommended"
  | "offered"
  | "awaiting_response"
  | "awaiting_schedule"
  | "scheduled_pending_internal"
  | "confirmed"
  | "lost"
  | "reactivable";

export type SchedulingState =
  | "not_started"
  | "collecting_availability"
  | "slot_suggested"
  | "awaiting_internal_confirmation"
  | "confirmed";

export type PaymentState =
  | "not_started"
  | "link_sent"
  | "pending"
  | "approved"
  | "failed"
  | "expired"
  | "abandoned";

export type ClosingState =
  | "open"
  | "consultation_recommended"
  | "proposal_sent"
  | "scheduling_in_progress"
  | "payment_in_progress"
  | "consultation_confirmed"
  | "blocked"
  | "lost"
  | "reactivable";

export type ClosingRecommendedAction =
  | "suggest_consultation_now"
  | "send_consultation_offer"
  | "collect_schedule_preferences"
  | "suggest_schedule_slot"
  | "confirm_internal_schedule"
  | "send_payment_link"
  | "follow_up_payment"
  | "confirm_consultation"
  | "mark_waiting_client"
  | "mark_waiting_team"
  | "reactivate_closing"
  | "register_closing_loss";

export type ClosingBlockReason =
  | "awaiting_client_response"
  | "awaiting_client_schedule"
  | "awaiting_internal_confirmation"
  | "payment_pending"
  | "payment_failed"
  | "payment_expired"
  | "payment_abandoned"
  | "objection_value"
  | "lead_silent"
  | "waiting_office"
  | null;

export type CommercialClosingAssessment = {
  consultationOfferState: ConsultationOfferState;
  schedulingState: SchedulingState;
  paymentState: PaymentState;
  closingState: ClosingState;
  closingBlockReason: ClosingBlockReason;
  closingSignal: string;
  closingNextStep: string;
  closingRecommendedAction: ClosingRecommendedAction;
  closingRecommendedActionLabel: string;
  closingRecommendedActionDetail: string;
  closingCopySuggestion: string | null;
  shouldOverrideCommercialAction: boolean;
  advancementReason: string;
};

export type CommercialClosingInput = {
  pipelineId?: string | null;
  pipelineStage?: string | null;
  consultationReadiness?: string | null;
  consultationRecommendationState?: string | null;
  consultationSuggestedCopy?: string | null;
  opportunityState?: string | null;
  blockingReason?: string | null;
  objectionState?: string | null;
  waitingOn?: string | null;
  nextStep?: string | null;
  consultationOfferState?: string | null;
  consultationOfferSentAt?: string | null;
  consultationOfferReason?: string | null;
  consultationOfferCopy?: string | null;
  consultationOfferAmount?: number | null;
  schedulingState?: string | null;
  schedulingIntent?: string | null;
  schedulingSuggestedAt?: string | null;
  leadSchedulePreference?: string | null;
  desiredScheduleWindow?: string | null;
  scheduleConfirmedAt?: string | null;
  paymentState?: string | null;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
  paymentReference?: string | null;
  paymentPendingAt?: string | null;
  paymentApprovedAt?: string | null;
  paymentFailedAt?: string | null;
  paymentExpiredAt?: string | null;
  paymentAbandonedAt?: string | null;
  consultationConfirmedAt?: string | null;
  latestSummary?: string | null;
  latestNote?: string | null;
};

type SyncAssessmentInput = CommercialClosingInput & {
  pipelineId: string;
  sessionId?: string | null;
  createEvent?: boolean;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function pushReason(reasons: string[], condition: unknown, reason: string) {
  if (condition) {
    reasons.push(reason);
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function coerceOfferState(value: string | null | undefined): ConsultationOfferState {
  switch (value) {
    case "recommended":
    case "offered":
    case "awaiting_response":
    case "awaiting_schedule":
    case "scheduled_pending_internal":
    case "confirmed":
    case "lost":
    case "reactivable":
      return value;
    default:
      return "not_offered";
  }
}

function coerceSchedulingState(value: string | null | undefined): SchedulingState {
  switch (value) {
    case "collecting_availability":
    case "slot_suggested":
    case "awaiting_internal_confirmation":
    case "confirmed":
      return value;
    default:
      return "not_started";
  }
}

function coercePaymentState(value: string | null | undefined): PaymentState {
  switch (value) {
    case "link_sent":
    case "pending":
    case "approved":
    case "failed":
    case "expired":
    case "abandoned":
      return value;
    default:
      return "not_started";
  }
}

function labelForClosingAction(action: ClosingRecommendedAction) {
  switch (action) {
    case "suggest_consultation_now":
      return "Sugerir consulta agora";
    case "send_consultation_offer":
      return "Enviar proposta de consulta";
    case "collect_schedule_preferences":
      return "Cobrar janela de horario";
    case "suggest_schedule_slot":
      return "Sugerir horario";
    case "confirm_internal_schedule":
      return "Confirmar agenda interna";
    case "send_payment_link":
      return "Enviar link de pagamento";
    case "follow_up_payment":
      return "Retomar pagamento";
    case "confirm_consultation":
      return "Confirmar consulta";
    case "mark_waiting_client":
      return "Marcar aguardando cliente";
    case "mark_waiting_team":
      return "Marcar aguardando equipe";
    case "reactivate_closing":
      return "Reativar fechamento";
    case "register_closing_loss":
      return "Registrar perda";
  }
}

function buildOfferCopy(input: CommercialClosingInput) {
  const amount =
    typeof input.consultationOfferAmount === "number" && Number.isFinite(input.consultationOfferAmount)
      ? `, com honorario de R$ ${input.consultationOfferAmount.toFixed(2).replace(".", ",")}`
      : "";
  const baseCopy =
    input.consultationSuggestedCopy ||
    "Pelo contexto que voce trouxe, faz sentido avancarmos para uma consulta orientada e objetiva.";

  return `${baseCopy}${amount}. Se fizer sentido para voce, eu posso te enviar a proposta e alinhar o melhor horario.`;
}

export function evaluateCommercialClosing(
  input: CommercialClosingInput
): CommercialClosingAssessment {
  const pipelineStage = normalizeText(input.pipelineStage);
  const consultationReadiness = normalizeText(input.consultationReadiness);
  const consultationRecommendationState = normalizeText(input.consultationRecommendationState);
  const waitingOn = normalizeText(input.waitingOn);
  const blockingReason = normalizeText(input.blockingReason);
  const objectionState = normalizeText(input.objectionState);
  const corpus = normalizeText([input.latestSummary, input.latestNote, input.nextStep].filter(Boolean).join(" | "));

  const offerState = coerceOfferState(input.consultationOfferState);
  const schedulingState = coerceSchedulingState(input.schedulingState);
  const paymentState = coercePaymentState(input.paymentState);

  const hasOffer = Boolean(
    input.consultationOfferSentAt ||
      input.consultationOfferCopy ||
      input.consultationOfferReason ||
      offerState !== "not_offered"
  );
  const hasDesiredWindow = Boolean(input.desiredScheduleWindow || input.leadSchedulePreference || input.schedulingIntent);
  const hasSuggestedSlot = Boolean(input.schedulingSuggestedAt);
  const hasConfirmedSchedule = Boolean(input.scheduleConfirmedAt);
  const hasPaymentLink = Boolean(input.paymentLinkSentAt || input.paymentLinkUrl || input.paymentReference);
  const isLeadSilent = blockingReason === "lead_silent" || consultationReadiness === "blocked_by_silence";
  const hasValueObjection = blockingReason === "objection_value" || objectionState === "value";

  const reasons: string[] = [];
  let consultationOfferState: ConsultationOfferState = offerState;
  let normalizedSchedulingState: SchedulingState = schedulingState;
  let normalizedPaymentState: PaymentState = paymentState;
  let closingState: ClosingState = "open";
  let closingBlockReason: ClosingBlockReason = null;
  let closingNextStep = "Continuar acompanhando a conversa com criterio.";
  let closingRecommendedAction: ClosingRecommendedAction = "mark_waiting_client";
  let closingRecommendedActionDetail =
    "O fechamento ainda nao entrou em trilho ativo. O foco segue em acompanhar o lead sem pressa.";
  let closingCopySuggestion: string | null = null;
  let shouldOverrideCommercialAction = false;

  if (pipelineStage === "closed_lost" || offerState === "lost") {
    consultationOfferState = "lost";
    closingState = "lost";
    closingRecommendedAction = "register_closing_loss";
    closingRecommendedActionDetail =
      "O fechamento foi perdido. So vale reabrir se surgir novo contexto ou nova janela comercial.";
    closingNextStep = "Registrar perda com motivo claro e mover apenas se houver sinal novo.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Fechamento ja foi encerrado como perdido.");
  } else if (input.consultationConfirmedAt || hasConfirmedSchedule && normalizedPaymentState === "approved") {
    consultationOfferState = "confirmed";
    normalizedSchedulingState = "confirmed";
    normalizedPaymentState = "approved";
    closingState = "consultation_confirmed";
    closingRecommendedAction = "confirm_consultation";
    closingRecommendedActionDetail =
      "Consulta confirmada. O foco agora e preservar contexto, evitar atrito e preparar a entrega.";
    closingNextStep = "Preservar contexto, comunicar confirmacao e garantir alinhamento final.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Horario e pagamento ja sustentam consulta confirmada.");
  } else if (normalizedPaymentState === "approved") {
    closingState = "payment_in_progress";
    closingRecommendedAction = "confirm_consultation";
    closingRecommendedActionDetail =
      "Pagamento aprovado. Falta apenas consolidar a confirmacao da consulta no trilho comercial.";
    closingNextStep = hasConfirmedSchedule
      ? "Confirmar consulta e registrar o fechamento."
      : "Consolidar horario final e confirmar consulta.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Pagamento ja foi aprovado.");
  } else if (normalizedPaymentState === "pending" || normalizedPaymentState === "link_sent" || hasPaymentLink) {
    normalizedPaymentState = paymentState === "pending" ? "pending" : hasPaymentLink ? "link_sent" : paymentState;
    closingState = "payment_in_progress";
    closingBlockReason = normalizedPaymentState === "pending" ? "payment_pending" : "awaiting_client_response";
    closingRecommendedAction =
      normalizedPaymentState === "pending" ? "follow_up_payment" : "send_payment_link";
    closingRecommendedActionDetail =
      normalizedPaymentState === "pending"
        ? "O link ja foi enviado e o pagamento ainda nao foi concluido. Vale um follow-up curto e disciplinado."
        : "A consulta ja caminhou para fechamento. O proximo passo e materializar o pagamento no timing certo.";
    closingNextStep =
      normalizedPaymentState === "pending"
        ? "Retomar o pagamento com elegancia e confirmar se houve dificuldade no checkout."
        : "Enviar o link de pagamento e orientar o proximo movimento apos a quitacao.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Fechamento ja entrou em etapa de pagamento.");
  } else if (hasConfirmedSchedule || normalizedSchedulingState === "confirmed") {
    normalizedSchedulingState = "confirmed";
    closingState = "scheduling_in_progress";
    closingRecommendedAction = "send_payment_link";
    closingRecommendedActionDetail =
      "O horario ja esta alinhado. Agora o trilho pede o envio do pagamento para consolidar a consulta.";
    closingNextStep = "Enviar pagamento e acompanhar a quitacao antes da confirmacao final.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Horario da consulta ja foi combinado.");
  } else if (hasSuggestedSlot || normalizedSchedulingState === "slot_suggested") {
    consultationOfferState = consultationOfferState === "not_offered" ? "awaiting_schedule" : consultationOfferState;
    normalizedSchedulingState = "slot_suggested";
    closingState = "scheduling_in_progress";
    closingBlockReason = "awaiting_client_response";
    closingRecommendedAction = "confirm_internal_schedule";
    closingRecommendedActionDetail =
      "Ja existe horario sugerido. O proximo passo e confirmar retorno do lead e alinhamento interno.";
    closingNextStep = "Cobrar confirmacao do horario sugerido e fechar a reserva interna.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Horario ja foi sugerido para o lead.");
  } else if (hasDesiredWindow || normalizedSchedulingState === "collecting_availability") {
    consultationOfferState = consultationOfferState === "not_offered" ? "awaiting_schedule" : consultationOfferState;
    normalizedSchedulingState = "collecting_availability";
    closingState = "scheduling_in_progress";
    closingBlockReason = "awaiting_client_schedule";
    closingRecommendedAction = "suggest_schedule_slot";
    closingRecommendedActionDetail =
      "O lead ja sinalizou interesse de agenda. Falta devolver uma sugestao objetiva de horario.";
    closingNextStep = "Sugerir horario concreto com base na janela informada pelo lead.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Lead ja sinalizou janela ou preferencia de horario.");
  } else if (hasOffer || offerState === "offered" || offerState === "awaiting_response") {
    consultationOfferState =
      offerState === "not_offered" ? "awaiting_response" : offerState === "recommended" ? "offered" : offerState;
    closingState = isLeadSilent ? "reactivable" : "proposal_sent";
    closingBlockReason = isLeadSilent ? "lead_silent" : "awaiting_client_response";
    closingRecommendedAction = isLeadSilent ? "reactivate_closing" : "collect_schedule_preferences";
    closingRecommendedActionDetail = isLeadSilent
      ? "A proposta de consulta ja foi enviada, mas o lead esfriou. Vale retomar o fechamento com elegancia."
      : "A consulta ja foi proposta. Agora o trilho pede capturar janela de horario e sinal claro de aceite.";
    closingNextStep = isLeadSilent
      ? "Reativar a conversa com foco em fechamento e retirar atrito."
      : "Cobrar escolha de horario ou janela preferida para consolidar a consulta.";
    closingCopySuggestion = input.consultationOfferCopy || buildOfferCopy(input);
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Consulta ja foi proposta ou entrou em espera de resposta.");
  } else if (
    consultationRecommendationState === "recommend_now" ||
    consultationReadiness === "ready_for_consultation" ||
    consultationReadiness === "closing"
  ) {
    consultationOfferState = "recommended";
    closingState = "consultation_recommended";
    closingRecommendedAction =
      consultationRecommendationState === "recommend_now"
        ? "send_consultation_offer"
        : "suggest_consultation_now";
    closingRecommendedActionDetail =
      "O lead ja esta maduro o suficiente para transformar a recomendacao em proposta concreta de consulta.";
    closingNextStep = "Materializar a recomendacao em proposta, copy e convite de avancar.";
    closingCopySuggestion = buildOfferCopy(input);
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Prontidao comercial suficiente para iniciar o fechamento da consulta.");
  } else if (hasValueObjection) {
    closingState = "blocked";
    closingBlockReason = "objection_value";
    closingRecommendedAction = "mark_waiting_client";
    closingRecommendedActionDetail =
      "Existe trava de valor antes do fechamento. Vale responder com criterio antes de pressionar agenda ou pagamento.";
    closingNextStep = "Responder a objecao principal e so depois retomar proposta ou agenda.";
    pushReason(reasons, true, "Fechamento travado por objecao de valor.");
  } else if (isLeadSilent) {
    consultationOfferState = offerState === "not_offered" ? "reactivable" : offerState;
    closingState = "reactivable";
    closingBlockReason = "lead_silent";
    closingRecommendedAction = "reactivate_closing";
    closingRecommendedActionDetail =
      "Existe sinal de fechamento interrompido por silencio. Vale retomar com disciplina e sem parecer insistente.";
    closingNextStep = "Reativar o lead com follow-up curto, objetivo e contextual.";
    shouldOverrideCommercialAction = hasOffer || consultationRecommendationState === "recommend_now";
    pushReason(reasons, true, "Silencio interrompeu o trilho de fechamento.");
  } else if (waitingOn === "team") {
    closingState = "blocked";
    closingBlockReason = "waiting_office";
    closingRecommendedAction = "mark_waiting_team";
    closingRecommendedActionDetail =
      "O fechamento depende de retorno interno. Vale deixar a dependencia visivel para nao perder o timing.";
    closingNextStep = "Fechar pendencia interna e devolver o proximo passo ao lead.";
    shouldOverrideCommercialAction = hasOffer || consultationRecommendationState === "recommend_now";
    pushReason(reasons, true, "Fechamento aguardando retorno interno.");
  }

  if (normalizedPaymentState === "failed" || normalizedPaymentState === "expired" || normalizedPaymentState === "abandoned") {
    closingState = normalizedPaymentState === "abandoned" ? "reactivable" : "blocked";
    closingBlockReason =
      normalizedPaymentState === "failed"
        ? "payment_failed"
        : normalizedPaymentState === "expired"
          ? "payment_expired"
          : "payment_abandoned";
    closingRecommendedAction =
      normalizedPaymentState === "abandoned" ? "reactivate_closing" : "follow_up_payment";
    closingRecommendedActionDetail =
      normalizedPaymentState === "failed"
        ? "O pagamento falhou. Vale revisar o canal de cobranca e oferecer um reenvio sem atrito."
        : normalizedPaymentState === "expired"
          ? "O link expirou antes da conclusao. O ideal e reenviar com contexto e orientar o timing."
          : "O checkout foi abandonado. Vale retomar o fechamento entendendo a principal friccao.";
    closingNextStep =
      normalizedPaymentState === "abandoned"
        ? "Retomar o fechamento, entender a friccao e reabrir o pagamento se fizer sentido."
        : "Reenviar ou regularizar o pagamento antes de confirmar a consulta.";
    shouldOverrideCommercialAction = true;
    pushReason(reasons, true, "Pagamento entrou em estado que trava o fechamento.");
  }

  const closingSignal = uniqueStrings([
    consultationOfferState.replaceAll("_", " "),
    normalizedSchedulingState !== "not_started" ? normalizedSchedulingState.replaceAll("_", " ") : null,
    normalizedPaymentState !== "not_started" ? normalizedPaymentState.replaceAll("_", " ") : null,
    closingState.replaceAll("_", " "),
    closingBlockReason ? closingBlockReason.replaceAll("_", " ") : null
  ]).join(" | ");

  return {
    consultationOfferState,
    schedulingState: normalizedSchedulingState,
    paymentState: normalizedPaymentState,
    closingState,
    closingBlockReason,
    closingSignal,
    closingNextStep,
    closingRecommendedAction,
    closingRecommendedActionLabel: labelForClosingAction(closingRecommendedAction),
    closingRecommendedActionDetail,
    closingCopySuggestion,
    shouldOverrideCommercialAction,
    advancementReason: reasons.join(" ")
  };
}

function buildUpdatePayload(assessment: CommercialClosingAssessment) {
  const now = new Date().toISOString();

  return {
    consultation_offer_state: assessment.consultationOfferState,
    scheduling_state: assessment.schedulingState,
    payment_state: assessment.paymentState,
    closing_state: assessment.closingState,
    closing_block_reason: assessment.closingBlockReason,
    closing_signal: assessment.closingSignal,
    closing_next_step: assessment.closingNextStep,
    closing_recommended_action: assessment.closingRecommendedAction,
    closing_recommended_action_detail: assessment.closingRecommendedActionDetail,
    closing_copy_suggestion: assessment.closingCopySuggestion,
    last_closing_signal_at: now,
    updated_at: now
  };
}

class CommercialClosingService {
  async syncPipelineClosingAssessment(input: SyncAssessmentInput) {
    const { createAdminSupabaseClient } = await import("../supabase/admin");
    const supabase = createAdminSupabaseClient();
    const assessment = evaluateCommercialClosing(input);

    await supabase
      .from("client_pipeline")
      .update(buildUpdatePayload(assessment))
      .eq("id", input.pipelineId);

    if (input.sessionId && input.createEvent) {
      await supabase.from("conversation_events").insert({
        session_id: input.sessionId,
        event_type: "commercial_closing_synced",
        actor_type: "system",
        event_data: {
          summary: `Trilho de fechamento sincronizado: ${assessment.closingState} / ${assessment.closingRecommendedAction}.`,
          closingState: assessment.closingState,
          consultationOfferState: assessment.consultationOfferState,
          schedulingState: assessment.schedulingState,
          paymentState: assessment.paymentState
        }
      });
    }

    return assessment;
  }

  async syncPipelineClosingFromProfile(input: {
    profileId: string;
    payload: Partial<{
      paymentState: PaymentState;
      paymentLinkSentAt: string | null;
      paymentLinkUrl: string | null;
      paymentReference: string | null;
      paymentPendingAt: string | null;
      paymentApprovedAt: string | null;
      paymentFailedAt: string | null;
      paymentExpiredAt: string | null;
      paymentAbandonedAt: string | null;
      consultationOfferAmount: number | null;
    }>;
  }) {
    const { createAdminSupabaseClient } = await import("../supabase/admin");
    const supabase = createAdminSupabaseClient();

    const { data: pipeline } = await supabase
      .from("client_pipeline")
      .select(`
        id,
        stage,
        consultation_readiness,
        consultation_recommendation_state,
        consultation_suggested_copy,
        opportunity_state,
        blocking_reason,
        objection_state,
        waiting_on,
        next_step,
        consultation_offer_state,
        consultation_offer_sent_at,
        consultation_offer_reason,
        consultation_offer_copy,
        consultation_offer_amount,
        scheduling_state,
        scheduling_intent,
        scheduling_suggested_at,
        lead_schedule_preference,
        desired_schedule_window,
        schedule_confirmed_at,
        payment_state,
        payment_link_sent_at,
        payment_link_url,
        payment_reference,
        payment_pending_at,
        payment_approved_at,
        payment_failed_at,
        payment_expired_at,
        payment_abandoned_at,
        consultation_confirmed_at,
        clients!inner (
          profile_id
        )
      `)
      .eq("clients.profile_id", input.profileId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pipeline?.id) {
      return null;
    }

    const now = new Date().toISOString();
    const patch = {
      payment_state: input.payload.paymentState,
      payment_link_sent_at: input.payload.paymentLinkSentAt,
      payment_link_url: input.payload.paymentLinkUrl,
      payment_reference: input.payload.paymentReference,
      payment_pending_at: input.payload.paymentPendingAt,
      payment_approved_at: input.payload.paymentApprovedAt,
      payment_failed_at: input.payload.paymentFailedAt,
      payment_expired_at: input.payload.paymentExpiredAt,
      payment_abandoned_at: input.payload.paymentAbandonedAt,
      consultation_offer_amount: input.payload.consultationOfferAmount,
      updated_at: now
    };

    await supabase.from("client_pipeline").update(patch).eq("id", pipeline.id);

    return this.syncPipelineClosingAssessment({
      pipelineId: pipeline.id,
      pipelineStage: pipeline.stage,
      consultationReadiness: pipeline.consultation_readiness,
      consultationRecommendationState: pipeline.consultation_recommendation_state,
      consultationSuggestedCopy: pipeline.consultation_suggested_copy,
      opportunityState: pipeline.opportunity_state,
      blockingReason: pipeline.blocking_reason,
      objectionState: pipeline.objection_state,
      waitingOn: pipeline.waiting_on,
      nextStep: pipeline.next_step,
      consultationOfferState: pipeline.consultation_offer_state,
      consultationOfferSentAt: pipeline.consultation_offer_sent_at,
      consultationOfferReason: pipeline.consultation_offer_reason,
      consultationOfferCopy: pipeline.consultation_offer_copy,
      consultationOfferAmount:
        input.payload.consultationOfferAmount ?? pipeline.consultation_offer_amount,
      schedulingState: pipeline.scheduling_state,
      schedulingIntent: pipeline.scheduling_intent,
      schedulingSuggestedAt: pipeline.scheduling_suggested_at,
      leadSchedulePreference: pipeline.lead_schedule_preference,
      desiredScheduleWindow: pipeline.desired_schedule_window,
      scheduleConfirmedAt: pipeline.schedule_confirmed_at,
      paymentState: input.payload.paymentState ?? pipeline.payment_state,
      paymentLinkSentAt: input.payload.paymentLinkSentAt ?? pipeline.payment_link_sent_at,
      paymentLinkUrl: input.payload.paymentLinkUrl ?? pipeline.payment_link_url,
      paymentReference: input.payload.paymentReference ?? pipeline.payment_reference,
      paymentPendingAt: input.payload.paymentPendingAt ?? pipeline.payment_pending_at,
      paymentApprovedAt: input.payload.paymentApprovedAt ?? pipeline.payment_approved_at,
      paymentFailedAt: input.payload.paymentFailedAt ?? pipeline.payment_failed_at,
      paymentExpiredAt: input.payload.paymentExpiredAt ?? pipeline.payment_expired_at,
      paymentAbandonedAt: input.payload.paymentAbandonedAt ?? pipeline.payment_abandoned_at,
      consultationConfirmedAt: pipeline.consultation_confirmed_at
    });
  }
}

export const commercialClosingService = new CommercialClosingService();
