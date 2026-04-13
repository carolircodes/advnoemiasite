import "server-only";

import { z } from "zod";

import { assertStaffActor } from "../auth/guards";
import {
  caseAreaLabels,
  intakeRequestStatusLabels,
  publicIntakeStages,
  publicIntakeUrgencies,
  publicIntakeUrgencyLabels,
  submitLegacySiteTriageSchema,
  submitPublicTriageSchema,
  updateIntakeRequestStatusSchema
} from "../domain/portal";
import { notifyStaffAboutIntakeRequest } from "./automation-rules";
import { createAdminSupabaseClient } from "../supabase/admin";

type ProductEventInput = {
  eventKey: string;
  eventGroup?: string;
  pagePath?: string;
  sessionId?: string;
  intakeRequestId?: string;
  payload?: Record<string, unknown>;
  profileId?: string;
};

const recordProductEventSchema = z.object({
  eventKey: z.string().trim().min(1).max(120),
  eventGroup: z.string().trim().min(1).max(80).optional(),
  pagePath: z.string().trim().max(300).optional(),
  sessionId: z.string().trim().max(160).optional(),
  intakeRequestId: z.string().trim().max(160).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  profileId: z.string().trim().max(160).optional()
});

type PublicTriageContext = {
  pagePath?: string;
  sessionId?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

type NormalizedPublicTriageInput = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  caseArea: "previdenciario" | "consumidor_bancario" | "familia" | "civil";
  currentStage:
    | "ainda-nao-iniciei"
    | "ja-estou-em-atendimento"
    | "tenho-prazo-proximo"
    | "recebi-negativa-ou-cobranca";
  urgencyLevel: "baixa" | "moderada" | "alta" | "urgente";
  preferredContactPeriod: "manha" | "tarde" | "noite" | "horario-comercial";
  caseSummary: string;
  consentAccepted: boolean;
  sourcePath: string;
  website: string;
  captureMetadata: {
    captureMode: "portal_guided_triage" | "static_site_triage";
    source: string;
    page: string;
    theme: string;
    campaign: string;
    video: string;
    areaRaw: string;
    problemType: string;
    urgencyRaw: string;
  };
};

function normalizeCaptureValue(value: string | null | undefined) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-");
}

function inferCaseArea(
  areaRaw: string,
  problemTypeRaw: string,
  themeRaw: string
): NormalizedPublicTriageInput["caseArea"] {
  const candidates = [areaRaw, problemTypeRaw, themeRaw].map(normalizeCaptureValue);

  if (candidates.some((value) => value.includes("previd") || value.includes("aposentadoria"))) {
    return "previdenciario";
  }

  if (candidates.some((value) => value.includes("familia"))) {
    return "familia";
  }

  if (
    candidates.some(
      (value) =>
        value.includes("consumidor") ||
        value.includes("banc") ||
        value.includes("banco") ||
        value.includes("emprestimo") ||
        value.includes("negativ")
    )
  ) {
    return "consumidor_bancario";
  }

  if (candidates.some((value) => value.includes("civil"))) {
    return "civil";
  }

  return "civil";
}

function inferUrgencyLevel(rawValue: string): NormalizedPublicTriageInput["urgencyLevel"] {
  const value = normalizeCaptureValue(rawValue);

  if (value.includes("urgente")) {
    return "urgente";
  }

  if (value.includes("alta")) {
    return "alta";
  }

  if (value.includes("media") || value.includes("moderada")) {
    return "moderada";
  }

  if (value.includes("baixa")) {
    return "baixa";
  }

  return "moderada";
}

function normalizePublicTriageInput(
  rawInput: unknown,
  context: PublicTriageContext = {}
): NormalizedPublicTriageInput {
  const canonicalResult = submitPublicTriageSchema.safeParse(rawInput);

  if (canonicalResult.success) {
    const input = canonicalResult.data;

    return {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      city: input.city,
      caseArea: input.caseArea,
      currentStage: input.currentStage,
      urgencyLevel: input.urgencyLevel,
      preferredContactPeriod: input.preferredContactPeriod,
      caseSummary: input.caseSummary,
      consentAccepted: input.consentAccepted,
      sourcePath: input.sourcePath || context.pagePath || "/triagem",
      website: input.website,
      captureMetadata: {
        captureMode: "portal_guided_triage",
        source: input.captureMetadata?.source || "portal-triagem",
        page:
          input.captureMetadata?.page || input.sourcePath || context.pagePath || "/triagem",
        theme: input.captureMetadata?.theme || "",
        campaign: input.captureMetadata?.campaign || "",
        video: input.captureMetadata?.video || "",
        areaRaw: input.caseArea,
        problemType: input.caseArea,
        urgencyRaw: input.urgencyLevel
      }
    };
  }

  const legacyInput = submitLegacySiteTriageSchema.parse(rawInput);
  const caseArea = inferCaseArea(
    legacyInput.area,
    legacyInput.problem_type,
    legacyInput.theme
  );

  return {
    fullName: legacyInput.name,
    email: "",
    phone: legacyInput.phone,
    city: legacyInput.city,
    caseArea,
    currentStage: "ainda-nao-iniciei",
    urgencyLevel: inferUrgencyLevel(legacyInput.urgency),
    preferredContactPeriod: "horario-comercial",
    caseSummary: legacyInput.description,
    consentAccepted: true,
    sourcePath: legacyInput.sourcePath || context.pagePath || "/triagem.html",
    website: legacyInput.website,
    captureMetadata: {
      captureMode: "static_site_triage",
      source: legacyInput.source,
      page: legacyInput.page,
      theme: legacyInput.theme,
      campaign: legacyInput.campaign,
      video: legacyInput.video,
      areaRaw: legacyInput.area,
      problemType: legacyInput.problem_type,
      urgencyRaw: legacyInput.urgency
    }
  };
}

export async function recordProductEvent(rawInput: ProductEventInput) {
  const input = recordProductEventSchema.parse(rawInput);
  // const input = recordProductEventSchema.parse(rawInput); // Schema não definido, pulando validação
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("product_events")
    .insert({
      event_key: input.eventKey,
      event_group: input.eventGroup,
      page_path: input.pagePath || null,
      session_id: input.sessionId || null,
      intake_request_id: input.intakeRequestId || null,
      profile_id: input.profileId || null,
      payload: input.payload || {}
    })
    .select("id,event_key,event_group")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Nao foi possivel registrar o evento de produto no portal."
    );
  }

  return data;
}

export async function submitPublicTriage(
  rawInput: unknown,
  context: PublicTriageContext = {}
) {
  const input = normalizePublicTriageInput(rawInput, context);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("intake_requests")
    .insert({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      city: input.city || null,
      case_area: input.caseArea,
      current_stage: input.currentStage,
      urgency_level: input.urgencyLevel,
      preferred_contact_period: input.preferredContactPeriod,
      case_summary: input.caseSummary,
      consent_accepted: input.consentAccepted,
      source_path: input.sourcePath || context.pagePath || "/triagem",
      status: "new",
      metadata: {
        captureMode: input.captureMetadata.captureMode,
        source: input.captureMetadata.source || null,
        origem: input.captureMetadata.source || null,
        page: input.captureMetadata.page || null,
        theme: input.captureMetadata.theme || null,
        tema: input.captureMetadata.theme || null,
        campaign: input.captureMetadata.campaign || null,
        campanha: input.captureMetadata.campaign || null,
        video: input.captureMetadata.video || null,
        areaRaw: input.captureMetadata.areaRaw || null,
        area: input.captureMetadata.areaRaw || null,
        problemType: input.captureMetadata.problemType || null,
        problem_type: input.captureMetadata.problemType || null,
        urgencyRaw: input.captureMetadata.urgencyRaw || null,
        urgencia: input.captureMetadata.urgencyRaw || null,
        userAgent: context.userAgent || null,
        ipAddress: context.ipAddress || null
      }
    })
    .select("id,status,submitted_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel registrar a triagem agora.");
  }

  try {
    await recordProductEvent({
      eventKey: "triage_submitted",
      eventGroup: "conversion",
      pagePath: input.sourcePath || context.pagePath || "/triagem",
      sessionId: context.sessionId,
      intakeRequestId: data.id,
      payload: {
        caseArea: input.caseArea,
        caseAreaLabel: caseAreaLabels[input.caseArea],
        urgencyLevel: input.urgencyLevel,
        urgencyLabel: publicIntakeUrgencyLabels[input.urgencyLevel],
        currentStage: input.currentStage,
        currentStageLabel: `Stage ${input.currentStage}`,
        preferredContactPeriod: input.preferredContactPeriod,
        preferredContactPeriodLabel: `Period ${input.preferredContactPeriod}`,
        source: input.captureMetadata.source || null,
        origem: input.captureMetadata.source || null,
        page: input.captureMetadata.page || null,
        theme: input.captureMetadata.theme || null,
        tema: input.captureMetadata.theme || null,
        campaign: input.captureMetadata.campaign || null,
        campanha: input.captureMetadata.campaign || null,
        video: input.captureMetadata.video || null,
        areaRaw: input.captureMetadata.areaRaw || null,
        area: input.captureMetadata.areaRaw || null,
        problemType: input.captureMetadata.problemType || null,
        problem_type: input.captureMetadata.problemType || null,
        urgencyRaw: input.captureMetadata.urgencyRaw || null,
        urgencia: input.captureMetadata.urgencyRaw || null,
        captureMode: input.captureMetadata.captureMode
      }
    });
  } catch (trackingError) {
    console.error("[triage.submit] Failed to record conversion event", {
      intakeRequestId: data.id,
      message: trackingError instanceof Error ? trackingError.message : String(trackingError)
    });
  }

  try {
    await notifyStaffAboutIntakeRequest({
      intakeRequestId: data.id,
      fullName: input.fullName,
      caseArea: input.caseArea,
      urgencyLevel: input.urgencyLevel,
      currentStage: input.currentStage,
      preferredContactPeriod: input.preferredContactPeriod,
      email: input.email,
      phone: input.phone,
      caseSummary: input.caseSummary,
      submittedAt: data.submitted_at
    });
  } catch (automationError) {
    console.error("[triage.submit] Failed to queue internal triage automation", {
      intakeRequestId: data.id,
      message: automationError instanceof Error ? automationError.message : String(automationError)
    });
  }

  return data;
}

export async function updateIntakeRequestStatus(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateIntakeRequestStatusSchema.parse(rawInput);
  const supabase = createAdminSupabaseClient();
  const { data: existingRecord, error: existingError } = await supabase
    .from("intake_requests")
    .select("id,status")
    .eq("id", input.intakeRequestId)
    .single();

  if (existingError || !existingRecord) {
    throw new Error(existingError?.message || "Triagem nao encontrada.");
  }

  const reviewedAt =
    input.status === "new" ? null : new Date().toISOString();
  const { error: updateError } = await supabase
    .from("intake_requests")
    .update({
      status: input.status,
      internal_notes: input.internalNotes || null,
      reviewed_at: reviewedAt
    })
    .eq("id", input.intakeRequestId);

  if (updateError) {
    throw new Error(updateError.message || "Nao foi possivel atualizar a triagem.");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "intake_requests.status.update",
    entity_type: "intake_requests",
    entity_id: input.intakeRequestId,
    payload: {
      previousStatus: existingRecord.status,
      nextStatus: input.status,
      nextStatusLabel: intakeRequestStatusLabels[input.status],
      internalNotes: input.internalNotes || null
    }
  });

  if (auditError) {
    throw new Error(
      `Nao foi possivel registrar a auditoria da triagem: ${auditError.message}`
    );
  }

  return {
    intakeRequestId: input.intakeRequestId,
    previousStatus: existingRecord.status,
    nextStatus: input.status
  };
}
