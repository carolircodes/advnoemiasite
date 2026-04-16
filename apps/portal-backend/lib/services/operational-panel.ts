import { createWebhookSupabaseClient } from "../supabase/webhook";
import {
  commercialClosingService,
  evaluateCommercialClosing
} from "./commercial-closing";
import { commercialAppointmentService } from "./commercial-appointment";
import { evaluateCommercialConversion } from "./commercial-conversion";
import { createAdminSupabaseClient } from "../supabase/admin";
import { getCommercialAutomationPlans, type CommercialAutomationPlan } from "./commercial-automation";
import { followUpEngine } from "./follow-up-engine";
import {
  getGrowthContextByItems,
  type GrowthContextByItem
} from "./growth-item-context";
import {
  evaluateOperationalPriority,
  type OperationalAttentionBucket,
  type OperationalNextBestAction
} from "./operational-priority";
import { projectPanelConversationState } from "./panel-state-projection";

export interface OperationalContact {
  clientId: string;
  pipelineId: string;
  sessionId?: string;
  clientChannelId?: string;
  fullName: string;
  phone?: string;
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  areaInterest?: string;
  sourceChannel: string;
  followUpStatus?: string;
  nextFollowUpAt?: string;
  lastContactAt: string;
  latestSessionSummary?: string;
  latestMessagePreview?: string;
  latestCommercialNote?: string;
  latestCommercialNoteAt?: string;
  waitingOn?: string;
  followUpState?: string;
  followUpReason?: string;
  nextStep?: string;
  nextStepDueAt?: string;
  threadStatus?: string;
  threadWaitingFor?: string;
  ownerProfileId?: string;
  ownerName?: string;
  ownerAssignedAt?: string;
  consultationReadiness: string;
  conversionStage: string;
  recommendedAction: string;
  recommendedActionLabel: string;
  recommendedActionDetail: string;
  conversionSignal: string;
  blockingReason?: string | null;
  objectionState: string;
  objectionHint?: string | null;
  opportunityState: string;
  consultationRecommendationState: string;
  consultationRecommendationReason?: string | null;
  consultationSuggestedCopy?: string | null;
  recommendedFollowUpWindow?: string | null;
  consultationOfferState: string;
  consultationOfferSentAt?: string | null;
  consultationOfferReason?: string | null;
  consultationOfferCopy?: string | null;
  consultationOfferAmount?: number | null;
  schedulingState: string;
  schedulingIntent?: string | null;
  schedulingSuggestedAt?: string | null;
  leadSchedulePreference?: string | null;
  desiredScheduleWindow?: string | null;
  scheduleConfirmedAt?: string | null;
  paymentState: string;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
  paymentReference?: string | null;
  paymentPendingAt?: string | null;
  paymentApprovedAt?: string | null;
  paymentFailedAt?: string | null;
  paymentExpiredAt?: string | null;
  paymentAbandonedAt?: string | null;
  consultationConfirmedAt?: string | null;
  consultationCaseId?: string | null;
  consultationAppointmentId?: string | null;
  appointmentState: string;
  consultationPreconfirmedAt?: string | null;
  appointmentCreatedAt?: string | null;
  appointmentConfirmedAt?: string | null;
  consultationConfirmationSource?: string | null;
  closingState: string;
  closingBlockReason?: string | null;
  closingSignal: string;
  closingNextStep: string;
  closingRecommendedAction: string;
  closingRecommendedActionLabel: string;
  closingRecommendedActionDetail: string;
  closingCopySuggestion?: string | null;
  advancementReason: string;
  channels: Array<{
    channel: string;
    externalUserId: string;
    displayName?: string | null;
    lastContactAt: string;
  }>;
  followUpCount: number;
  priorityScore: number;
  priorityLabel: "high" | "medium" | "low";
  priorityReasons: string[];
  attentionBucket: OperationalAttentionBucket;
  nextBestAction: OperationalNextBestAction;
  growthContext: GrowthContextByItem | null;
  automationPlan: CommercialAutomationPlan | null;
  conversationState: {
    conversationStatus?: string | null;
    triageStage?: string | null;
    explanationStage?: string | null;
    consultationStage?: string | null;
    executiveFunnelStage?: string | null;
    funnelMomentum?: string | null;
    leadTemperature?: string | null;
    priorityLevel?: string | null;
    conversionScore?: number | null;
    nextBestAction?: string | null;
    nextBestActionDetail?: string | null;
    handoffReason?: string | null;
    readyForLawyer: boolean;
    aiActiveOnChannel: boolean;
    operationalHandoffRecorded: boolean;
    lawyerNotificationGenerated: boolean;
    humanFollowUpPending: boolean;
    followUpReady: boolean;
    schedulingPreferences?: {
      channel?: string;
      period?: string;
      urgency?: string;
      availability?: string;
    } | null;
    reportSummary?: string | null;
    entrySource?: string | null;
    entryType?: string | null;
    entryPoint?: string | null;
    discoveryMechanism?: string | null;
    sourceLabel?: string | null;
    campaignLabel?: string | null;
    topicLabel?: string | null;
    contentLabel?: string | null;
    contentType?: string | null;
    commercialContext?: string | null;
    intentSignal?: string | null;
    commercialFunnelStage?: string | null;
    commercialStageLabel?: string | null;
    consultationIntentLevel?: string | null;
    consultationInviteTiming?: string | null;
    consultationInviteState?: string | null;
    consultationInviteCopy?: string | null;
    consultationValueAngle?: string | null;
    schedulingReadiness?: string | null;
    schedulingStatus?: string | null;
    humanHandoffMode?: string | null;
    humanHandoffReady?: boolean;
    commercialFollowUpType?: string | null;
    operatorPriority?: string | null;
    closeOpportunityState?: string | null;
    objectionsDetected?: string[] | null;
    hesitationSignals?: string[] | null;
    valueSignals?: string[] | null;
    urgencySignals?: string[] | null;
    recommendedOperatorAction?: string | null;
    directTransitionStatus?: string | null;
    publicCommentDecision?: string | null;
    publicCommentSafety?: string | null;
    publicBrevityRule?: string | null;
  } | null;
  daysSinceLastContact: number;
  isOverdue: boolean;
  suggestedMessage?: {
    messageType: string;
    content: string;
    channel: string;
  };
}

export interface OperationalPanelFilters {
  clientId?: string;
  stage?: string;
  leadTemperature?: string;
  areaInterest?: string;
  sourceChannel?: string;
  priorityLabel?: "high" | "medium" | "low";
  followUpStatus?: string;
  isClient?: boolean;
  search?: string;
}

export interface OperationalPanelMetrics {
  totalLeads: number;
  warmHotLeads: number;
  activeConversations: number;
  consultationIntent: number;
  consultationReady: number;
  humanHandoffReady: number;
  followUpPending: number;
  consultationOffered: number;
  consultationScheduled: number;
  proposalSent: number;
  contractPending: number;
  totalClients: number;
  inactiveLost: number;
  todayOverdue: number;
  overdueCount: number;
  topPriorities: number;
}

export interface OperationalAction {
  clientId: string;
  pipelineId: string;
  sessionId?: string;
  action:
    | "update_stage"
    | "update_temperature"
    | "mark_consultation_offered"
    | "mark_consultation_scheduled"
    | "mark_proposal_sent"
    | "mark_contract_pending"
    | "mark_client"
    | "mark_lost"
    | "mark_inactive"
    | "mark_ready_for_consultation"
    | "mark_waiting_client"
    | "mark_hot_opportunity"
    | "mark_reactivatable"
    | "register_objection"
    | "register_block"
    | "refresh_conversion_state"
    | "propose_consultation"
    | "register_schedule"
    | "mark_waiting_team"
    | "register_payment_pending"
    | "register_payment_approved"
    | "materialize_appointment"
    | "confirm_consultation"
    | "mark_closing_lost";
  value?: string;
  notes?: string;
  payload?: Record<string, unknown>;
}

function getSinglePipeline(
  pipeline: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined
): Record<string, unknown> {
  if (Array.isArray(pipeline)) {
    return (pipeline[0] as Record<string, unknown> | undefined) || {};
  }

  return (pipeline as Record<string, unknown> | null) || {};
}

class OperationalPanel {
  private supabase = createWebhookSupabaseClient();
  private adminSupabase = createAdminSupabaseClient();

  async getOperationalContacts(
    filters: OperationalPanelFilters = {},
    limit = 50,
    offset = 0
  ): Promise<{ contacts: OperationalContact[]; total: number }> {
    console.log("FOLLOW_UP_PANEL_LIST_START", { filters, limit, offset });

    try {
      let query = this.supabase
        .from("clients")
        .select(
          `
          id,
          profile_id,
          source_intake_request_id,
          full_name,
          phone,
          is_client,
          merge_status,
          created_at,
          client_pipeline!inner (
            id,
            stage,
            lead_temperature,
            source_channel,
            area_interest,
            follow_up_status,
            follow_up_state,
            follow_up_reason,
            next_follow_up_at,
            last_contact_at,
            tags,
            notes,
            summary,
            owner_profile_id,
            owner_assigned_at,
            next_step,
            next_step_due_at,
            waiting_on,
            consultation_readiness,
            conversion_stage,
            recommended_action,
            recommended_action_detail,
            conversion_signal,
            blocking_reason,
            objection_state,
            objection_hint,
            opportunity_state,
            consultation_recommendation_state,
            consultation_recommendation_reason,
            consultation_suggested_copy,
            recommended_follow_up_window,
            advancement_reason,
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
            consultation_case_id,
            consultation_appointment_id,
            appointment_state,
            consultation_preconfirmed_at,
            appointment_created_at,
            appointment_confirmed_at,
            consultation_confirmation_source,
            closing_state,
            closing_block_reason,
            closing_signal,
            closing_next_step,
            closing_recommended_action,
            closing_recommended_action_detail,
            closing_copy_suggestion,
            last_closing_signal_at,
            last_thread_session_id,
            last_commercial_note_at
          ),
          client_channels (
            id,
            channel,
            external_user_id,
            display_name,
            last_contact_at
          ),
          conversation_sessions (
            id,
            client_channel_id,
            channel,
            external_user_id,
            thread_status,
            waiting_for,
            owner_user_id,
            lead_stage,
            case_area,
            current_intent,
            last_summary,
            last_message_at,
            last_message_preview,
            follow_up_status,
            follow_up_due_at,
            next_action_hint,
            updated_at,
            created_at
          ),
          follow_up_messages (
            id,
            message_type,
            status,
            content,
            scheduled_for,
            created_at
          )
        `,
          { count: "exact" }
        )
        .eq("merge_status", "active");

      if (filters.stage) {
        query = query.eq("client_pipeline.stage", filters.stage);
      }
      if (filters.leadTemperature) {
        query = query.eq("client_pipeline.lead_temperature", filters.leadTemperature);
      }
      if (filters.areaInterest) {
        query = query.contains("client_pipeline.tags", [filters.areaInterest]);
      }
      if (filters.sourceChannel) {
        query = query.eq("client_pipeline.source_channel", filters.sourceChannel);
      }
      if (filters.isClient !== undefined) {
        query = query.eq("is_client", filters.isClient);
      }
      if (filters.followUpStatus) {
        query = query.eq("client_pipeline.follow_up_status", filters.followUpStatus);
      }
      if (filters.clientId) {
        query = query.eq("id", filters.clientId);
      }
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,id.eq.${filters.search}`
        );
      }

      query = query
        .order("last_contact_at", {
          ascending: false,
          foreignTable: "client_pipeline"
        })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("FOLLOW_UP_PANEL_LIST_ERROR", error);
        return { contacts: [], total: 0 };
      }

      if (!data || data.length === 0) {
        console.log("FOLLOW_UP_PANEL_LIST_EMPTY");
        return { contacts: [], total: 0 };
      }

      const growthContextByClient = await getGrowthContextByItems(
        data.map((client) => ({
          clientId: client.id,
          profileId: client.profile_id,
          sourceIntakeRequestId: client.source_intake_request_id
        }))
      );
      const triageSummaryBySessionId = await this.getTriageSummaryBySessionId(
        data
          .flatMap((client) => client.conversation_sessions || [])
          .map((session: { id?: string }) => session?.id)
          .filter((value: string | undefined): value is string => Boolean(value))
      );
      const ownerIds = Array.from(
        new Set(
          data.flatMap((client) => {
            const ids: string[] = [];
            const pipeline = getSinglePipeline(client.client_pipeline);
            if (typeof pipeline.owner_profile_id === "string") {
              ids.push(pipeline.owner_profile_id);
            }
            for (const session of client.conversation_sessions || []) {
              if (session?.owner_user_id) {
                ids.push(session.owner_user_id);
              }
            }
            return ids;
          })
        )
      );
      const ownerProfilesById = new Map<string, { full_name: string | null }>();
      if (ownerIds.length) {
        const { data: ownerProfiles } = await this.adminSupabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);

        (ownerProfiles || []).forEach((profile) => {
          ownerProfilesById.set(profile.id, { full_name: profile.full_name });
        });
      }

      const contacts: OperationalContact[] = [];

      for (const client of data) {
        const operationalContact = await this.processOperationalContact(
          client,
          growthContextByClient.get(client.id) || null,
          triageSummaryBySessionId,
          ownerProfilesById
        );
        contacts.push(operationalContact);
      }

      const automationPlans = await getCommercialAutomationPlans(
        contacts.map((contact) => ({
          clientId: contact.clientId,
          pipelineId: contact.pipelineId,
          isClient: contact.isClient,
          pipelineStage: contact.pipelineStage,
          leadTemperature: contact.leadTemperature,
          sourceChannel: contact.sourceChannel,
          attentionBucket: contact.attentionBucket,
          priorityLabel: contact.priorityLabel,
          daysSinceLastContact: contact.daysSinceLastContact,
          consultationReadiness: contact.consultationReadiness,
          recommendedAction: contact.recommendedAction,
          opportunityState: contact.opportunityState,
          blockingReason: contact.blockingReason,
          consultationRecommendationState: contact.consultationRecommendationState,
          channels: contact.channels,
          growthContext: contact.growthContext
        }))
      );

      const enrichedContacts = contacts.map((contact) => ({
        ...contact,
        automationPlan: automationPlans.get(contact.clientId) || null
      }));

      let filteredContacts = enrichedContacts;
      if (filters.priorityLabel) {
        filteredContacts = enrichedContacts.filter(
          (contact) => contact.priorityLabel === filters.priorityLabel
        );
      }

      filteredContacts.sort((left, right) => {
        if (left.priorityScore !== right.priorityScore) {
          return right.priorityScore - left.priorityScore;
        }

        return right.daysSinceLastContact - left.daysSinceLastContact;
      });

      console.log("FOLLOW_UP_PANEL_LIST_SUCCESS", {
        total: count || 0,
        filtered: filteredContacts.length,
        priorities: filteredContacts.map((contact) => ({
          id: contact.clientId,
          priority: contact.priorityLabel,
          score: contact.priorityScore
        }))
      });

      return { contacts: filteredContacts, total: count || 0 };
    } catch (error) {
      console.error("FOLLOW_UP_PANEL_LIST_ERROR", error);
      return { contacts: [], total: 0 };
    }
  }

  private async processOperationalContact(
    client: any,
    growthContext: GrowthContextByItem | null,
    triageSummaryBySessionId: Map<string, any>,
    ownerProfilesById: Map<string, { full_name: string | null }>
  ): Promise<OperationalContact> {
    const pipeline = getSinglePipeline(client.client_pipeline) as any;
    const channels = client.client_channels || [];
    const sessions = [...(client.conversation_sessions || [])].sort((left: any, right: any) => {
      const leftTime = left?.last_message_at || left?.updated_at || left?.created_at || "";
      const rightTime = right?.last_message_at || right?.updated_at || right?.created_at || "";
      return String(rightTime).localeCompare(String(leftTime));
    });
    const followUps = client.follow_up_messages || [];

    const now = new Date();
    const lastContact = pipeline.last_contact_at ? new Date(pipeline.last_contact_at) : now;
    const daysSinceLastContact = Math.max(
      0,
      Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    );
    const isOverdue = pipeline.next_follow_up_at
      ? new Date(pipeline.next_follow_up_at) < now
      : false;

    const priority = this.calculateOperationalPriority({
      isClient: client.is_client,
      pipelineStage: pipeline.stage,
      leadTemperature: pipeline.lead_temperature,
      sourceChannel: pipeline.source_channel,
      areaInterest: pipeline.area_interest,
      followUpStatus: pipeline.follow_up_status,
      nextFollowUpAt: pipeline.next_follow_up_at,
      daysSinceLastContact,
      isOverdue,
      followUpCount: followUps.length,
      growthContext
    });

    const latestSession = sessions[0];
    const latestTriageSummary = latestSession?.id
      ? triageSummaryBySessionId.get(latestSession.id) || null
      : null;
    const latestMessagePreview = latestSession
      ? this.getMessagePreview(latestSession.last_summary)
      : "";

    let suggestedMessage;
    const conversion = evaluateCommercialConversion({
      pipelineId: pipeline.id,
      pipelineStage: pipeline.stage,
      leadTemperature: pipeline.lead_temperature,
      followUpStatus: pipeline.follow_up_status,
      followUpState: pipeline.follow_up_state,
      followUpReason: pipeline.follow_up_reason,
      waitingOn: pipeline.waiting_on,
      nextStep: pipeline.next_step || latestSession?.next_action_hint || null,
      nextStepDueAt: pipeline.next_step_due_at || pipeline.next_follow_up_at || null,
      notes: pipeline.notes || null,
      lastContactAt: pipeline.last_contact_at,
      ownerProfileId: pipeline.owner_profile_id || latestSession?.owner_user_id || null,
      latestSummary: latestSession?.last_summary || latestSession?.last_message_preview || null,
      latestNote: pipeline.notes || null,
      pendingDocumentsCount: growthContext?.pendingDocumentsCount || 0,
      conversationState: latestTriageSummary
        ? projectPanelConversationState(latestTriageSummary)
        : null
    });
    const closing = evaluateCommercialClosing({
      pipelineId: pipeline.id,
      pipelineStage: pipeline.stage,
      consultationReadiness: pipeline.consultation_readiness || conversion.consultationReadiness,
      consultationRecommendationState:
        pipeline.consultation_recommendation_state || conversion.consultationRecommendationState,
      consultationSuggestedCopy:
        pipeline.consultation_suggested_copy || conversion.consultationSuggestedCopy,
      opportunityState: pipeline.opportunity_state || conversion.opportunityState,
      blockingReason: pipeline.blocking_reason || conversion.blockingReason,
      objectionState: pipeline.objection_state || conversion.objectionState,
      waitingOn: pipeline.waiting_on,
      nextStep: pipeline.next_step || latestSession?.next_action_hint || null,
      consultationOfferState: pipeline.consultation_offer_state,
      consultationOfferSentAt: pipeline.consultation_offer_sent_at,
      consultationOfferReason: pipeline.consultation_offer_reason,
      consultationOfferCopy: pipeline.consultation_offer_copy,
      consultationOfferAmount: pipeline.consultation_offer_amount,
      schedulingState: pipeline.scheduling_state,
      schedulingIntent: pipeline.scheduling_intent,
      schedulingSuggestedAt: pipeline.scheduling_suggested_at,
      leadSchedulePreference: pipeline.lead_schedule_preference,
      desiredScheduleWindow: pipeline.desired_schedule_window,
      scheduleConfirmedAt: pipeline.schedule_confirmed_at,
      paymentState: pipeline.payment_state,
      paymentLinkSentAt: pipeline.payment_link_sent_at,
      paymentLinkUrl: pipeline.payment_link_url,
      paymentReference: pipeline.payment_reference,
      paymentPendingAt: pipeline.payment_pending_at,
      paymentApprovedAt: pipeline.payment_approved_at,
      paymentFailedAt: pipeline.payment_failed_at,
      paymentExpiredAt: pipeline.payment_expired_at,
      paymentAbandonedAt: pipeline.payment_abandoned_at,
      consultationConfirmedAt: pipeline.consultation_confirmed_at,
      latestSummary: latestSession?.last_summary || latestSession?.last_message_preview || null,
      latestNote: pipeline.notes || null
    });

    if (
      priority.label !== "low" ||
      conversion.consultationRecommendationState === "recommend_now" ||
      closing.shouldOverrideCommercialAction
    ) {
      suggestedMessage = await this.prepareSuggestedMessage(
        client.id,
        pipeline.id,
        pipeline.source_channel
      );
    }

    return {
      clientId: client.id,
      pipelineId: pipeline.id,
      sessionId: latestSession?.id,
      clientChannelId: latestSession?.client_channel_id || undefined,
      fullName: client.full_name || "",
      phone: client.phone,
      isClient: client.is_client,
      pipelineStage: pipeline.stage,
      leadTemperature: pipeline.lead_temperature,
      areaInterest: pipeline.area_interest,
      sourceChannel: pipeline.source_channel,
      followUpStatus: pipeline.follow_up_status,
      nextFollowUpAt: pipeline.next_follow_up_at,
      lastContactAt: pipeline.last_contact_at,
      latestSessionSummary: latestSession?.last_summary,
      latestMessagePreview: latestSession?.last_message_preview || latestMessagePreview,
      latestCommercialNote: pipeline.notes || undefined,
      latestCommercialNoteAt: pipeline.last_commercial_note_at || undefined,
      waitingOn: pipeline.waiting_on || undefined,
      followUpState: pipeline.follow_up_state || undefined,
      followUpReason: pipeline.follow_up_reason || undefined,
      nextStep: pipeline.next_step || latestSession?.next_action_hint || undefined,
      nextStepDueAt: pipeline.next_step_due_at || pipeline.next_follow_up_at || undefined,
      threadStatus: latestSession?.thread_status || undefined,
      threadWaitingFor: latestSession?.waiting_for || undefined,
      ownerProfileId: pipeline.owner_profile_id || latestSession?.owner_user_id || undefined,
      ownerName:
        (pipeline.owner_profile_id
          ? ownerProfilesById.get(pipeline.owner_profile_id)?.full_name
          : latestSession?.owner_user_id
            ? ownerProfilesById.get(latestSession.owner_user_id)?.full_name
            : null) || undefined,
      ownerAssignedAt: pipeline.owner_assigned_at || undefined,
      consultationReadiness: pipeline.consultation_readiness || conversion.consultationReadiness,
      conversionStage: pipeline.conversion_stage || conversion.conversionStage,
      recommendedAction: pipeline.recommended_action || conversion.recommendedAction,
      recommendedActionLabel: conversion.recommendedActionLabel,
      recommendedActionDetail:
        pipeline.recommended_action_detail || conversion.recommendedActionDetail,
      conversionSignal: pipeline.conversion_signal || conversion.conversionSignal,
      blockingReason: pipeline.blocking_reason || conversion.blockingReason,
      objectionState: pipeline.objection_state || conversion.objectionState,
      objectionHint: pipeline.objection_hint || conversion.objectionHint,
      opportunityState: pipeline.opportunity_state || conversion.opportunityState,
      consultationRecommendationState:
        pipeline.consultation_recommendation_state || conversion.consultationRecommendationState,
      consultationRecommendationReason:
        pipeline.consultation_recommendation_reason || conversion.consultationRecommendationReason || undefined,
      consultationSuggestedCopy:
        pipeline.consultation_suggested_copy || conversion.consultationSuggestedCopy || undefined,
      recommendedFollowUpWindow:
        pipeline.recommended_follow_up_window || conversion.recommendedFollowUpWindow || undefined,
      consultationOfferState: pipeline.consultation_offer_state || closing.consultationOfferState,
      consultationOfferSentAt: pipeline.consultation_offer_sent_at || undefined,
      consultationOfferReason: pipeline.consultation_offer_reason || undefined,
      consultationOfferCopy: pipeline.consultation_offer_copy || undefined,
      consultationOfferAmount:
        typeof pipeline.consultation_offer_amount === "number"
          ? pipeline.consultation_offer_amount
          : undefined,
      schedulingState: pipeline.scheduling_state || closing.schedulingState,
      schedulingIntent: pipeline.scheduling_intent || undefined,
      schedulingSuggestedAt: pipeline.scheduling_suggested_at || undefined,
      leadSchedulePreference: pipeline.lead_schedule_preference || undefined,
      desiredScheduleWindow: pipeline.desired_schedule_window || undefined,
      scheduleConfirmedAt: pipeline.schedule_confirmed_at || undefined,
      paymentState: pipeline.payment_state || closing.paymentState,
      paymentLinkSentAt: pipeline.payment_link_sent_at || undefined,
      paymentLinkUrl: pipeline.payment_link_url || undefined,
      paymentReference: pipeline.payment_reference || undefined,
      paymentPendingAt: pipeline.payment_pending_at || undefined,
      paymentApprovedAt: pipeline.payment_approved_at || undefined,
      paymentFailedAt: pipeline.payment_failed_at || undefined,
      paymentExpiredAt: pipeline.payment_expired_at || undefined,
      paymentAbandonedAt: pipeline.payment_abandoned_at || undefined,
      consultationConfirmedAt: pipeline.consultation_confirmed_at || undefined,
      consultationCaseId: pipeline.consultation_case_id || undefined,
      consultationAppointmentId: pipeline.consultation_appointment_id || undefined,
      appointmentState: pipeline.appointment_state || "not_created",
      consultationPreconfirmedAt: pipeline.consultation_preconfirmed_at || undefined,
      appointmentCreatedAt: pipeline.appointment_created_at || undefined,
      appointmentConfirmedAt: pipeline.appointment_confirmed_at || undefined,
      consultationConfirmationSource: pipeline.consultation_confirmation_source || undefined,
      closingState: pipeline.closing_state || closing.closingState,
      closingBlockReason: pipeline.closing_block_reason || closing.closingBlockReason,
      closingSignal: pipeline.closing_signal || closing.closingSignal,
      closingNextStep: pipeline.closing_next_step || closing.closingNextStep,
      closingRecommendedAction:
        pipeline.closing_recommended_action || closing.closingRecommendedAction,
      closingRecommendedActionLabel: closing.closingRecommendedActionLabel,
      closingRecommendedActionDetail:
        pipeline.closing_recommended_action_detail || closing.closingRecommendedActionDetail,
      closingCopySuggestion:
        pipeline.closing_copy_suggestion || closing.closingCopySuggestion || undefined,
      advancementReason: pipeline.advancement_reason || conversion.advancementReason,
      channels: channels.map((channel: any) => ({
        channel: channel.channel,
        externalUserId: channel.external_user_id,
        displayName: channel.display_name || null,
        lastContactAt: channel.last_contact_at
      })),
      followUpCount: followUps.length,
      priorityScore: priority.score,
      priorityLabel: priority.label,
      priorityReasons: priority.reasons,
      attentionBucket: priority.attentionBucket,
      nextBestAction: priority.nextBestAction,
      growthContext,
      automationPlan: null,
      conversationState: latestTriageSummary
        ? projectPanelConversationState(latestTriageSummary)
        : null,
      daysSinceLastContact,
      isOverdue,
      suggestedMessage
    };
  }

  private async getTriageSummaryBySessionId(sessionIds: string[]) {
    if (sessionIds.length === 0) {
      return new Map<string, any>();
    }

    let data: any[] | null = null;
    let error: any = null;

    const primaryResult = await this.supabase
      .from("noemia_triage_summaries")
      .select(
        "session_id, conversation_status, consultation_stage, handoff_reason, user_friendly_summary, triage_data, report_data"
        + ", explanation_stage, lawyer_notification_generated, ai_active_on_channel, operational_handoff_recorded, human_followup_pending, follow_up_ready"
      )
      .in("session_id", sessionIds);

    data = primaryResult.data;
    error = primaryResult.error;

    if (error && String((error as { message?: unknown }).message || "").includes("column")) {
      const legacyResult = await this.supabase
        .from("noemia_triage_summaries")
        .select("session_id, handoff_reason, user_friendly_summary, triage_data")
        .in("session_id", sessionIds);

      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      console.error("FOLLOW_UP_PANEL_TRIAGE_SUMMARY_ERROR", error);
      return new Map<string, any>();
    }

    return new Map((data || []).map((item) => [item.session_id, item]));
  }

  private calculateOperationalPriority(input: {
    isClient: boolean;
    pipelineStage: string;
    leadTemperature: string;
    sourceChannel: string;
    areaInterest?: string;
    followUpStatus?: string;
    nextFollowUpAt?: string;
    daysSinceLastContact: number;
    isOverdue: boolean;
    followUpCount: number;
    growthContext?: GrowthContextByItem | null;
  }) {
    const priority = evaluateOperationalPriority(input);

    console.log("FOLLOW_UP_PRIORITY_CALCULATED", {
      stage: input.pipelineStage,
      temperature: input.leadTemperature,
      score: priority.score,
      label: priority.label,
      attentionBucket: priority.attentionBucket,
      daysSinceLastContact: input.daysSinceLastContact,
      isOverdue: input.isOverdue
    });

    return priority;
  }

  private async prepareSuggestedMessage(
    clientId: string,
    pipelineId: string,
    channel: string
  ): Promise<{ messageType: string; content: string; channel: string } | undefined> {
    try {
      const message = await followUpEngine.generateFollowUpMessageForClient({
        clientId,
        pipelineId,
        channel: channel as any
      });

      if (message) {
        return {
          messageType: message.messageType,
          content: message.content,
          channel: message.channel
        };
      }
    } catch (error) {
      console.error("FOLLOW_UP_MESSAGE_PREPARE_ERROR", error);
    }

    return undefined;
  }

  async applyOperationalAction(action: OperationalAction): Promise<boolean> {
    console.log("FOLLOW_UP_ACTION_APPLIED", action);

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      const payload = action.payload || {};
      const now = new Date().toISOString();

      switch (action.action) {
        case "update_stage":
          updateData.stage = action.value;
          break;
        case "update_temperature":
          updateData.lead_temperature = action.value;
          break;
        case "mark_consultation_offered":
          updateData.stage = "consultation_offered";
          updateData.follow_up_status = "pending";
          updateData.consultation_offer_state = "offered";
          updateData.consultation_offer_sent_at = now;
          updateData.closing_state = "proposal_sent";
          break;
        case "mark_consultation_scheduled":
          updateData.stage = "consultation_scheduled";
          updateData.follow_up_status = "completed";
          updateData.scheduling_state = "confirmed";
          updateData.schedule_confirmed_at = now;
          updateData.consultation_scheduled_at = now;
          updateData.closing_state = "scheduling_in_progress";
          break;
        case "mark_proposal_sent":
          updateData.stage = "proposal_sent";
          updateData.follow_up_status = "pending";
          updateData.consultation_offer_state = "offered";
          updateData.consultation_offer_sent_at = now;
          updateData.closing_state = "proposal_sent";
          break;
        case "mark_contract_pending":
          updateData.stage = "contract_pending";
          updateData.follow_up_status = "pending";
          break;
        case "mark_ready_for_consultation":
          updateData.stage = "qualified_for_consultation";
          updateData.consultation_readiness = "ready_for_consultation";
          updateData.conversion_stage = "consultation_ready";
          updateData.consultation_recommendation_state = "recommend_now";
          updateData.opportunity_state = "hot";
          updateData.recommended_action = "offer_consultation";
          updateData.consultation_offer_state = "recommended";
          updateData.closing_state = "consultation_recommended";
          break;
        case "mark_waiting_client":
          updateData.follow_up_status = "pending";
          updateData.follow_up_state = "waiting_client";
          updateData.waiting_on = "client";
          updateData.recommended_action = "mark_waiting_client";
          break;
        case "mark_hot_opportunity":
          updateData.lead_temperature = "hot";
          updateData.opportunity_state = "hot";
          updateData.recommended_action = "mark_hot_opportunity";
          break;
        case "mark_reactivatable":
          updateData.stage = "reactivation_queue";
          updateData.conversion_stage = "reactivable";
          updateData.consultation_readiness = "blocked_by_silence";
          updateData.blocking_reason = "lead_silent";
          updateData.recommended_action = "reactivate_lead";
          break;
        case "register_objection":
          updateData.objection_state = action.value || "insecurity";
          updateData.blocking_reason =
            action.value === "value"
              ? "objection_value"
              : action.value === "viability"
                ? "objection_viability"
                : "objection_insecurity";
          updateData.consultation_readiness = "blocked_by_objection";
          updateData.recommended_action = "register_objection";
          break;
        case "register_block":
          updateData.blocking_reason = action.value || "missing_context";
          updateData.consultation_readiness =
            action.value === "missing_documents"
              ? "blocked_by_missing_context"
              : action.value === "lead_silent"
                ? "blocked_by_silence"
                : "clarifying";
          updateData.recommended_action =
            action.value === "missing_documents"
              ? "request_documents"
              : action.value === "lead_silent"
                ? "reactivate_lead"
                : "request_additional_information";
          break;
        case "refresh_conversion_state":
          break;
        case "propose_consultation":
          updateData.stage = "consultation_offered";
          updateData.consultation_offer_state = "offered";
          updateData.consultation_offer_sent_at = now;
          updateData.consultation_offer_reason =
            typeof payload.reason === "string" ? payload.reason : action.notes || null;
          updateData.consultation_offer_copy =
            typeof payload.copy === "string" ? payload.copy : null;
          updateData.consultation_offer_amount =
            typeof payload.amount === "number" ? payload.amount : null;
          updateData.proposal_sent_at = now;
          updateData.follow_up_status = "pending";
          updateData.follow_up_state = "waiting_client";
          updateData.waiting_on = "client";
          updateData.closing_state = "proposal_sent";
          updateData.closing_next_step =
            typeof payload.nextStep === "string"
              ? payload.nextStep
              : "Aguardar retorno do lead sobre a proposta de consulta.";
          break;
        case "register_schedule":
          updateData.consultation_offer_state = "awaiting_schedule";
          updateData.scheduling_state =
            payload.confirmedAt
              ? "confirmed"
              : payload.suggestedAt
                ? "slot_suggested"
                : "collecting_availability";
          updateData.scheduling_intent =
            typeof payload.intent === "string" ? payload.intent : null;
          updateData.lead_schedule_preference =
            typeof payload.preference === "string" ? payload.preference : null;
          updateData.desired_schedule_window =
            typeof payload.window === "string" ? payload.window : null;
          updateData.scheduling_suggested_at =
            typeof payload.suggestedAt === "string" && payload.suggestedAt.trim()
              ? payload.suggestedAt
              : null;
          updateData.schedule_confirmed_at =
            typeof payload.confirmedAt === "string" && payload.confirmedAt.trim()
              ? payload.confirmedAt
              : null;
          updateData.waiting_on = payload.confirmedAt ? "team" : "client";
          updateData.follow_up_state = payload.confirmedAt ? "waiting_team" : "waiting_client";
          updateData.follow_up_status = "pending";
          updateData.closing_state = "scheduling_in_progress";
          updateData.next_step =
            typeof payload.nextStep === "string"
              ? payload.nextStep
              : payload.confirmedAt
                ? "Confirmar horario internamente e preparar pagamento."
                : "Aguardar confirmacao do horario sugerido.";
          break;
        case "mark_waiting_team":
          updateData.waiting_on = "team";
          updateData.follow_up_state = "waiting_team";
          updateData.follow_up_status = "pending";
          updateData.closing_block_reason = "waiting_office";
          break;
        case "register_payment_pending":
          updateData.payment_state =
            typeof payload.paymentState === "string" ? payload.paymentState : "pending";
          updateData.payment_link_sent_at = now;
          updateData.payment_pending_at = now;
          updateData.payment_link_url =
            typeof payload.paymentUrl === "string" ? payload.paymentUrl : null;
          updateData.payment_reference =
            typeof payload.paymentReference === "string" ? payload.paymentReference : null;
          updateData.follow_up_status = "pending";
          updateData.follow_up_state = "waiting_client";
          updateData.waiting_on = "client";
          updateData.closing_state = "payment_in_progress";
          break;
        case "register_payment_approved":
          updateData.payment_state = "approved";
          updateData.payment_approved_at = now;
          updateData.closing_state = "payment_in_progress";
          updateData.follow_up_status = "resolved";
          break;
        case "materialize_appointment":
          break;
        case "confirm_consultation":
          updateData.stage = "consultation_scheduled";
          updateData.payment_state = "approved";
          updateData.payment_approved_at = now;
          updateData.scheduling_state = "confirmed";
          updateData.schedule_confirmed_at = now;
          updateData.consultation_confirmed_at = now;
          updateData.consultation_scheduled_at = now;
          updateData.consultation_offer_state = "confirmed";
          updateData.follow_up_status = "completed";
          updateData.follow_up_state = "completed";
          updateData.waiting_on = "none";
          updateData.closing_state = "consultation_confirmed";
          break;
        case "mark_closing_lost":
          updateData.stage = "closed_lost";
          updateData.closed_lost_at = now;
          updateData.consultation_offer_state = "lost";
          updateData.closing_state = "lost";
          updateData.follow_up_status = "completed";
          updateData.follow_up_state = "completed";
          break;
        case "mark_client":
          await this.supabase
            .from("clients")
            .update({ is_client: true })
            .eq("id", action.clientId);
          break;
        case "mark_lost":
          updateData.stage = "closed_lost";
          updateData.follow_up_status = "completed";
          break;
        case "mark_inactive":
          updateData.stage = "inactive";
          updateData.follow_up_status = "completed";
          break;
      }

      if (action.notes) {
        updateData.notes = action.notes;
        updateData.advancement_reason = action.notes;
      }

      const { error } = await this.supabase
        .from("client_pipeline")
        .update(updateData)
        .eq("id", action.pipelineId)
        .eq("client_id", action.clientId);

      if (error) {
        console.error("FOLLOW_UP_ACTION_ERROR", error);
        return false;
      }

      console.log("PIPELINE_MANUAL_UPDATE_APPLIED", {
        clientId: action.clientId,
        pipelineId: action.pipelineId,
        action: action.action,
        value: action.value
      });

      const { data: refreshedPipeline } = await this.supabase
        .from("client_pipeline")
        .select(
          `
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
          consultation_case_id,
          consultation_appointment_id,
          appointment_state,
          consultation_preconfirmed_at,
          appointment_created_at,
          appointment_confirmed_at,
          consultation_confirmation_source,
          notes
        `
        )
        .eq("id", action.pipelineId)
        .maybeSingle();

      if (refreshedPipeline?.id) {
        await commercialClosingService.syncPipelineClosingAssessment({
          pipelineId: refreshedPipeline.id,
          sessionId: action.sessionId,
          createEvent: true,
          pipelineStage: refreshedPipeline.stage,
          consultationReadiness: refreshedPipeline.consultation_readiness,
          consultationRecommendationState: refreshedPipeline.consultation_recommendation_state,
          consultationSuggestedCopy: refreshedPipeline.consultation_suggested_copy,
          opportunityState: refreshedPipeline.opportunity_state,
          blockingReason: refreshedPipeline.blocking_reason,
          objectionState: refreshedPipeline.objection_state,
          waitingOn: refreshedPipeline.waiting_on,
          nextStep: refreshedPipeline.next_step,
          consultationOfferState: refreshedPipeline.consultation_offer_state,
          consultationOfferSentAt: refreshedPipeline.consultation_offer_sent_at,
          consultationOfferReason: refreshedPipeline.consultation_offer_reason,
          consultationOfferCopy: refreshedPipeline.consultation_offer_copy,
          consultationOfferAmount: refreshedPipeline.consultation_offer_amount,
          schedulingState: refreshedPipeline.scheduling_state,
          schedulingIntent: refreshedPipeline.scheduling_intent,
          schedulingSuggestedAt: refreshedPipeline.scheduling_suggested_at,
          leadSchedulePreference: refreshedPipeline.lead_schedule_preference,
          desiredScheduleWindow: refreshedPipeline.desired_schedule_window,
          scheduleConfirmedAt: refreshedPipeline.schedule_confirmed_at,
          paymentState: refreshedPipeline.payment_state,
          paymentLinkSentAt: refreshedPipeline.payment_link_sent_at,
          paymentLinkUrl: refreshedPipeline.payment_link_url,
          paymentReference: refreshedPipeline.payment_reference,
          paymentPendingAt: refreshedPipeline.payment_pending_at,
          paymentApprovedAt: refreshedPipeline.payment_approved_at,
          paymentFailedAt: refreshedPipeline.payment_failed_at,
          paymentExpiredAt: refreshedPipeline.payment_expired_at,
          paymentAbandonedAt: refreshedPipeline.payment_abandoned_at,
          consultationConfirmedAt: refreshedPipeline.consultation_confirmed_at,
          latestNote: refreshedPipeline.notes
        });

        await commercialAppointmentService.syncFormalConsultation({
          pipelineId: refreshedPipeline.id,
          actorProfileId:
            typeof payload.actorProfileId === "string"
              ? payload.actorProfileId
              : null,
          sessionId: action.sessionId,
          source: "operational_manual",
          createEvent: true
        });
      }

      return true;
    } catch (error) {
      console.error("FOLLOW_UP_ACTION_ERROR", error);
      return false;
    }
  }

  async getOperationalMetrics(): Promise<OperationalPanelMetrics> {
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const { data, error } = await this.supabase
        .from("client_pipeline")
        .select(
          `
          stage,
          lead_temperature,
          source_channel,
          follow_up_status,
          next_follow_up_at,
          last_contact_at,
          clients!inner (
            is_client
          )
        `
        )
        .not("last_contact_at", "is", null);

      if (error || !data) {
        console.error("OPERATIONAL_METRICS_ERROR", error);
        return this.getEmptyMetrics();
      }

      const metrics: OperationalPanelMetrics = {
        totalLeads: 0,
        warmHotLeads: 0,
        activeConversations: 0,
        consultationIntent: 0,
        consultationReady: 0,
        humanHandoffReady: 0,
        followUpPending: 0,
        consultationOffered: 0,
        consultationScheduled: 0,
        proposalSent: 0,
        contractPending: 0,
        totalClients: 0,
        inactiveLost: 0,
        todayOverdue: 0,
        overdueCount: 0,
        topPriorities: 0
      };

      for (const pipeline of data) {
        const isOverdue = pipeline.next_follow_up_at
          ? new Date(pipeline.next_follow_up_at) < now
          : false;
        const nextFollowUpToday = pipeline.next_follow_up_at
          ? pipeline.next_follow_up_at.split("T")[0] === today
          : false;

        if (!pipeline.clients[0]?.is_client) {
          metrics.totalLeads++;
        } else {
          metrics.totalClients++;
        }

        if (pipeline.lead_temperature === "warm" || pipeline.lead_temperature === "hot") {
          metrics.warmHotLeads++;
        }

        if (pipeline.stage !== "closed_lost" && pipeline.stage !== "inactive") {
          metrics.activeConversations++;
        }

        if (pipeline.follow_up_status === "pending" || pipeline.follow_up_status === "scheduled") {
          metrics.followUpPending++;
        }

        switch (pipeline.stage) {
          case "consultation_offered":
            metrics.consultationOffered++;
            metrics.consultationIntent++;
            break;
          case "consultation_scheduled":
            metrics.consultationScheduled++;
            metrics.consultationIntent++;
            metrics.consultationReady++;
            metrics.humanHandoffReady++;
            break;
          case "proposal_sent":
            metrics.proposalSent++;
            break;
          case "contract_pending":
            metrics.contractPending++;
            break;
          case "closed_lost":
          case "inactive":
            metrics.inactiveLost++;
            break;
        }

        if (isOverdue) {
          metrics.overdueCount++;
          if (nextFollowUpToday) {
            metrics.todayOverdue++;
          }
        }

        const daysSinceLastContact = Math.floor(
          (now.getTime() - new Date(pipeline.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const priority = this.calculateOperationalPriority({
          isClient: !!pipeline.clients[0]?.is_client,
          pipelineStage: pipeline.stage,
          leadTemperature: pipeline.lead_temperature,
          sourceChannel: pipeline.source_channel || "unknown",
          followUpStatus: pipeline.follow_up_status,
          nextFollowUpAt: pipeline.next_follow_up_at,
          daysSinceLastContact,
          isOverdue,
          followUpCount: 0,
          growthContext: null
        });

        if (priority.label === "high") {
          metrics.topPriorities++;
        }
      }

      return metrics;
    } catch (error) {
      console.error("OPERATIONAL_METRICS_ERROR", error);
      return this.getEmptyMetrics();
    }
  }

  private getEmptyMetrics(): OperationalPanelMetrics {
    return {
      totalLeads: 0,
      warmHotLeads: 0,
      activeConversations: 0,
      consultationIntent: 0,
      consultationReady: 0,
      humanHandoffReady: 0,
      followUpPending: 0,
      consultationOffered: 0,
      consultationScheduled: 0,
      proposalSent: 0,
      contractPending: 0,
      totalClients: 0,
      inactiveLost: 0,
      todayOverdue: 0,
      overdueCount: 0,
      topPriorities: 0
    };
  }

  private getMessagePreview(summary?: string): string {
    if (!summary) {
      return "";
    }

    const preview = summary.length > 100 ? `${summary.substring(0, 100)}...` : summary;
    return preview.replace(/\n/g, " ").trim();
  }

  async getPanelData(filters: OperationalPanelFilters = {}, limit = 50, offset = 0) {
    const contactsResult = await this.getOperationalContacts(filters, limit, offset);
    const metrics = this.buildMetricsFromContacts(contactsResult.contacts);

    return {
      contacts: contactsResult.contacts,
      total: contactsResult.total,
      metrics,
      filters
    };
  }

  private buildMetricsFromContacts(contacts: OperationalContact[]): OperationalPanelMetrics {
    const metrics = this.getEmptyMetrics();

    for (const contact of contacts) {
      if (contact.isClient) {
        metrics.totalClients += 1;
      } else {
        metrics.totalLeads += 1;
      }

      if (contact.leadTemperature === "warm" || contact.leadTemperature === "hot") {
        metrics.warmHotLeads += 1;
      }

      if (!["closed_lost", "inactive"].includes(contact.pipelineStage)) {
        metrics.activeConversations += 1;
      }

      if (
        contact.followUpStatus === "pending" ||
        contact.followUpStatus === "scheduled" ||
        contact.conversationState?.commercialFollowUpType
      ) {
        metrics.followUpPending += 1;
      }

      if (
        contact.conversationState?.consultationIntentLevel === "emerging" ||
        contact.conversationState?.consultationIntentLevel === "clear" ||
        contact.conversationState?.consultationIntentLevel === "accepted"
      ) {
        metrics.consultationIntent += 1;
      }

      if (
        contact.conversationState?.consultationInviteState === "invite_now" ||
        contact.pipelineStage === "consultation_offered" ||
        contact.consultationRecommendationState === "recommend_now" ||
        contact.consultationOfferState === "offered"
      ) {
        metrics.consultationOffered += 1;
      }

      if (
        contact.conversationState?.schedulingStatus === "pending_confirmation" ||
        contact.conversationState?.schedulingStatus === "confirmed" ||
        contact.pipelineStage === "consultation_scheduled" ||
        contact.schedulingState === "slot_suggested" ||
        contact.schedulingState === "confirmed"
      ) {
        metrics.consultationScheduled += 1;
      }

      if (
        contact.conversationState?.humanHandoffReady ||
        contact.conversationState?.readyForLawyer ||
        contact.consultationReadiness === "ready_for_consultation" ||
        contact.consultationReadiness === "closing"
      ) {
        metrics.consultationReady += 1;
        metrics.humanHandoffReady += 1;
      }

      if (contact.pipelineStage === "proposal_sent" || contact.closingState === "proposal_sent") {
        metrics.proposalSent += 1;
      }

      if (contact.pipelineStage === "contract_pending" || contact.paymentState === "pending") {
        metrics.contractPending += 1;
      }

      if (["closed_lost", "inactive"].includes(contact.pipelineStage)) {
        metrics.inactiveLost += 1;
      }

      if (contact.isOverdue) {
        metrics.overdueCount += 1;
        if (contact.nextFollowUpAt) {
          const next = new Date(contact.nextFollowUpAt);
          const today = new Date();
          if (
            next.getFullYear() === today.getFullYear() &&
            next.getMonth() === today.getMonth() &&
            next.getDate() === today.getDate()
          ) {
            metrics.todayOverdue += 1;
          }
        }
      }

      if (contact.priorityLabel === "high") {
        metrics.topPriorities += 1;
      }
    }

    return metrics;
  }
}

export const operationalPanel = new OperationalPanel();
