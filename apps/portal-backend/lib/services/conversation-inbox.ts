import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import { sendWhatsAppMessage } from "../meta/whatsapp-service";

type ConversationChannel = "instagram" | "whatsapp" | "site" | "portal";
type ThreadStatus =
  | "new"
  | "unread"
  | "waiting_human"
  | "waiting_client"
  | "ai_active"
  | "handoff"
  | "closed"
  | "archived";
type WaitingFor = "human" | "client" | "ai" | "none";
type OwnerMode = "ai" | "human" | "hybrid";
type Priority = "low" | "medium" | "high";
type HandoffState = "none" | "requested" | "active" | "resolved";

export type ConversationInboxFilters = {
  search?: string;
  status?: ThreadStatus | "all";
  channel?: ConversationChannel | "all";
  priority?: Priority | "all";
  waitingFor?: WaitingFor | "all";
  inboxMode?:
    | "all"
    | "needs_human"
    | "customer_turn"
    | "ai_control"
    | "hot"
    | "follow_up_due"
    | "follow_up_overdue";
  founderScope?: "all" | "founder" | "waitlist";
  paymentState?: "all" | "pending" | "approved";
  includeArchived?: boolean;
};

type SessionRow = {
  id: string;
  channel: ConversationChannel;
  external_user_id: string;
  external_thread_id: string | null;
  lead_name: string | null;
  lead_stage: string | null;
  case_area: string | null;
  current_intent: string | null;
  last_summary: string | null;
  handoff_to_human: boolean | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  client_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  thread_status: ThreadStatus;
  waiting_for: WaitingFor;
  owner_mode: OwnerMode;
  owner_user_id: string | null;
  priority: Priority;
  unread_count: number;
  handoff_state: HandoffState;
  handoff_reason: string | null;
  ai_enabled: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  last_human_reply_at: string | null;
  last_ai_reply_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  internal_notes: string | null;
  tags: unknown;
  next_action_hint: string | null;
  priority_source: "manual" | "inferred" | "hybrid";
  sensitivity_level: "low" | "normal" | "high";
  follow_up_status: "none" | "pending" | "due" | "overdue" | "resolved" | "converted";
  follow_up_due_at: string | null;
  follow_up_resolved_at: string | null;
  last_status_event_at: string | null;
};

type MessageRow = {
  id: string;
  session_id: string;
  external_message_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  direction: "inbound" | "outbound";
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  message_type: string;
  sender_type: "contact" | "ai" | "human" | "system";
  send_status: string;
  delivery_status: string | null;
  is_read: boolean;
  read_at: string | null;
  error_message: string | null;
  attachments: unknown;
};

type TriageSummaryRow = {
  session_id: string;
  conversation_status: string | null;
  consultation_stage: string | null;
  explanation_stage?: string | null;
  handoff_reason: string | null;
  internal_summary: string | null;
  report_data: Record<string, unknown> | null;
  ai_active_on_channel?: boolean | null;
  operational_handoff_recorded?: boolean | null;
  human_followup_pending?: boolean | null;
  follow_up_ready?: boolean | null;
  lawyer_notification_generated?: boolean | null;
  is_hot_lead?: boolean | null;
  needs_human_attention?: boolean | null;
};

type ClientRow = {
  id: string;
  profile_id: string | null;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  is_client?: boolean | null;
  status?: string | null;
};

type PipelineRow = {
  client_id: string;
  stage: string | null;
  lead_temperature: string | null;
  source_channel: string | null;
  follow_up_status: string | null;
  next_follow_up_at: string | null;
  last_contact_at: string | null;
  notes: string | null;
  tags: string[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

type PaymentRow = {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  amount: number | null;
  status: string;
  payment_url: string | null;
  created_at: string;
  approved_at: string | null;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  starts_at?: string | null;
  scheduled_for?: string | null;
  status?: string | null;
  type?: string | null;
};

type AccessGrantRow = {
  profile_id: string;
  grant_status: string;
  portal_workspace: string;
};

type CommunityMembershipRow = {
  profile_id: string;
  status: string;
  access_level: string;
  joined_at: string | null;
  last_active_at: string | null;
};

type EventRow = {
  id: string;
  session_id: string;
  event_type: string;
  actor_type: "system" | "ai" | "human";
  actor_id: string | null;
  actor_label: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

type NoteRow = {
  id: string;
  session_id: string;
  author_id: string | null;
  author_name: string | null;
  note_body: string;
  note_kind: "operational" | "next_action" | "sensitive" | "context";
  is_sensitive: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ConversationThreadListItem = {
  id: string;
  channel: ConversationChannel;
  displayName: string;
  contactLabel: string;
  preview: string;
  lastMessageAt: string | null;
  threadStatus: ThreadStatus;
  waitingFor: WaitingFor;
  priority: Priority;
  unreadCount: number;
  ownerMode: OwnerMode;
  handoffState: HandoffState;
  handoffReason: string | null;
  leadStage: string | null;
  caseArea: string | null;
  currentIntent: string | null;
  hot: boolean;
  hasFounderContext: boolean;
  hasWaitlistContext: boolean;
  hasPaymentPending: boolean;
  paymentApproved: boolean;
  nextAction: string;
  prioritySource: "manual" | "inferred" | "hybrid";
  followUpStatus: string;
  followUpDueAt: string | null;
  idleMinutes: number | null;
};

export type ConversationThreadDetail = {
  thread: ConversationThreadListItem & {
    internalNotes: string | null;
    tags: string[];
    aiEnabled: boolean;
    assignedTo: {
      id: string | null;
      name: string | null;
    };
  };
  messages: Array<{
    id: string;
    content: string;
    direction: "inbound" | "outbound";
    senderType: "contact" | "ai" | "human" | "system";
    sendStatus: string;
    messageType: string;
    createdAt: string;
    isRead: boolean;
    errorMessage: string | null;
  }>;
  context: {
    person: {
      name: string;
      phone: string | null;
      email: string | null;
      role: string | null;
    };
    lead: {
      stage: string | null;
      temperature: string | null;
      followUpStatus: string | null;
      currentIntent: string | null;
      sourceChannel: string | null;
    };
    payment: {
      pendingCount: number;
      approvedCount: number;
      latestAmount: number | null;
      latestStatus: string | null;
      latestUrl: string | null;
    };
    founder: {
      isFounder: boolean;
      isWaitlist: boolean;
      communityStatus: string | null;
      accessStatus: string | null;
    };
    agenda: {
      nextAppointmentAt: string | null;
      nextAppointmentStatus: string | null;
    };
    operational: {
      lastSummary: string | null;
      triageSummary: string | null;
      handoffReason: string | null;
      conversationStatus: string | null;
      consultationStage: string | null;
      nextSuggestedAction: string | null;
      nextSuggestedActionDetail: string | null;
      humanFollowUpPending: boolean;
      followUpStatus: string;
      followUpDueAt: string | null;
    };
  };
  events: Array<{
    id: string;
    type: string;
    actorType: string;
    actorLabel: string | null;
    createdAt: string;
    summary: string;
  }>;
  notes: Array<{
    id: string;
    body: string;
    kind: string;
    isSensitive: boolean;
    authorName: string | null;
    createdAt: string;
  }>;
};

export type ConversationInboxMetrics = {
  totalOpenThreads: number;
  unreadCount: number;
  waitingHumanCount: number;
  waitingClientCount: number;
  handoffCount: number;
  hotThreads: number;
  founderOrWaitlistThreads: number;
  paymentPendingThreads: number;
  aiControlledThreads: number;
  humanControlledThreads: number;
  followUpPendingCount: number;
  followUpOverdueCount: number;
  whatsappVolume: number;
  firstResponseTimeMinutes: number | null;
  humanResponseTimeMinutes: number | null;
  failedMessagesCount: number;
  deliveredMessagesCount: number;
  readMessagesCount: number;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function buildSearchNeedle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesSearch(search: string, values: Array<string | null | undefined>) {
  if (!search.trim()) {
    return true;
  }

  const needle = buildSearchNeedle(search);
  return values.some((value) => {
    const haystack = buildSearchNeedle(value || "");
    return haystack.includes(needle);
  });
}

function buildPreview(session: SessionRow) {
  return (
    session.last_message_preview ||
    session.last_summary ||
    asString(session.metadata?.last_user_message) ||
    "Sem mensagem registrada ainda."
  );
}

function formatNextAction(session: SessionRow, triage?: TriageSummaryRow | null) {
  const report = safeObject(triage?.report_data);
  const nextAction = asString(report.nextBestAction) || asString(report.next_action);
  const nextDetail =
    asString(report.nextBestActionDetail) || asString(report.next_action_detail);

  if (nextAction && nextDetail) {
    return `${nextAction}: ${nextDetail}`;
  }

  if (nextAction) {
    return nextAction;
  }

  if (session.thread_status === "handoff" || session.waiting_for === "human") {
    return "Assumir a thread, preservar contexto e decidir o proximo movimento.";
  }

  if (session.waiting_for === "client") {
    return "Aguardar resposta do cliente e monitorar sinais de continuidade.";
  }

  if (session.owner_mode === "ai") {
    return "Monitorar continuidade da IA e intervir apenas se houver escalacao.";
  }

  return "Revisar contexto e decidir a proxima acao com criterio humano.";
}

function buildEventSummary(event: EventRow) {
  const data = safeObject(event.event_data);

  switch (event.event_type) {
    case "human_reply_sent":
      return "Resposta humana enviada pelo painel.";
    case "thread_marked_read":
      return "Thread marcada como lida e pronta para acompanhamento.";
    case "thread_status_updated":
      return `Status atualizado para ${asString(data.threadStatus) || "novo estado"}.`;
    case "handoff_state_updated":
      return `Handoff ajustado para ${asString(data.handoffState) || "novo estado"}.`;
    case "ownership_updated":
      return `Ownership movido para ${asString(data.ownerMode) || "novo modo"}.`;
    case "thread_note_added":
      return "Nota interna adicionada a memoria operacional.";
    default:
      return asString(data.summary) || "Evento operacional registrado.";
  }
}

function toMinutes(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) {
    return null;
  }

  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(diff) || diff < 0) {
    return null;
  }

  return diff / 60000;
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) {
    return null;
  }

  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1));
}

function minutesSince(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff) || diff < 0) {
    return null;
  }

  return Math.round(diff / 60000);
}

class ConversationInboxService {
  private supabase = createAdminSupabaseClient();

  private async resolveClientIds(sessions: SessionRow[]) {
    const resolved = new Map<string, string>();
    const grouped = new Map<ConversationChannel, string[]>();

    sessions.forEach((session) => {
      if (session.client_id) {
        resolved.set(session.id, session.client_id);
        return;
      }

      if (!grouped.has(session.channel)) {
        grouped.set(session.channel, []);
      }

      grouped.get(session.channel)?.push(session.external_user_id);
    });

    for (const [channel, externalUserIds] of grouped.entries()) {
      if (externalUserIds.length === 0) {
        continue;
      }

      const { data } = await this.supabase
        .from("client_channels")
        .select("client_id, channel, external_user_id")
        .eq("channel", channel)
        .in("external_user_id", Array.from(new Set(externalUserIds)));

      (data || []).forEach((row: { client_id: string; channel: string; external_user_id: string }) => {
        const match = sessions.find(
          (session) =>
            session.channel === row.channel &&
            session.external_user_id === row.external_user_id &&
            !resolved.has(session.id)
        );

        if (match) {
          resolved.set(match.id, row.client_id);
        }
      });
    }

    return resolved;
  }

  private async loadContextBundle(sessions: SessionRow[]) {
    const sessionIds = sessions.map((session) => session.id);
    const resolvedClientIds = await this.resolveClientIds(sessions);

    const triagePromise = sessionIds.length
      ? this.supabase
          .from("noemia_triage_summaries")
          .select(
            "session_id, conversation_status, consultation_stage, explanation_stage, handoff_reason, internal_summary, report_data, ai_active_on_channel, operational_handoff_recorded, human_followup_pending, follow_up_ready, lawyer_notification_generated, is_hot_lead, needs_human_attention"
          )
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as TriageSummaryRow[] });

    const clientIds = Array.from(
      new Set(
        sessions
          .map((session) => resolvedClientIds.get(session.id) || session.client_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    const clientsPromise = clientIds.length
      ? this.supabase
          .from("clients")
          .select("id, profile_id, full_name, name, phone, is_client, status")
          .in("id", clientIds)
      : Promise.resolve({ data: [] as ClientRow[] });

    const pipelinePromise = clientIds.length
      ? this.supabase
          .from("client_pipeline")
          .select("client_id, stage, lead_temperature, source_channel, follow_up_status, next_follow_up_at, last_contact_at, notes, tags")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] as PipelineRow[] });

    const appointmentsPromise = clientIds.length
      ? this.supabase
          .from("appointments")
          .select("id, client_id, starts_at, scheduled_for, status, type")
          .in("client_id", clientIds)
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [] as AppointmentRow[] });

    const [triageResult, clientsResult, pipelineResult, appointmentsResult] = await Promise.all([
      triagePromise,
      clientsPromise,
      pipelinePromise,
      appointmentsPromise
    ]);

    const triageBySession = new Map(
      (triageResult.data || []).map((row) => [row.session_id, row] as const)
    );

    const clientsById = new Map(
      (clientsResult.data || []).map((row) => [row.id, row] as const)
    );

    const pipelinesByClientId = new Map(
      (pipelineResult.data || []).map((row) => [row.client_id, row] as const)
    );

    const appointmentsByClientId = new Map<string, AppointmentRow[]>();
    (appointmentsResult.data || []).forEach((row) => {
      if (!appointmentsByClientId.has(row.client_id)) {
        appointmentsByClientId.set(row.client_id, []);
      }

      appointmentsByClientId.get(row.client_id)?.push(row);
    });

    const profileIds = Array.from(
      new Set(
        Array.from(clientsById.values())
          .map((client) => client.profile_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    const profilesPromise = profileIds.length
      ? this.supabase
          .from("profiles")
          .select("id, full_name, email, phone, role")
          .in("id", profileIds)
      : Promise.resolve({ data: [] as ProfileRow[] });

    const accessGrantsPromise = profileIds.length
      ? this.supabase
          .from("ecosystem_access_grants")
          .select("profile_id, grant_status, portal_workspace")
          .in("profile_id", profileIds)
      : Promise.resolve({ data: [] as AccessGrantRow[] });

    const membershipsPromise = profileIds.length
      ? this.supabase
          .from("ecosystem_community_memberships")
          .select("profile_id, status, access_level, joined_at, last_active_at")
          .in("profile_id", profileIds)
      : Promise.resolve({ data: [] as CommunityMembershipRow[] });

    const [profilesResult, accessGrantsResult, membershipsResult] = await Promise.all([
      profilesPromise,
      accessGrantsPromise,
      membershipsPromise
    ]);

    const profilesById = new Map(
      (profilesResult.data || []).map((row) => [row.id, row] as const)
    );

    const accessGrantByProfile = new Map<string, AccessGrantRow>();
    (accessGrantsResult.data || []).forEach((row) => {
      if (!accessGrantByProfile.has(row.profile_id)) {
        accessGrantByProfile.set(row.profile_id, row);
      }
    });

    const membershipByProfile = new Map<string, CommunityMembershipRow>();
    (membershipsResult.data || []).forEach((row) => {
      if (!membershipByProfile.has(row.profile_id)) {
        membershipByProfile.set(row.profile_id, row);
      }
    });

    const leadIds = Array.from(
      new Set(
        sessions
          .map((session) => asString(session.metadata?.leadId) || asString(session.metadata?.lead_id))
          .filter((value): value is string => Boolean(value))
      )
    );

    const paymentsByLeadId = new Map<string, PaymentRow[]>();
    const paymentsByProfileId = new Map<string, PaymentRow[]>();

    if (leadIds.length) {
      const { data } = await this.supabase
        .from("payments")
        .select("id, lead_id, user_id, amount, status, payment_url, created_at, approved_at")
        .in("lead_id", leadIds);

      (data || []).forEach((row: PaymentRow) => {
        if (row.lead_id) {
          if (!paymentsByLeadId.has(row.lead_id)) {
            paymentsByLeadId.set(row.lead_id, []);
          }

          paymentsByLeadId.get(row.lead_id)?.push(row);
        }
      });
    }

    if (profileIds.length) {
      const { data } = await this.supabase
        .from("payments")
        .select("id, lead_id, user_id, amount, status, payment_url, created_at, approved_at")
        .in("user_id", profileIds);

      (data || []).forEach((row: PaymentRow) => {
        if (row.user_id) {
          if (!paymentsByProfileId.has(row.user_id)) {
            paymentsByProfileId.set(row.user_id, []);
          }

          paymentsByProfileId.get(row.user_id)?.push(row);
        }
      });
    }

    return {
      resolvedClientIds,
      triageBySession,
      clientsById,
      pipelinesByClientId,
      profilesById,
      accessGrantByProfile,
      membershipByProfile,
      appointmentsByClientId,
      paymentsByLeadId,
      paymentsByProfileId
    };
  }

  private buildThreadItem(
    session: SessionRow,
    bundle: Awaited<ReturnType<ConversationInboxService["loadContextBundle"]>>
  ): ConversationThreadListItem {
    const resolvedClientId = bundle.resolvedClientIds.get(session.id) || session.client_id;
    const client = resolvedClientId ? bundle.clientsById.get(resolvedClientId) || null : null;
    const pipeline = resolvedClientId ? bundle.pipelinesByClientId.get(resolvedClientId) || null : null;
    const profile = client?.profile_id ? bundle.profilesById.get(client.profile_id) || null : null;
    const triage = bundle.triageBySession.get(session.id) || null;
    const grant = profile ? bundle.accessGrantByProfile.get(profile.id) || null : null;
    const membership = profile ? bundle.membershipByProfile.get(profile.id) || null : null;
    const leadId = asString(session.metadata?.leadId) || asString(session.metadata?.lead_id);
    const payments = [
      ...(leadId ? bundle.paymentsByLeadId.get(leadId) || [] : []),
      ...(profile ? bundle.paymentsByProfileId.get(profile.id) || [] : [])
    ];

    const hot =
      Boolean(triage?.is_hot_lead) ||
      Boolean(triage?.needs_human_attention) ||
      session.priority === "high" ||
      session.thread_status === "handoff";

    const hasFounderContext = Boolean(membership) || grant?.portal_workspace === "community";
    const hasWaitlistContext = grant?.grant_status === "scheduled" || membership?.status === "invited";
    const hasPaymentPending = payments.some((payment) =>
      ["pending", "in_process", "requires_action"].includes(payment.status)
    );
    const paymentApproved = payments.some((payment) => payment.status === "approved");

    const displayName =
      profile?.full_name ||
      client?.full_name ||
      client?.name ||
      session.lead_name ||
      asString(session.metadata?.displayName) ||
      "Contato sem nome";

    return {
      id: session.id,
      channel: session.channel,
      displayName,
      contactLabel: profile?.email || client?.phone || session.external_user_id,
      preview: buildPreview(session),
      lastMessageAt: session.last_message_at || session.updated_at,
      threadStatus: session.thread_status,
      waitingFor: session.waiting_for,
      priority: session.priority,
      unreadCount: session.unread_count || 0,
      ownerMode: session.owner_mode,
      handoffState: session.handoff_state,
      handoffReason: session.handoff_reason || triage?.handoff_reason || null,
      leadStage: pipeline?.stage || session.lead_stage,
      caseArea: session.case_area,
      currentIntent: session.current_intent || triage?.conversation_status || null,
      hot,
      hasFounderContext,
      hasWaitlistContext,
      hasPaymentPending,
      paymentApproved,
      nextAction: session.next_action_hint || formatNextAction(session, triage),
      prioritySource: session.priority_source,
      followUpStatus: session.follow_up_status,
      followUpDueAt: session.follow_up_due_at,
      idleMinutes: minutesSince(session.last_message_at || session.updated_at)
    };
  }

  private applyThreadFilters(
    item: ConversationThreadListItem,
    filters: ConversationInboxFilters
  ) {
    if (filters.status && filters.status !== "all" && item.threadStatus !== filters.status) {
      return false;
    }

    if (filters.channel && filters.channel !== "all" && item.channel !== filters.channel) {
      return false;
    }

    if (filters.priority && filters.priority !== "all" && item.priority !== filters.priority) {
      return false;
    }

    if (filters.waitingFor && filters.waitingFor !== "all" && item.waitingFor !== filters.waitingFor) {
      return false;
    }

    if (filters.inboxMode === "needs_human" && item.waitingFor !== "human") {
      return false;
    }

    if (filters.inboxMode === "customer_turn" && item.waitingFor !== "client") {
      return false;
    }

    if (filters.inboxMode === "ai_control" && item.ownerMode !== "ai") {
      return false;
    }

    if (filters.inboxMode === "hot" && !item.hot) {
      return false;
    }

    if (filters.inboxMode === "follow_up_due" && item.followUpStatus !== "due") {
      return false;
    }

    if (filters.inboxMode === "follow_up_overdue" && item.followUpStatus !== "overdue") {
      return false;
    }

    if (filters.founderScope === "founder" && !item.hasFounderContext) {
      return false;
    }

    if (filters.founderScope === "waitlist" && !item.hasWaitlistContext) {
      return false;
    }

    if (filters.paymentState === "pending" && !item.hasPaymentPending) {
      return false;
    }

    if (filters.paymentState === "approved" && !item.paymentApproved) {
      return false;
    }

    if (
      filters.search &&
      !matchesSearch(filters.search, [
        item.displayName,
        item.contactLabel,
        item.preview,
        item.currentIntent,
        item.handoffReason
      ])
    ) {
      return false;
    }

    return true;
  }

  async listThreads(filters: ConversationInboxFilters = {}, limit = 60) {
    const { data, error } = await this.supabase
      .from("conversation_sessions")
      .select("*")
      .order("last_message_at", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit * 3);

    if (error) {
      throw new Error(`Nao foi possivel carregar a inbox: ${error.message}`);
    }

    const sessions = ((data || []) as SessionRow[]).filter(
      (session) => filters.includeArchived || session.thread_status !== "archived"
    );
    const bundle = await this.loadContextBundle(sessions);

    const allItems = sessions.map((session) => this.buildThreadItem(session, bundle));
    const items = allItems.filter((item) => this.applyThreadFilters(item, filters)).slice(0, limit);
    const sessionIds = sessions.map((session) => session.id);
    const { data: messageStatusRows } = sessionIds.length
      ? await this.supabase
          .from("conversation_messages")
          .select("send_status, delivery_status")
          .in("session_id", sessionIds)
      : { data: [] as Array<{ send_status: string; delivery_status: string | null }> };

    const firstResponseTimes = sessions.map((session) =>
      toMinutes(session.last_inbound_at, session.last_outbound_at)
    );
    const humanResponseTimes = sessions.map((session) =>
      toMinutes(session.last_inbound_at, session.last_human_reply_at)
    );

    const metrics = allItems.reduce<ConversationInboxMetrics>(
      (accumulator, item) => {
        accumulator.totalOpenThreads += ["closed", "archived"].includes(item.threadStatus) ? 0 : 1;
        accumulator.unreadCount += item.unreadCount;
        accumulator.waitingHumanCount += item.waitingFor === "human" ? 1 : 0;
        accumulator.waitingClientCount += item.waitingFor === "client" ? 1 : 0;
        accumulator.handoffCount += item.handoffState === "active" || item.threadStatus === "handoff" ? 1 : 0;
        accumulator.hotThreads += item.hot ? 1 : 0;
        accumulator.founderOrWaitlistThreads += item.hasFounderContext || item.hasWaitlistContext ? 1 : 0;
        accumulator.paymentPendingThreads += item.hasPaymentPending ? 1 : 0;
        accumulator.aiControlledThreads += item.ownerMode === "ai" ? 1 : 0;
        accumulator.humanControlledThreads += item.ownerMode === "human" ? 1 : 0;
        accumulator.followUpPendingCount += ["pending", "due", "overdue"].includes(item.followUpStatus) ? 1 : 0;
        accumulator.followUpOverdueCount += item.followUpStatus === "overdue" ? 1 : 0;
        accumulator.whatsappVolume += item.channel === "whatsapp" ? 1 : 0;
        return accumulator;
      },
      {
        totalOpenThreads: 0,
        unreadCount: 0,
        waitingHumanCount: 0,
        waitingClientCount: 0,
        handoffCount: 0,
        hotThreads: 0,
        founderOrWaitlistThreads: 0,
        paymentPendingThreads: 0,
        aiControlledThreads: 0,
        humanControlledThreads: 0,
        followUpPendingCount: 0,
        followUpOverdueCount: 0,
        whatsappVolume: 0,
        firstResponseTimeMinutes: average(firstResponseTimes),
        humanResponseTimeMinutes: average(humanResponseTimes),
        failedMessagesCount: (messageStatusRows || []).filter((row) => row.send_status === "failed").length,
        deliveredMessagesCount: (messageStatusRows || []).filter(
          (row) => row.send_status === "delivered" || row.delivery_status === "delivered"
        ).length,
        readMessagesCount: (messageStatusRows || []).filter(
          (row) => row.send_status === "read" || row.delivery_status === "read"
        ).length
      }
    );

    return { threads: items, metrics };
  }

  async getThreadDetail(threadId: string): Promise<ConversationThreadDetail | null> {
    const { data: session, error } = await this.supabase
      .from("conversation_sessions")
      .select("*")
      .eq("id", threadId)
      .maybeSingle();

    if (error) {
      throw new Error(`Nao foi possivel carregar a thread: ${error.message}`);
    }

    if (!session) {
      return null;
    }

    const bundle = await this.loadContextBundle([session as SessionRow]);
    const thread = this.buildThreadItem(session as SessionRow, bundle);
    const resolvedClientId =
      bundle.resolvedClientIds.get(threadId) || (session as SessionRow).client_id;
    const client = resolvedClientId ? bundle.clientsById.get(resolvedClientId) || null : null;
    const pipeline = resolvedClientId ? bundle.pipelinesByClientId.get(resolvedClientId) || null : null;
    const profile = client?.profile_id ? bundle.profilesById.get(client.profile_id) || null : null;
    const triage = bundle.triageBySession.get(threadId) || null;
    const appointments = resolvedClientId
      ? bundle.appointmentsByClientId.get(resolvedClientId) || []
      : [];
    const nextAppointment = appointments[0] || null;
    const leadId =
      asString((session as SessionRow).metadata?.leadId) ||
      asString((session as SessionRow).metadata?.lead_id);
    const payments = [
      ...(leadId ? bundle.paymentsByLeadId.get(leadId) || [] : []),
      ...(profile ? bundle.paymentsByProfileId.get(profile.id) || [] : [])
    ].sort((left, right) => right.created_at.localeCompare(left.created_at));
    const latestPayment = payments[0] || null;

    const { data: messagesData, error: messagesError } = await this.supabase
      .from("conversation_messages")
      .select("*")
      .eq("session_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (messagesError) {
      throw new Error(`Nao foi possivel carregar as mensagens: ${messagesError.message}`);
    }

    const { data: eventsData, error: eventsError } = await this.supabase
      .from("conversation_events")
      .select("*")
      .eq("session_id", threadId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (eventsError) {
      throw new Error(`Nao foi possivel carregar os eventos da thread: ${eventsError.message}`);
    }

    const { data: notesData, error: notesError } = await this.supabase
      .from("conversation_notes")
      .select("*")
      .eq("session_id", threadId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notesError) {
      throw new Error(`Nao foi possivel carregar as notas da thread: ${notesError.message}`);
    }

    return {
      thread: {
        ...thread,
        internalNotes: (session as SessionRow).internal_notes,
        tags: safeArray((session as SessionRow).tags).map((tag) => String(tag)),
        aiEnabled: Boolean((session as SessionRow).ai_enabled),
        assignedTo: {
          id: (session as SessionRow).owner_user_id,
          name: (session as SessionRow).owner_user_id
            ? bundle.profilesById.get((session as SessionRow).owner_user_id || "")?.full_name || null
            : null
        }
      },
      messages: ((messagesData || []) as MessageRow[]).map((message) => ({
        id: message.id,
        content: message.content,
        direction: message.direction,
        senderType: message.sender_type,
        sendStatus: message.send_status,
        messageType: message.message_type,
        createdAt: message.created_at,
        isRead: message.is_read,
        errorMessage: message.error_message
      })),
      context: {
        person: {
          name:
            profile?.full_name ||
            client?.full_name ||
            client?.name ||
            (session as SessionRow).lead_name ||
            "Contato sem nome",
          phone: profile?.phone || client?.phone || (session as SessionRow).external_user_id,
          email: profile?.email || null,
          role: profile?.role || null
        },
        lead: {
          stage: pipeline?.stage || (session as SessionRow).lead_stage || null,
          temperature: pipeline?.lead_temperature || null,
          followUpStatus: pipeline?.follow_up_status || null,
          currentIntent: (session as SessionRow).current_intent || null,
          sourceChannel: pipeline?.source_channel || (session as SessionRow).channel
        },
        payment: {
          pendingCount: payments.filter((payment) =>
            ["pending", "in_process", "requires_action"].includes(payment.status)
          ).length,
          approvedCount: payments.filter((payment) => payment.status === "approved").length,
          latestAmount: latestPayment?.amount || null,
          latestStatus: latestPayment?.status || null,
          latestUrl: latestPayment?.payment_url || null
        },
        founder: {
          isFounder: Boolean(profile && bundle.membershipByProfile.get(profile.id)),
          isWaitlist: bundle.accessGrantByProfile.get(profile?.id || "")?.grant_status === "scheduled",
          communityStatus: profile ? bundle.membershipByProfile.get(profile.id)?.status || null : null,
          accessStatus: profile ? bundle.accessGrantByProfile.get(profile.id)?.grant_status || null : null
        },
        agenda: {
          nextAppointmentAt: nextAppointment?.starts_at || nextAppointment?.scheduled_for || null,
          nextAppointmentStatus: nextAppointment?.status || null
        },
        operational: {
          lastSummary: (session as SessionRow).last_summary,
          triageSummary: triage?.internal_summary || null,
          handoffReason:
            (session as SessionRow).handoff_reason || triage?.handoff_reason || null,
          conversationStatus: triage?.conversation_status || null,
          consultationStage: triage?.consultation_stage || null,
          nextSuggestedAction:
            asString(triage?.report_data?.nextBestAction) ||
            asString(triage?.report_data?.next_action) ||
            null,
          nextSuggestedActionDetail:
            asString(triage?.report_data?.nextBestActionDetail) ||
            asString(triage?.report_data?.next_action_detail) ||
            null,
          humanFollowUpPending: Boolean(triage?.human_followup_pending),
          followUpStatus: (session as SessionRow).follow_up_status,
          followUpDueAt: (session as SessionRow).follow_up_due_at
        }
      },
      events: ((eventsData || []) as EventRow[]).map((event) => ({
        id: event.id,
        type: event.event_type,
        actorType: event.actor_type,
        actorLabel: event.actor_label,
        createdAt: event.created_at,
        summary: buildEventSummary(event)
      })),
      notes: ((notesData || []) as NoteRow[]).map((note) => ({
        id: note.id,
        body: note.note_body,
        kind: note.note_kind,
        isSensitive: note.is_sensitive,
        authorName: note.author_name,
        createdAt: note.created_at
      }))
    };
  }

  private async createEvent(input: {
    sessionId: string;
    eventType: string;
    actorType: "system" | "ai" | "human";
    actorId?: string | null;
    actorLabel?: string | null;
    eventData?: Record<string, unknown>;
  }) {
    await this.supabase.from("conversation_events").insert({
      session_id: input.sessionId,
      event_type: input.eventType,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      actor_label: input.actorLabel || null,
      event_data: input.eventData || {}
    });
  }

  async sendHumanReply(input: {
    threadId: string;
    content: string;
    authorId: string;
    authorName: string;
  }) {
    const content = input.content.trim();

    if (!content) {
      throw new Error("A resposta nao pode estar vazia.");
    }

    const detail = await this.getThreadDetail(input.threadId);

    if (!detail) {
      throw new Error("Thread nao encontrada.");
    }

    if (detail.thread.channel !== "whatsapp") {
      throw new Error("A resposta manual pelo painel esta habilitada apenas para WhatsApp nesta fase.");
    }

    const sendResult = await sendWhatsAppMessage(
      detail.context.person.phone || detail.thread.contactLabel,
      content
    );

    const now = new Date().toISOString();

    await this.supabase.from("conversation_messages").insert({
      session_id: input.threadId,
      external_message_id: sendResult.messageId || null,
      role: "assistant",
      content,
      direction: "outbound",
      metadata_json: {
        source: "internal_inbox",
        authored_by: input.authorId,
        authored_name: input.authorName
      },
      message_type: "text",
      sender_type: "human",
      send_status: sendResult.success ? "sent" : "failed",
      delivery_status: sendResult.success ? "accepted" : "failed",
      error_message: sendResult.error || null,
      is_read: true,
      read_at: now,
      received_at: now,
      failed_at: sendResult.success ? null : now
    });

    if (!sendResult.success) {
      await this.createEvent({
        sessionId: input.threadId,
        eventType: "human_reply_failed",
        actorType: "human",
        actorId: input.authorId,
        actorLabel: input.authorName,
        eventData: {
          error: sendResult.error || "unknown",
          summary: "Falha no envio da resposta humana."
        }
      });

      throw new Error(sendResult.error || "Falha ao enviar resposta humana pelo WhatsApp.");
    }

    await this.supabase
      .from("conversation_sessions")
      .update({
        thread_status: "waiting_client",
        waiting_for: "client",
        owner_mode: "human",
        owner_user_id: input.authorId,
        handoff_state: "active",
        last_outbound_at: now,
        last_message_at: now,
        last_message_preview: content.slice(0, 240),
        last_message_direction: "outbound",
        last_human_reply_at: now,
        unread_count: 0,
        updated_at: now
      })
      .eq("id", input.threadId);

    await this.supabase
      .from("conversation_messages")
      .update({
        is_read: true,
        read_at: now
      })
      .eq("session_id", input.threadId)
      .eq("direction", "inbound")
      .eq("is_read", false);

    await this.createEvent({
      sessionId: input.threadId,
      eventType: "human_reply_sent",
      actorType: "human",
      actorId: input.authorId,
      actorLabel: input.authorName,
      eventData: {
        summary: "Resposta humana enviada pelo painel e thread devolvida para espera do cliente.",
        messageLength: content.length
      }
    });

    return { ok: true, messageId: sendResult.messageId || null };
  }

  async sendInboxFollowUp(input: {
    clientId: string;
    pipelineId?: string | null;
    channel: "whatsapp";
    content: string;
    authorId: string;
    authorName: string;
    followUpMessageId?: string;
    messageType?: string;
  }) {
    const { data: channelRow, error } = await this.supabase
      .from("client_channels")
      .select("client_id, channel, external_user_id")
      .eq("client_id", input.clientId)
      .eq("channel", input.channel)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !channelRow) {
      throw new Error("Nao foi possivel localizar o canal ativo para consolidar o follow-up.");
    }

    const { data: session } = await this.supabase
      .from("conversation_sessions")
      .select("id")
      .eq("channel", input.channel)
      .eq("external_user_id", channelRow.external_user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session?.id) {
      throw new Error("A thread operacional ainda nao existe para este contato.");
    }

    const result = await this.sendHumanReply({
      threadId: session.id,
      content: input.content,
      authorId: input.authorId,
      authorName: input.authorName
    });

    const now = new Date().toISOString();

    await this.supabase
      .from("conversation_sessions")
      .update({
        follow_up_status: "resolved",
        follow_up_resolved_at: now,
        next_action_hint: "Aguardar retorno do cliente ao follow-up humano enviado pelo painel.",
        updated_at: now
      })
      .eq("id", session.id);

    const followUpPayload = {
      client_id: input.clientId,
      pipeline_id: input.pipelineId || null,
      channel: input.channel,
      message_type: input.messageType || "inbox_follow_up",
      status: "sent",
      content: input.content,
      sent_at: now,
      external_message_id: result.messageId || null,
      approved_by: input.authorName,
      metadata: {
        source: "conversation_inbox",
        sessionId: session.id,
        authorId: input.authorId
      }
    };

    if (input.followUpMessageId) {
      await this.supabase
        .from("follow_up_messages")
        .update(followUpPayload)
        .eq("id", input.followUpMessageId);
    } else {
      await this.supabase.from("follow_up_messages").insert(followUpPayload);
    }

    await this.createEvent({
      sessionId: session.id,
      eventType: "follow_up_unified_in_inbox",
      actorType: "human",
      actorId: input.authorId,
      actorLabel: input.authorName,
      eventData: {
        summary: "Follow-up consolidado e operado pela inbox.",
        pipelineId: input.pipelineId || null
      }
    });

    return result;
  }

  async reconcileWhatsAppMessageStatus(input: {
    externalMessageId: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp?: string | number | null;
    errorCode?: number | string | null;
    errorTitle?: string | null;
  }) {
    const eventTime =
      typeof input.timestamp === "number"
        ? new Date(input.timestamp * 1000).toISOString()
        : typeof input.timestamp === "string" && /^\d+$/.test(input.timestamp)
          ? new Date(Number(input.timestamp) * 1000).toISOString()
          : new Date().toISOString();

    const baseUpdates: Record<string, unknown> = {
      send_status: input.status,
      delivery_status: input.status,
      error_message: input.status === "failed" ? input.errorTitle || "WhatsApp delivery failure" : null
    };

    if (input.status === "delivered") {
      baseUpdates.read_at = null;
    }

    if (input.status === "read") {
      baseUpdates.is_read = true;
      baseUpdates.read_at = eventTime;
    }

    if (input.status === "failed") {
      baseUpdates.failed_at = eventTime;
    }

    const { data: message, error } = await this.supabase
      .from("conversation_messages")
      .update(baseUpdates)
      .eq("external_message_id", input.externalMessageId)
      .select("id, session_id")
      .maybeSingle();

    if (error || !message) {
      return { ok: false };
    }

    await this.supabase
      .from("follow_up_messages")
      .update({
        status:
          input.status === "read"
            ? "replied"
            : input.status === "failed"
              ? "cancelled"
              : "sent",
        delivered_at: input.status === "delivered" || input.status === "read" ? eventTime : undefined,
        read_at: input.status === "read" ? eventTime : undefined,
        error_message: input.status === "failed" ? input.errorTitle || "WhatsApp delivery failure" : undefined,
        updated_at: eventTime
      })
      .eq("external_message_id", input.externalMessageId);

    const sessionUpdates: Record<string, unknown> = {
      last_status_event_at: eventTime,
      updated_at: eventTime
    };

    if (input.status === "read") {
      sessionUpdates.waiting_for = "client";
    }

    if (input.status === "failed") {
      sessionUpdates.thread_status = "waiting_human";
      sessionUpdates.waiting_for = "human";
      sessionUpdates.next_action_hint =
        "Mensagem falhou no WhatsApp. Revisar o envio, validar numero e decidir retry humano.";
      sessionUpdates.follow_up_status = "due";
    }

    await this.supabase.from("conversation_sessions").update(sessionUpdates).eq("id", message.session_id);

    await this.createEvent({
      sessionId: message.session_id,
      eventType: "whatsapp_status_reconciled",
      actorType: "system",
      eventData: {
        summary: `Status do WhatsApp reconciliado como ${input.status}.`,
        status: input.status,
        externalMessageId: input.externalMessageId,
        errorCode: input.errorCode || null,
        errorTitle: input.errorTitle || null
      }
    });

    return { ok: true, sessionId: message.session_id };
  }

  async addThreadNote(input: {
    threadId: string;
    body: string;
    authorId: string;
    authorName: string;
    kind?: "operational" | "next_action" | "sensitive" | "context";
    isSensitive?: boolean;
  }) {
    const body = input.body.trim();

    if (!body) {
      throw new Error("A nota interna nao pode estar vazia.");
    }

    const kind = input.kind || "operational";
    const now = new Date().toISOString();

    const { error } = await this.supabase.from("conversation_notes").insert({
      session_id: input.threadId,
      author_id: input.authorId,
      author_name: input.authorName,
      note_body: body,
      note_kind: kind,
      is_sensitive: Boolean(input.isSensitive),
      metadata: {}
    });

    if (error) {
      throw new Error(`Nao foi possivel registrar a nota: ${error.message}`);
    }

    await this.supabase
      .from("conversation_sessions")
      .update({
        internal_notes: kind === "next_action" ? body : undefined,
        updated_at: now
      })
      .eq("id", input.threadId);

    await this.createEvent({
      sessionId: input.threadId,
      eventType: "thread_note_added",
      actorType: "human",
      actorId: input.authorId,
      actorLabel: input.authorName,
      eventData: {
        summary: "Nota interna adicionada a memoria operacional da thread.",
        noteKind: kind,
        sensitive: Boolean(input.isSensitive)
      }
    });

    return { ok: true };
  }

  async updateThreadState(input: {
    threadId: string;
    actorId: string;
    actorName: string;
    threadStatus?: ThreadStatus;
    waitingFor?: WaitingFor;
    priority?: Priority;
    ownerMode?: OwnerMode;
    handoffState?: HandoffState;
    handoffReason?: string | null;
    aiEnabled?: boolean;
    markRead?: boolean;
    internalNotes?: string | null;
    nextActionHint?: string | null;
    followUpStatus?: "none" | "pending" | "due" | "overdue" | "resolved" | "converted";
    followUpDueAt?: string | null;
    prioritySource?: "manual" | "inferred" | "hybrid";
    sensitivityLevel?: "low" | "normal" | "high";
  }) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    const eventData: Record<string, unknown> = {};

    if (input.threadStatus) {
      updates.thread_status = input.threadStatus;
      eventData.threadStatus = input.threadStatus;
    }
    if (input.waitingFor) {
      updates.waiting_for = input.waitingFor;
      eventData.waitingFor = input.waitingFor;
    }
    if (input.priority) {
      updates.priority = input.priority;
      eventData.priority = input.priority;
    }
    if (input.ownerMode) {
      updates.owner_mode = input.ownerMode;
      updates.owner_user_id = input.actorId;
      eventData.ownerMode = input.ownerMode;
    }
    if (input.handoffState) {
      updates.handoff_state = input.handoffState;
      eventData.handoffState = input.handoffState;
    }
    if (input.handoffReason !== undefined) {
      updates.handoff_reason = input.handoffReason;
      eventData.handoffReason = input.handoffReason;
    }
    if (typeof input.aiEnabled === "boolean") {
      updates.ai_enabled = input.aiEnabled;
      eventData.aiEnabled = input.aiEnabled;
    }
    if (input.internalNotes !== undefined) {
      updates.internal_notes = input.internalNotes;
      eventData.internalNotesUpdated = true;
    }
    if (input.nextActionHint !== undefined) {
      updates.next_action_hint = input.nextActionHint;
      eventData.nextActionHint = input.nextActionHint;
    }
    if (input.followUpStatus) {
      updates.follow_up_status = input.followUpStatus;
      eventData.followUpStatus = input.followUpStatus;
      if (input.followUpStatus === "resolved" || input.followUpStatus === "converted") {
        updates.follow_up_resolved_at = new Date().toISOString();
      }
    }
    if (input.followUpDueAt !== undefined) {
      updates.follow_up_due_at = input.followUpDueAt;
      eventData.followUpDueAt = input.followUpDueAt;
    }
    if (input.prioritySource) {
      updates.priority_source = input.prioritySource;
      eventData.prioritySource = input.prioritySource;
    }
    if (input.sensitivityLevel) {
      updates.sensitivity_level = input.sensitivityLevel;
      eventData.sensitivityLevel = input.sensitivityLevel;
    }
    if (input.markRead) {
      updates.unread_count = 0;
      if (!updates.thread_status) {
        updates.thread_status = "waiting_human";
      }
      eventData.markRead = true;
    }

    const { error } = await this.supabase
      .from("conversation_sessions")
      .update(updates)
      .eq("id", input.threadId);

    if (error) {
      throw new Error(`Nao foi possivel atualizar a thread: ${error.message}`);
    }

    if (input.markRead) {
      await this.supabase
        .from("conversation_messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq("session_id", input.threadId)
        .eq("direction", "inbound")
        .eq("is_read", false);
    }

    await this.createEvent({
      sessionId: input.threadId,
      eventType: input.markRead ? "thread_marked_read" : "thread_status_updated",
      actorType: "human",
      actorId: input.actorId,
      actorLabel: input.actorName,
      eventData
    });

    return { ok: true };
  }
}

export const conversationInboxService = new ConversationInboxService();
