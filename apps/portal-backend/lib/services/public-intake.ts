import "server-only";

import { assertStaffActor } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  intakeRequestStatusLabels,
  publicContactPeriodLabels,
  publicIntakeStageLabels,
  publicIntakeUrgencyLabels,
  recordProductEventSchema,
  submitPublicTriageSchema,
  updateIntakeRequestStatusSchema
} from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ProductEventInput = {
  eventKey: string;
  eventGroup?: string;
  pagePath?: string;
  sessionId?: string;
  intakeRequestId?: string;
  payload?: Record<string, unknown>;
  profileId?: string;
};

type PublicTriageContext = {
  pagePath?: string;
  sessionId?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export async function recordProductEvent(rawInput: ProductEventInput) {
  const input = recordProductEventSchema.parse(rawInput);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("product_events")
    .insert({
      event_key: input.eventKey,
      event_group: input.eventGroup,
      page_path: input.pagePath || null,
      session_id: input.sessionId || null,
      intake_request_id: input.intakeRequestId || null,
      profile_id: rawInput.profileId || null,
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
  const input = submitPublicTriageSchema.parse(rawInput);
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
        currentStageLabel: publicIntakeStageLabels[input.currentStage],
        preferredContactPeriod: input.preferredContactPeriod,
        preferredContactPeriodLabel:
          publicContactPeriodLabels[input.preferredContactPeriod]
      }
    });
  } catch (trackingError) {
    console.error("[triage.submit] Failed to record conversion event", {
      intakeRequestId: data.id,
      message: trackingError instanceof Error ? trackingError.message : String(trackingError)
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
