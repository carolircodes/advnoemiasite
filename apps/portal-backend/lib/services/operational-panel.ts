import { createWebhookSupabaseClient } from "../supabase/webhook";
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
  channels: Array<{
    channel: string;
    externalUserId: string;
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
  action:
    | "update_stage"
    | "update_temperature"
    | "mark_consultation_offered"
    | "mark_consultation_scheduled"
    | "mark_proposal_sent"
    | "mark_contract_pending"
    | "mark_client"
    | "mark_lost"
    | "mark_inactive";
  value?: string;
  notes?: string;
}

class OperationalPanel {
  private supabase = createWebhookSupabaseClient();

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
            next_follow_up_at,
            last_contact_at,
            tags,
            notes,
            summary
          ),
          client_channels (
            id,
            channel,
            external_user_id,
            last_contact_at
          ),
          conversation_sessions (
            id,
            lead_stage,
            case_area,
            current_intent,
            last_summary,
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
        .order("client_pipeline.last_contact_at", { ascending: false })
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

      const contacts: OperationalContact[] = [];

      for (const client of data) {
        const operationalContact = await this.processOperationalContact(
          client,
          growthContextByClient.get(client.id) || null,
          triageSummaryBySessionId
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
    triageSummaryBySessionId: Map<string, any>
  ): Promise<OperationalContact> {
    const pipeline = client.client_pipeline;
    const channels = client.client_channels || [];
    const sessions = client.conversation_sessions || [];
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
    if (priority.label !== "low") {
      suggestedMessage = await this.prepareSuggestedMessage(
        client.id,
        pipeline.id,
        pipeline.source_channel
      );
    }

    return {
      clientId: client.id,
      pipelineId: pipeline.id,
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
      latestMessagePreview,
      channels: channels.map((channel: any) => ({
        channel: channel.channel,
        externalUserId: channel.external_user_id,
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
          break;
        case "mark_consultation_scheduled":
          updateData.stage = "consultation_scheduled";
          updateData.follow_up_status = "completed";
          break;
        case "mark_proposal_sent":
          updateData.stage = "proposal_sent";
          updateData.follow_up_status = "pending";
          break;
        case "mark_contract_pending":
          updateData.stage = "contract_pending";
          updateData.follow_up_status = "pending";
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

        if (pipeline.follow_up_status === "pending" || pipeline.follow_up_status === "scheduled") {
          metrics.followUpPending++;
        }

        switch (pipeline.stage) {
          case "consultation_offered":
            metrics.consultationOffered++;
            break;
          case "consultation_scheduled":
            metrics.consultationScheduled++;
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
    const [contactsResult, metrics] = await Promise.all([
      this.getOperationalContacts(filters, limit, offset),
      this.getOperationalMetrics()
    ]);

    return {
      contacts: contactsResult.contacts,
      total: contactsResult.total,
      metrics,
      filters
    };
  }
}

export const operationalPanel = new OperationalPanel();
