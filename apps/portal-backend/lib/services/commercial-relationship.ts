import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import {
  commercialClosingService,
  evaluateCommercialClosing,
  type CommercialClosingAssessment
} from "./commercial-closing";
import { commercialAppointmentService } from "./commercial-appointment";
import {
  commercialConversionService,
  evaluateCommercialConversion,
  type CommercialConversionAssessment
} from "./commercial-conversion";
import { normalizeFollowUpStatus } from "./follow-up-semantics";
import { clientIdentityService } from "./client-identity";
import { clientMergeService } from "./client-merge";
import { sanitizeHumanName } from "./lead-identity";

type SupportedChannel = "instagram" | "facebook" | "youtube" | "whatsapp" | "site" | "portal" | "telegram";
type InboxFollowUpStatus = "none" | "pending" | "due" | "overdue" | "resolved" | "converted";
type CommercialFollowUpState =
  | "none"
  | "needs_return"
  | "waiting_client"
  | "waiting_team"
  | "scheduled"
  | "overdue"
  | "completed";

type SessionLinkRow = {
  id: string;
  channel: SupportedChannel;
  external_user_id: string;
  external_thread_id: string | null;
  client_id: string | null;
  client_channel_id?: string | null;
  lead_name?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
};

type ClientChannelRow = {
  id: string;
  client_id: string;
  channel: SupportedChannel;
  external_user_id: string;
  external_thread_id?: string | null;
  display_name?: string | null;
  is_active?: boolean | null;
};

export type CommercialThreadLinkResult = {
  sessionId: string;
  clientId: string | null;
  clientChannelId: string | null;
  pipelineId: string | null;
  matchedBy:
    | "session_client"
    | "existing_channel"
    | "identity_service"
    | "existing_session_link"
    | "unlinked";
};

export type CommercialThreadContext = {
  clientId: string | null;
  clientChannelId: string | null;
  pipelineId: string | null;
  ownerProfileId: string | null;
  ownerAssignedAt: string | null;
  nextStep: string | null;
  nextStepDueAt: string | null;
  waitingOn: string | null;
  followUpState: CommercialFollowUpState;
  followUpReason: string | null;
  lastCommercialNoteAt: string | null;
  latestCommercialNote: {
    id: string;
    body: string;
    kind: string;
    authorName: string | null;
    createdAt: string;
  } | null;
  conversion: CommercialConversionAssessment | null;
  closing: CommercialClosingAssessment | null;
  closingSnapshot: {
    consultationOfferSentAt: string | null;
    consultationOfferReason: string | null;
    consultationOfferCopy: string | null;
    consultationOfferAmount: number | null;
    schedulingIntent: string | null;
    schedulingSuggestedAt: string | null;
    leadSchedulePreference: string | null;
    desiredScheduleWindow: string | null;
    scheduleConfirmedAt: string | null;
    paymentLinkSentAt: string | null;
    paymentLinkUrl: string | null;
    paymentReference: string | null;
    paymentPendingAt: string | null;
    paymentApprovedAt: string | null;
    paymentFailedAt: string | null;
    paymentExpiredAt: string | null;
    paymentAbandonedAt: string | null;
    consultationConfirmedAt: string | null;
    consultationCaseId: string | null;
    consultationAppointmentId: string | null;
    appointmentState: string | null;
    consultationPreconfirmedAt: string | null;
    appointmentCreatedAt: string | null;
    appointmentConfirmedAt: string | null;
    consultationConfirmationSource: string | null;
  } | null;
};

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeFollowUpState(
  value: string | null | undefined
): CommercialFollowUpState {
  switch (value) {
    case "needs_return":
    case "waiting_client":
    case "waiting_team":
    case "scheduled":
    case "overdue":
    case "completed":
      return value;
    default:
      return "none";
  }
}

function mapCommercialToInboxFollowUpStatus(
  value: CommercialFollowUpState
): InboxFollowUpStatus {
  switch (value) {
    case "needs_return":
      return "due";
    case "waiting_client":
    case "waiting_team":
    case "scheduled":
      return "pending";
    case "overdue":
      return "overdue";
    case "completed":
      return "resolved";
    default:
      return "none";
  }
}

class CommercialRelationshipService {
  private supabase = createAdminSupabaseClient();

  private extractDisplayName(session: SessionLinkRow) {
    const metadata = safeObject(session.metadata);
    return (
      sanitizeHumanName(session.lead_name) ||
      sanitizeHumanName(typeof metadata.displayName === "string" ? metadata.displayName : null) ||
      sanitizeHumanName(typeof metadata.full_name === "string" ? metadata.full_name : null) ||
      sanitizeHumanName(typeof metadata.contactName === "string" ? metadata.contactName : null) ||
      null
    );
  }

  private async upsertChannelForClient(input: {
    clientId: string;
    session: SessionLinkRow;
    currentChannel?: ClientChannelRow | null;
    matchedBy: CommercialThreadLinkResult["matchedBy"];
  }) {
    const displayName = this.extractDisplayName(input.session);
    const payload = {
      client_id: input.clientId,
      channel: input.session.channel,
      external_user_id: input.session.external_user_id,
      external_thread_id: input.session.external_thread_id || null,
      display_name: displayName,
      last_session_id: input.session.id,
      last_contact_at: new Date().toISOString(),
      match_source: input.matchedBy,
      match_confidence:
        input.matchedBy === "identity_service"
          ? 0.85
          : input.matchedBy === "existing_channel"
            ? 1
            : 0.95,
      updated_at: new Date().toISOString()
    };

    if (input.currentChannel?.id) {
      const { data, error } = await this.supabase
        .from("client_channels")
        .update(payload)
        .eq("id", input.currentChannel.id)
        .select("id, client_id")
        .single();

      if (error) {
        throw error;
      }

      return data;
    }

    const { data, error } = await this.supabase
      .from("client_channels")
      .insert(payload)
      .select("id, client_id")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async ensureSessionCommercialLink(
    sessionOrId: string | SessionLinkRow
  ): Promise<CommercialThreadLinkResult> {
    const session =
      typeof sessionOrId === "string"
        ? await this.loadSession(sessionOrId)
        : sessionOrId;

    if (!session) {
      return {
        sessionId: typeof sessionOrId === "string" ? sessionOrId : sessionOrId.id,
        clientId: null,
        clientChannelId: null,
        pipelineId: null,
        matchedBy: "unlinked"
      };
    }

    const canonicalSessionClientId = session.client_id
      ? await clientMergeService.getCanonicalClientId(session.client_id)
      : null;

    if (canonicalSessionClientId && session.client_channel_id) {
      const pipelineId = await this.touchPipelineLink(canonicalSessionClientId, session.id, session.channel);
      return {
        sessionId: session.id,
        clientId: canonicalSessionClientId,
        clientChannelId: session.client_channel_id,
        pipelineId,
        matchedBy: "existing_session_link"
      };
    }

    const { data: exactChannel } = await this.supabase
      .from("client_channels")
      .select("id, client_id, channel, external_user_id, external_thread_id, display_name, is_active")
      .eq("channel", session.channel)
      .eq("external_user_id", session.external_user_id)
      .eq("is_active", true)
      .maybeSingle();

    let resolvedClientId = canonicalSessionClientId;
    let resolvedChannelId = session.client_channel_id || exactChannel?.id || null;
    let matchedBy: CommercialThreadLinkResult["matchedBy"] = canonicalSessionClientId
      ? "session_client"
      : exactChannel
        ? "existing_channel"
        : "unlinked";

    if (!resolvedClientId && exactChannel?.client_id) {
      resolvedClientId = await clientMergeService.getCanonicalClientId(exactChannel.client_id);
    }

    if (!resolvedClientId) {
      try {
        const identity = await clientIdentityService.getOrCreateClientAndChannel({
          channel: session.channel,
          externalUserId: session.external_user_id,
          externalThreadId: session.external_thread_id || undefined,
          name: this.extractDisplayName(session) || undefined
        });

        resolvedClientId = identity.client.id;
        resolvedChannelId = identity.clientChannel.id;
        matchedBy = "identity_service";
      } catch (error) {
        console.warn("COMMERCIAL_THREAD_LINK_SKIPPED", {
          sessionId: session.id,
          channel: session.channel,
          externalUserId: session.external_user_id,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (!resolvedClientId) {
      return {
        sessionId: session.id,
        clientId: null,
        clientChannelId: null,
        pipelineId: null,
        matchedBy: "unlinked"
      };
    }

    const channelRow = await this.upsertChannelForClient({
      clientId: resolvedClientId,
      session,
      currentChannel: exactChannel || null,
      matchedBy
    });

    resolvedChannelId = channelRow.id;

    await this.supabase
      .from("conversation_sessions")
      .update({
        client_id: resolvedClientId,
        client_channel_id: resolvedChannelId,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.id);

    const pipelineId = await this.touchPipelineLink(resolvedClientId, session.id, session.channel);

    return {
      sessionId: session.id,
      clientId: resolvedClientId,
      clientChannelId: resolvedChannelId,
      pipelineId,
      matchedBy
    };
  }

  private async touchPipelineLink(
    clientId: string,
    sessionId: string,
    channel: SupportedChannel
  ) {
    const { data: pipeline } = await this.supabase
      .from("client_pipeline")
      .select("id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!pipeline?.id) {
      return null;
    }

    await this.supabase
      .from("client_pipeline")
      .update({
        last_thread_session_id: sessionId,
        source_channel: channel,
        updated_at: new Date().toISOString()
      })
      .eq("id", pipeline.id);

    return pipeline.id;
  }

  private async loadSession(sessionId: string): Promise<SessionLinkRow | null> {
    const { data, error } = await this.supabase
      .from("conversation_sessions")
      .select(
        "id, channel, external_user_id, external_thread_id, client_id, client_channel_id, lead_name, metadata, updated_at"
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as SessionLinkRow;
  }

  async assignCommercialOwner(input: {
    sessionId: string;
    ownerProfileId: string | null;
    ownerName: string | null;
    actorProfileId: string;
    actorName: string;
  }) {
    const link = await this.ensureSessionCommercialLink(input.sessionId);
    const now = new Date().toISOString();

    await this.supabase
      .from("conversation_sessions")
      .update({
        owner_mode: input.ownerProfileId ? "human" : "hybrid",
        owner_user_id: input.ownerProfileId,
        waiting_for: input.ownerProfileId ? "human" : "ai",
        updated_at: now
      })
      .eq("id", input.sessionId);

    if (link.pipelineId) {
      await this.supabase
        .from("client_pipeline")
        .update({
          owner_profile_id: input.ownerProfileId,
          owner_assigned_at: input.ownerProfileId ? now : null,
          updated_at: now
        })
        .eq("id", link.pipelineId);
    }

    await this.supabase.from("conversation_events").insert({
      session_id: input.sessionId,
      event_type: "commercial_owner_updated",
      actor_type: "human",
      actor_id: input.actorProfileId,
      actor_label: input.actorName,
      event_data: {
        summary: input.ownerProfileId
          ? `Ownership comercial assumido por ${input.ownerName || "responsavel interno"}.`
          : "Ownership comercial devolvido para fila compartilhada.",
        ownerProfileId: input.ownerProfileId
      }
    });

    return {
      sessionId: input.sessionId,
      clientId: link.clientId,
      pipelineId: link.pipelineId
    };
  }

  async addCommercialNote(input: {
    sessionId: string;
    body: string;
    authorId: string;
    authorName: string;
    kind: "operational" | "next_action" | "sensitive" | "context";
    isSensitive?: boolean;
    mirrorToPipeline?: boolean;
  }) {
    const link = await this.ensureSessionCommercialLink(input.sessionId);
    const now = new Date().toISOString();
    const noteBody = input.body.trim();

    const { data: note, error } = await this.supabase
      .from("conversation_notes")
      .insert({
        session_id: input.sessionId,
        client_id: link.clientId,
        pipeline_id: link.pipelineId,
        author_id: input.authorId,
        author_name: input.authorName,
        note_body: noteBody,
        note_kind: input.kind,
        is_sensitive: Boolean(input.isSensitive),
        metadata: {
          source: "commercial_relationship"
        }
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(`Nao foi possivel registrar a nota comercial: ${error.message}`);
    }

    const sessionUpdates: Record<string, unknown> = {
      updated_at: now
    };

    if (input.kind === "next_action") {
      sessionUpdates.internal_notes = noteBody;
      sessionUpdates.next_action_hint = noteBody;
    }

    await this.supabase
      .from("conversation_sessions")
      .update(sessionUpdates)
      .eq("id", input.sessionId);

    if (link.pipelineId && input.mirrorToPipeline !== false) {
      const pipelineUpdates: Record<string, unknown> = {
        notes: noteBody,
        last_commercial_note_at: now,
        updated_at: now
      };

      if (input.kind === "next_action") {
        pipelineUpdates.next_step = noteBody;
      }

      await this.supabase
        .from("client_pipeline")
        .update(pipelineUpdates)
        .eq("id", link.pipelineId);
    }

    await this.supabase.from("conversation_events").insert({
      session_id: input.sessionId,
      event_type: "commercial_note_added",
      actor_type: "human",
      actor_id: input.authorId,
      actor_label: input.authorName,
      event_data: {
        summary: "Nota comercial registrada e ligada ao cliente/thread.",
        noteId: note.id,
        noteKind: input.kind
      }
    });

    return {
      noteId: note.id,
      createdAt: note.created_at,
      clientId: link.clientId,
      pipelineId: link.pipelineId
    };
  }

  async updateCommercialFollowUp(input: {
    sessionId: string;
    state: CommercialFollowUpState;
    reason?: string | null;
    dueAt?: string | null;
    nextStep?: string | null;
    waitingOn?: string | null;
    actorProfileId: string;
    actorName: string;
  }) {
    const link = await this.ensureSessionCommercialLink(input.sessionId);
    const now = new Date().toISOString();
    const inboxStatus = mapCommercialToInboxFollowUpStatus(input.state);
    const waitingFor =
      input.waitingOn === "client"
        ? "client"
        : input.waitingOn === "team"
          ? "human"
          : inboxStatus === "resolved"
            ? "none"
            : "human";

    await this.supabase
      .from("conversation_sessions")
      .update({
        follow_up_status: inboxStatus,
        follow_up_due_at: input.dueAt || null,
        follow_up_resolved_at:
          input.state === "completed" ? now : null,
        waiting_for: waitingFor,
        next_action_hint: input.nextStep || null,
        last_status_event_at: now,
        updated_at: now
      })
      .eq("id", input.sessionId);

    if (link.pipelineId) {
      await this.supabase
        .from("client_pipeline")
        .update({
          follow_up_status: inboxStatus,
          follow_up_state: input.state,
          next_follow_up_at: input.dueAt || null,
          follow_up_reason: input.reason || null,
          next_step: input.nextStep || null,
          next_step_due_at: input.dueAt || null,
          waiting_on: input.waitingOn || "none",
          updated_at: now
        })
        .eq("id", link.pipelineId);
    }

    await this.supabase.from("conversation_events").insert({
      session_id: input.sessionId,
      event_type: "commercial_follow_up_updated",
      actor_type: "human",
      actor_id: input.actorProfileId,
      actor_label: input.actorName,
      event_data: {
        summary: `Follow-up comercial atualizado para ${input.state}.`,
        followUpState: input.state,
        followUpReason: input.reason || null,
        waitingOn: input.waitingOn || null,
        dueAt: input.dueAt || null
      }
    });

    return {
      sessionId: input.sessionId,
      clientId: link.clientId,
      pipelineId: link.pipelineId
    };
  }

  async getThreadCommercialContext(sessionId: string): Promise<CommercialThreadContext> {
    const link = await this.ensureSessionCommercialLink(sessionId);

    if (!link.clientId || !link.pipelineId) {
      return {
        clientId: link.clientId,
        clientChannelId: link.clientChannelId,
        pipelineId: link.pipelineId,
        ownerProfileId: null,
        ownerAssignedAt: null,
        nextStep: null,
        nextStepDueAt: null,
        waitingOn: null,
        followUpState: "none",
        followUpReason: null,
        lastCommercialNoteAt: null,
        latestCommercialNote: null,
        conversion: null,
        closing: null,
        closingSnapshot: null
      };
    }

    const [{ data: pipeline }, { data: latestNote }, { data: triage }] = await Promise.all([
      this.supabase
        .from("client_pipeline")
        .select(
          "id, stage, lead_temperature, follow_up_status, owner_profile_id, owner_assigned_at, next_step, next_step_due_at, waiting_on, follow_up_state, follow_up_reason, notes, last_contact_at, last_commercial_note_at, consultation_readiness, conversion_stage, recommended_action, recommended_action_detail, conversion_signal, blocking_reason, objection_state, objection_hint, opportunity_state, consultation_recommendation_state, consultation_recommendation_reason, consultation_suggested_copy, recommended_follow_up_window, advancement_reason, consultation_offer_state, consultation_offer_sent_at, consultation_offer_reason, consultation_offer_copy, consultation_offer_amount, scheduling_state, scheduling_intent, scheduling_suggested_at, lead_schedule_preference, desired_schedule_window, schedule_confirmed_at, payment_state, payment_link_sent_at, payment_link_url, payment_reference, payment_pending_at, payment_approved_at, payment_failed_at, payment_expired_at, payment_abandoned_at, consultation_confirmed_at, consultation_case_id, consultation_appointment_id, appointment_state, consultation_preconfirmed_at, appointment_created_at, appointment_confirmed_at, consultation_confirmation_source, closing_state, closing_block_reason, closing_signal, closing_next_step, closing_recommended_action, closing_recommended_action_detail, closing_copy_suggestion"
        )
        .eq("id", link.pipelineId)
        .maybeSingle(),
      this.supabase
        .from("conversation_notes")
        .select("id, note_body, note_kind, author_name, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.supabase
        .from("noemia_triage_summaries")
        .select("consultation_stage, report_data")
        .eq("session_id", sessionId)
        .maybeSingle()
    ]);

    const conversionInput = {
      pipelineId: link.pipelineId,
      pipelineStage: pipeline?.stage || null,
      leadTemperature: pipeline?.lead_temperature || null,
      followUpStatus: normalizeFollowUpStatus(pipeline?.follow_up_status || null, {
        pipelineStage: pipeline?.stage || null
      }),
      followUpState: pipeline?.follow_up_state || null,
      followUpReason: pipeline?.follow_up_reason || null,
      waitingOn: pipeline?.waiting_on || null,
      nextStep: pipeline?.next_step || null,
      nextStepDueAt: pipeline?.next_step_due_at || null,
      notes: pipeline?.notes || null,
      lastContactAt: pipeline?.last_contact_at || null,
      ownerProfileId: pipeline?.owner_profile_id || null,
      latestSummary:
        typeof triage?.report_data?.resumo_caso === "string"
          ? triage.report_data.resumo_caso
          : null,
      latestNote: latestNote?.note_body || null,
      conversationState: {
        reportSummary:
          typeof triage?.report_data?.resumo_caso === "string"
            ? triage.report_data.resumo_caso
            : null,
        consultationStage: triage?.consultation_stage || null,
        consultationIntentLevel:
          typeof triage?.report_data?.consultation_intent_level === "string"
            ? triage.report_data.consultation_intent_level
            : null,
        consultationInviteState:
          typeof triage?.report_data?.consultation_invite_state === "string"
            ? triage.report_data.consultation_invite_state
            : null,
        consultationInviteTiming:
          typeof triage?.report_data?.consultation_invite_timing === "string"
            ? triage.report_data.consultation_invite_timing
            : null,
        consultationInviteCopy:
          typeof triage?.report_data?.consultation_invite_copy === "string"
            ? triage.report_data.consultation_invite_copy
            : null,
        consultationValueAngle:
          typeof triage?.report_data?.consultation_value_angle === "string"
            ? triage.report_data.consultation_value_angle
            : null,
        schedulingStatus:
          typeof triage?.report_data?.scheduling_status === "string"
            ? triage.report_data.scheduling_status
            : null,
        schedulingReadiness:
          typeof triage?.report_data?.scheduling_readiness === "string"
            ? triage.report_data.scheduling_readiness
            : null,
        closeOpportunityState:
          typeof triage?.report_data?.close_opportunity_state === "string"
            ? triage.report_data.close_opportunity_state
            : null,
        objectionsDetected: Array.isArray(triage?.report_data?.objections_detected)
          ? triage.report_data.objections_detected
          : null,
        hesitationSignals: Array.isArray(triage?.report_data?.hesitation_signals)
          ? triage.report_data.hesitation_signals
          : null,
        valueSignals: Array.isArray(triage?.report_data?.value_signals)
          ? triage.report_data.value_signals
          : null,
        urgencySignals: Array.isArray(triage?.report_data?.urgency_signals)
          ? triage.report_data.urgency_signals
          : null,
        conversionScore:
          typeof triage?.report_data?.conversion_score === "number"
            ? triage.report_data.conversion_score
            : null,
        humanHandoffReady: triage?.report_data?.human_handoff_ready === true
      }
    };

    const conversion = evaluateCommercialConversion(conversionInput);
    const closingInput = {
      pipelineId: link.pipelineId,
      pipelineStage: pipeline?.stage || null,
      consultationReadiness: pipeline?.consultation_readiness || conversion.consultationReadiness,
      consultationRecommendationState:
        pipeline?.consultation_recommendation_state || conversion.consultationRecommendationState,
      consultationSuggestedCopy:
        pipeline?.consultation_suggested_copy || conversion.consultationSuggestedCopy,
      opportunityState: pipeline?.opportunity_state || conversion.opportunityState,
      blockingReason: pipeline?.blocking_reason || conversion.blockingReason,
      objectionState: pipeline?.objection_state || conversion.objectionState,
      waitingOn: pipeline?.waiting_on || null,
      nextStep: pipeline?.next_step || null,
      consultationOfferState: pipeline?.consultation_offer_state || null,
      consultationOfferSentAt: pipeline?.consultation_offer_sent_at || null,
      consultationOfferReason: pipeline?.consultation_offer_reason || null,
      consultationOfferCopy: pipeline?.consultation_offer_copy || null,
      consultationOfferAmount: pipeline?.consultation_offer_amount || null,
      schedulingState: pipeline?.scheduling_state || null,
      schedulingIntent: pipeline?.scheduling_intent || null,
      schedulingSuggestedAt: pipeline?.scheduling_suggested_at || null,
      leadSchedulePreference: pipeline?.lead_schedule_preference || null,
      desiredScheduleWindow: pipeline?.desired_schedule_window || null,
      scheduleConfirmedAt: pipeline?.schedule_confirmed_at || null,
      paymentState: pipeline?.payment_state || null,
      paymentLinkSentAt: pipeline?.payment_link_sent_at || null,
      paymentLinkUrl: pipeline?.payment_link_url || null,
      paymentReference: pipeline?.payment_reference || null,
      paymentPendingAt: pipeline?.payment_pending_at || null,
      paymentApprovedAt: pipeline?.payment_approved_at || null,
      paymentFailedAt: pipeline?.payment_failed_at || null,
      paymentExpiredAt: pipeline?.payment_expired_at || null,
      paymentAbandonedAt: pipeline?.payment_abandoned_at || null,
      consultationConfirmedAt: pipeline?.consultation_confirmed_at || null,
      latestSummary:
        typeof triage?.report_data?.resumo_caso === "string"
          ? triage.report_data.resumo_caso
          : null,
      latestNote: latestNote?.note_body || null
    };
    const closing = evaluateCommercialClosing(closingInput);
    await commercialConversionService.syncPipelineAssessment({
      ...conversionInput,
      pipelineId: link.pipelineId,
      sessionId,
      createEvent: false
    });
    await commercialClosingService.syncPipelineClosingAssessment({
      ...closingInput,
      pipelineId: link.pipelineId,
      sessionId,
      createEvent: false
    });
    const formalization = await commercialAppointmentService.syncFormalConsultation({
      pipelineId: link.pipelineId,
      actorProfileId: pipeline?.owner_profile_id || null,
      sessionId,
      source: "thread_context",
      createEvent: false
    });

    return {
      clientId: link.clientId,
      clientChannelId: link.clientChannelId,
      pipelineId: link.pipelineId,
      ownerProfileId: pipeline?.owner_profile_id || null,
      ownerAssignedAt: pipeline?.owner_assigned_at || null,
      nextStep: pipeline?.next_step || null,
      nextStepDueAt: pipeline?.next_step_due_at || null,
      waitingOn: pipeline?.waiting_on || null,
      followUpState: normalizeFollowUpState(pipeline?.follow_up_state),
      followUpReason: pipeline?.follow_up_reason || null,
      lastCommercialNoteAt: pipeline?.last_commercial_note_at || null,
      latestCommercialNote: latestNote
        ? {
            id: latestNote.id,
            body: latestNote.note_body,
            kind: latestNote.note_kind,
            authorName: latestNote.author_name,
            createdAt: latestNote.created_at
          }
        : null,
      conversion,
      closing,
      closingSnapshot: {
        consultationOfferSentAt: pipeline?.consultation_offer_sent_at || null,
        consultationOfferReason: pipeline?.consultation_offer_reason || null,
        consultationOfferCopy: pipeline?.consultation_offer_copy || null,
        consultationOfferAmount: pipeline?.consultation_offer_amount || null,
        schedulingIntent: pipeline?.scheduling_intent || null,
        schedulingSuggestedAt: pipeline?.scheduling_suggested_at || null,
        leadSchedulePreference: pipeline?.lead_schedule_preference || null,
        desiredScheduleWindow: pipeline?.desired_schedule_window || null,
        scheduleConfirmedAt: pipeline?.schedule_confirmed_at || null,
        paymentLinkSentAt: pipeline?.payment_link_sent_at || null,
        paymentLinkUrl: pipeline?.payment_link_url || null,
        paymentReference: pipeline?.payment_reference || null,
        paymentPendingAt: pipeline?.payment_pending_at || null,
        paymentApprovedAt: pipeline?.payment_approved_at || null,
        paymentFailedAt: pipeline?.payment_failed_at || null,
        paymentExpiredAt: pipeline?.payment_expired_at || null,
        paymentAbandonedAt: pipeline?.payment_abandoned_at || null,
        consultationConfirmedAt:
          formalization?.consultationConfirmedAt || pipeline?.consultation_confirmed_at || null,
        consultationCaseId: formalization?.caseId || pipeline?.consultation_case_id || null,
        consultationAppointmentId:
          formalization?.appointmentId || pipeline?.consultation_appointment_id || null,
        appointmentState:
          formalization?.appointmentState || pipeline?.appointment_state || null,
        consultationPreconfirmedAt:
          formalization?.consultationPreconfirmedAt ||
          pipeline?.consultation_preconfirmed_at ||
          null,
        appointmentCreatedAt:
          (formalization?.appointmentId ? pipeline?.appointment_created_at || new Date().toISOString() : null) ||
          pipeline?.appointment_created_at ||
          null,
        appointmentConfirmedAt:
          formalization?.consultationConfirmedAt ||
          pipeline?.appointment_confirmed_at ||
          null,
        consultationConfirmationSource:
          formalization?.confirmationSource ||
          pipeline?.consultation_confirmation_source ||
          null
      }
    };
  }
}

export const commercialRelationshipService = new CommercialRelationshipService();
