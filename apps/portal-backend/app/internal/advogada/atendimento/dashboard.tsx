"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Flame,
  MessageSquareText,
  NotebookPen,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Workflow
} from "lucide-react";

import {
  DecisionTile,
  DetailList,
  InfoPair,
  MetricTile,
  PanelCard,
  SignalBadge
} from "@/components/crm/commercial-primitives";
import {
  ActionToolbar,
  ComposerPanel,
  ConversationBubble,
  InboxThreadListItem
} from "@/components/inbox/premium-primitives";
import { PremiumStatePanel } from "@/components/portal/premium-experience";

import {
  presentBoolean,
  presentChannelOrigin,
  presentMaybeId,
  presentToken
} from "./presentation.ts";

type Metrics = {
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
  instagramVolume: number;
  youtubeVolume: number;
  youtubeCommentSignals: number;
  youtubeHotThreads: number;
  instagramDmVolume: number;
  instagramCommentSignals: number;
  instagramWaitingHumanCount: number;
  instagramHandoffCount: number;
  instagramFollowUpPendingCount: number;
  instagramHotThreads: number;
  founderOrWaitlistInstagramThreads: number;
  siteVolume: number;
  siteWaitingHumanCount: number;
  siteHandoffCount: number;
  siteFollowUpPendingCount: number;
  siteHotThreads: number;
  siteQualifiedThreads: number;
  telegramVolume: number;
  telegramPrivateVolume: number;
  telegramGroupSignals: number;
  telegramWaitingHumanCount: number;
  telegramHandoffCount: number;
  telegramFollowUpPendingCount: number;
  telegramHotThreads: number;
  firstResponseTimeMinutes: number | null;
  humanResponseTimeMinutes: number | null;
  failedMessagesCount: number;
  deliveredMessagesCount: number;
  readMessagesCount: number;
};

type ThreadItem = {
  id: string;
  channel: "instagram" | "facebook" | "youtube" | "whatsapp" | "site" | "portal" | "telegram";
  channelLabel: string;
  threadOriginType:
    | "dm"
    | "comment"
    | "comment_to_dm"
    | "youtube_comment"
    | "site_chat"
    | "telegram_private"
    | "telegram_group"
    | "unknown";
  threadOriginLabel: string;
  displayName: string;
  contactLabel: string;
  identityStatus: "resolved" | "provisional" | "pending";
  identityStatusLabel: string;
  identitySourceLabel: string;
  preview: string;
  lastMessageAt: string | null;
  threadStatus: string;
  waitingFor: string;
  priority: "low" | "medium" | "high";
  unreadCount: number;
  ownerMode: "ai" | "human" | "hybrid";
  handoffState: string;
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

type ThreadDetail = {
  thread: ThreadItem & {
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
    surface:
      | "direct_message"
      | "public_comment"
      | "site_chat"
      | "telegram_private"
      | "telegram_group"
      | "system";
    socialOrigin: string | null;
    createdAt: string;
    isRead: boolean;
    errorMessage: string | null;
  }>;
  context: {
    person: {
      name: string;
      identityStatus: "resolved" | "provisional" | "pending";
      identityStatusLabel: string;
      identitySourceLabel: string;
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
    commercial: {
      clientId: string | null;
      clientChannelId: string | null;
      pipelineId: string | null;
      ownerProfileId: string | null;
      ownerAssignedAt: string | null;
      nextStep: string | null;
      nextStepDueAt: string | null;
      waitingOn: string | null;
      followUpState: string | null;
      followUpReason: string | null;
      latestNoteBody: string | null;
      latestNoteAt: string | null;
      consultationReadiness: string | null;
      conversionStage: string | null;
      recommendedAction: string | null;
      recommendedActionLabel: string | null;
      recommendedActionDetail: string | null;
      conversionSignal: string | null;
      blockingReason: string | null;
      objectionState: string | null;
      objectionHint: string | null;
      opportunityState: string | null;
      consultationRecommendationState: string | null;
      consultationRecommendationReason: string | null;
      consultationSuggestedCopy: string | null;
      recommendedFollowUpWindow: string | null;
      advancementReason: string | null;
      consultationOfferState: string | null;
      consultationOfferSentAt: string | null;
      consultationOfferReason: string | null;
      consultationOfferCopy: string | null;
      consultationOfferAmount: number | null;
      schedulingState: string | null;
      schedulingIntent: string | null;
      schedulingSuggestedAt: string | null;
      leadSchedulePreference: string | null;
      desiredScheduleWindow: string | null;
      scheduleConfirmedAt: string | null;
      paymentState: string | null;
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
      closingState: string | null;
      closingBlockReason: string | null;
      closingSignal: string | null;
      closingNextStep: string | null;
      closingRecommendedAction: string | null;
      closingRecommendedActionLabel: string | null;
      closingRecommendedActionDetail: string | null;
      closingCopySuggestion: string | null;
      linkedChannels: Array<{
        channel: string;
        externalUserId: string;
        displayName: string | null;
      }>;
    };
    social: {
      sourceLabel: string | null;
      entryType: string | null;
      directTransitionStatus: string | null;
      topicLabel: string | null;
      campaignLabel: string | null;
      contentLabel: string | null;
      contentType: string | null;
      contentPlatformId: string | null;
      commentId: string | null;
      commentText: string | null;
      publicCommentDecision: string | null;
      publicCommentSafety: string | null;
      operatorAction: string | null;
      rationale: string | null;
    };
    origin: {
      sourceLabel: string | null;
      visitorStage: string | null;
      sessionId: string | null;
      pagePath: string | null;
      pageTitle: string | null;
      articleTitle: string | null;
      ctaLabel: string | null;
      campaignLabel: string | null;
      topicLabel: string | null;
      contentId: string | null;
      referrer: string | null;
      acquisitionTags: string[];
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
    };
    telegram: {
      surface: "private" | "group" | "channel" | "unknown";
      chatId: string | null;
      username: string | null;
      groupTitle: string | null;
      relevance: string | null;
      shouldMoveToPrivate: boolean;
      replyMessageId: string | null;
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

type ApiPayload = {
  threads: ThreadItem[];
  metrics: Metrics;
  selectedThread: ThreadDetail | null;
};

type ApiErrorPayload = {
  error?: string;
  code?: string;
  schemaVersion?: string;
  surface?: string;
  missing?: Array<{
    table: string;
    columns: string[];
  }>;
};

type Filters = {
  search: string;
  status: string;
  channel: string;
  waitingFor: string;
  priority: string;
  inboxMode: string;
  founderScope: string;
  paymentState: string;
};

const initialFilters: Filters = {
  search: "",
  status: "all",
  channel: "all",
  waitingFor: "all",
  priority: "all",
  inboxMode: "all",
  founderScope: "all",
  paymentState: "all"
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatMissingSchemaEntries(missing: ApiErrorPayload["missing"]) {
  if (!missing?.length) {
    return "Sem detalhes adicionais do drift.";
  }

  return missing.map((entry) => `${entry.table}(${entry.columns.join(", ")})`).join("; ");
}

function buildInboxLoadError(payload: ApiErrorPayload) {
  if (payload.code === "schema_incompatible") {
    return (
      "Inbox em saneamento estrutural: o ambiente atual ainda não concluiu o schema " +
      `${payload.schemaVersion || "phase 13"} exigido pela fila conversacional. ` +
      `Itens ausentes: ${formatMissingSchemaEntries(payload.missing)}.`
    );
  }

  return payload.error || "Falha ao carregar a inbox.";
}

function buildEmptyStateMessage(filters: Filters) {
  if (filters.channel === "whatsapp") {
    return "Nenhuma conversa de WhatsApp corresponde aos filtros atuais.";
  }

  if (filters.channel === "instagram") {
    return "Nenhuma conversa de Instagram corresponde aos filtros atuais.";
  }

  if (filters.channel === "telegram") {
    return "Nenhuma conversa de Telegram corresponde aos filtros atuais.";
  }

  if (filters.channel === "site") {
    return "Nenhuma conversa do site corresponde aos filtros atuais.";
  }

  if (filters.inboxMode === "needs_human") {
    return "Nenhuma oportunidade pede atuação humana com os filtros atuais.";
  }

  return "Nenhuma conversa encontrada para os filtros atuais.";
}

function toneForPriority(priority: string) {
  if (priority === "high") return "rose";
  if (priority === "medium") return "gold";
  return "green";
}

function toneForOwner(mode: string) {
  if (mode === "human") return "plum";
  if (mode === "hybrid") return "gold";
  return "blue";
}

function toneForFollowUp(status: string) {
  if (status === "overdue") return "rose";
  if (status === "due" || status === "pending") return "gold";
  if (status === "resolved" || status === "converted") return "green";
  return "neutral";
}

function toneForRisk(hasRisk: boolean) {
  return hasRisk ? "rose" : "green";
}

function toneForOpportunity(state: string | null | undefined) {
  if (state === "closing" || state === "hot") return "gold";
  if (state === "warm") return "plum";
  return "neutral";
}

function toneForChannel(channel: string) {
  if (channel === "instagram") return "plum";
  if (channel === "whatsapp") return "green";
  if (channel === "telegram") return "blue";
  if (channel === "site") return "gold";
  return "neutral";
}

function messageSurfaceLabel(surface: ThreadDetail["messages"][number]["surface"]) {
  if (surface === "public_comment") return "Comentário";
  if (surface === "direct_message") return "Mensagem direta";
  if (surface === "telegram_private") return "Telegram privado";
  if (surface === "telegram_group") return "Telegram grupo";
  if (surface === "site_chat") return "Site";
  return "Sistema";
}

function senderLabel(sender: ThreadDetail["messages"][number]["senderType"]) {
  if (sender === "contact") return "Contato";
  if (sender === "human") return "Equipe";
  if (sender === "ai") return "IA";
  return "Sistema";
}

function messageStatusLabel(value: string) {
  return presentToken(value, "Sem status");
}

function noteKindLabel(value: string) {
  return presentToken(value, "Nota interna");
}

function buildExecutiveSnapshot(thread: ThreadDetail | null) {
  if (!thread) {
    return null;
  }

  const officialNextAction =
    thread.context.commercial.closingRecommendedActionLabel ||
    thread.context.commercial.recommendedActionLabel ||
    thread.context.operational.nextSuggestedAction ||
    "Revisão manual";

  const officialNextActionDetail =
    thread.context.commercial.closingRecommendedActionDetail ||
    thread.context.commercial.recommendedActionDetail ||
    thread.context.commercial.closingNextStep ||
    thread.context.commercial.nextStep ||
    thread.context.operational.nextSuggestedActionDetail ||
    thread.thread.nextAction;

  const blockingReason =
    thread.context.commercial.closingBlockReason ||
    thread.context.commercial.blockingReason ||
    thread.context.commercial.followUpReason ||
    thread.context.operational.handoffReason ||
    null;

  const followUpLabel =
    thread.context.commercial.recommendedFollowUpWindow ||
    (thread.context.operational.followUpDueAt
      ? `Até ${formatDateTime(thread.context.operational.followUpDueAt)}`
      : "Sem janela definida");

  return {
    title: thread.context.person.name,
    stage: presentToken(thread.context.commercial.conversionStage || thread.context.lead.stage, "Em leitura"),
    temperature: thread.thread.hot
      ? "Quente"
      : presentToken(thread.context.lead.temperature || thread.context.commercial.opportunityState, "Em leitura"),
    priority: presentToken(thread.thread.priority, "Prioridade moderada"),
    owner: thread.thread.assignedTo.name || presentToken(thread.thread.ownerMode, "Sem responsável"),
    source: presentChannelOrigin(
      thread.context.origin.sourceLabel ||
        thread.context.social.sourceLabel ||
        thread.context.lead.sourceChannel ||
        thread.thread.channelLabel
    ),
    officialNextAction,
    officialNextActionDetail,
    followUpLabel,
    readiness: presentToken(thread.context.commercial.consultationReadiness, "Sem leitura"),
    risk: blockingReason ? presentToken(blockingReason, "Risco não classificado") : "Sem trava dominante",
    opportunity: presentToken(thread.context.commercial.opportunityState, "Monitorar"),
    recommendation:
      thread.context.commercial.consultationRecommendationReason ||
      thread.context.commercial.conversionSignal ||
      "Leitura comercial sem recomendação complementar.",
    hasRisk: Boolean(blockingReason)
  };
}

export function ConversationInboxDashboard({
  initialPayload = null,
  initialSelectedThreadId = null
}: {
  initialPayload?: ApiPayload | null;
  initialSelectedThreadId?: string | null;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [payload, setPayload] = useState<ApiPayload | null>(initialPayload);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialSelectedThreadId || initialPayload?.selectedThread?.thread.id || null
  );
  const [loading, setLoading] = useState(initialPayload ? false : true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [noteComposer, setNoteComposer] = useState("");
  const [noteKind, setNoteKind] = useState("operational");
  const [error, setError] = useState<string | null>(null);

  const routeFilters = useMemo<Filters>(() => {
    const nextFilters = { ...initialFilters };
    const allowedChannels = new Set(["all", "instagram", "whatsapp", "site", "portal", "telegram"]);
    const allowedStatus = new Set([
      "all",
      "new",
      "unread",
      "waiting_human",
      "waiting_client",
      "ai_active",
      "handoff",
      "closed",
      "archived"
    ]);
    const allowedWaitingFor = new Set(["all", "human", "client", "ai", "none"]);
    const allowedPriority = new Set(["all", "high", "medium", "low"]);
    const allowedInboxMode = new Set([
      "all",
      "needs_human",
      "customer_turn",
      "ai_control",
      "hot",
      "follow_up_due",
      "follow_up_overdue"
    ]);
    const allowedFounderScope = new Set(["all", "founder", "waitlist"]);
    const allowedPaymentState = new Set(["all", "pending", "approved"]);

    const search = searchParams.get("search");
    if (search) nextFilters.search = search;

    const status = searchParams.get("status");
    if (status && allowedStatus.has(status)) nextFilters.status = status;

    const channel = searchParams.get("channel");
    if (channel && allowedChannels.has(channel)) nextFilters.channel = channel;

    const waitingFor = searchParams.get("waitingFor");
    if (waitingFor && allowedWaitingFor.has(waitingFor)) nextFilters.waitingFor = waitingFor;

    const priority = searchParams.get("priority");
    if (priority && allowedPriority.has(priority)) nextFilters.priority = priority;

    const inboxMode = searchParams.get("inboxMode");
    if (inboxMode && allowedInboxMode.has(inboxMode)) nextFilters.inboxMode = inboxMode;

    const founderScope = searchParams.get("founderScope");
    if (founderScope && allowedFounderScope.has(founderScope)) nextFilters.founderScope = founderScope;

    const paymentState = searchParams.get("paymentState");
    if (paymentState && allowedPaymentState.has(paymentState)) nextFilters.paymentState = paymentState;

    return nextFilters;
  }, [searchParams]);

  const routeSelectedThreadId = searchParams.get("selectedThreadId");

  useEffect(() => {
    setFilters((current) => {
      const hasChanged = (Object.keys(routeFilters) as Array<keyof Filters>).some(
        (key) => current[key] !== routeFilters[key]
      );

      return hasChanged ? routeFilters : current;
    });
  }, [routeFilters]);

  useEffect(() => {
    if (routeSelectedThreadId) {
      setSelectedThreadId(routeSelectedThreadId);
    }
  }, [routeSelectedThreadId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      }
    });

    if (selectedThreadId) {
      params.set("selectedThreadId", selectedThreadId);
    }

    return params.toString();
  }, [filters, selectedThreadId]);

  async function loadInbox() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/internal/conversations?${queryString}`, {
        cache: "no-store"
      });
      const json = (await response.json()) as ApiErrorPayload & { data?: ApiPayload };

      if (!response.ok) {
        throw new Error(buildInboxLoadError(json));
      }

      const nextPayload = json.data as ApiPayload;
      setPayload(nextPayload);

      if (!selectedThreadId && nextPayload.threads.length > 0) {
        setSelectedThreadId(nextPayload.threads[0].id);
      }
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "Falha inesperada na inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInbox();
  }, [queryString]);

  async function markThreadRead() {
    if (!selectedThreadId) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/internal/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateThreadState",
          threadId: selectedThreadId,
          markRead: true,
          threadStatus: "waiting_human",
          waitingFor: "human"
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao atualizar a thread.");

      await loadInbox();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Falha ao atualizar a thread.");
    } finally {
      setSending(false);
    }
  }

  async function updateThreadState(nextPayload: Record<string, unknown>) {
    if (!selectedThreadId) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/internal/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateThreadState",
          threadId: selectedThreadId,
          ...nextPayload
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao atualizar a thread.");

      await loadInbox();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Falha ao atualizar a thread.");
    } finally {
      setSending(false);
    }
  }

  async function sendHumanReply() {
    if (!selectedThreadId || !composer.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/internal/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendHumanReply",
          threadId: selectedThreadId,
          content: composer
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao enviar resposta humana.");

      setComposer("");
      await loadInbox();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Falha ao enviar resposta.");
    } finally {
      setSending(false);
    }
  }

  async function scheduleFollowUp(status: "due" | "overdue" | "resolved") {
    if (!selectedThreadId) return;

    const dueAt =
      status === "resolved"
        ? null
        : new Date(Date.now() + (status === "overdue" ? -2 : 24) * 60 * 60 * 1000).toISOString();

    await updateThreadState({
      followUpStatus: status,
      followUpDueAt: dueAt,
      waitingFor: status === "resolved" ? "client" : "human",
      nextActionHint:
        status === "resolved"
          ? "Follow-up tratado. Agora a conversa aguarda retorno do cliente."
          : status === "overdue"
            ? "Follow-up vencido. Priorizar contato humano ainda hoje."
            : "Follow-up marcado para a rotina do dia."
    });
  }

  async function addThreadNote() {
    if (!selectedThreadId || !noteComposer.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/internal/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addThreadNote",
          threadId: selectedThreadId,
          body: noteComposer,
          kind: noteKind
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao registrar nota interna.");

      setNoteComposer("");
      await loadInbox();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Falha ao salvar nota.");
    } finally {
      setSending(false);
    }
  }

  const selectedThread = payload?.selectedThread || null;
  const executive = buildExecutiveSnapshot(selectedThread);

  const executiveMetrics = payload
    ? [
        {
          label: "Conversas abertas",
          value: payload.metrics.totalOpenThreads,
          helper: "Base viva do funil comercial.",
          icon: <MessageSquareText className="h-5 w-5" />
        },
        {
          label: "Pedindo atuação humana",
          value: payload.metrics.waitingHumanCount,
          helper: "Prioridade direta da equipe.",
          icon: <UserRound className="h-5 w-5" />
        },
        {
          label: "Oportunidades quentes",
          value: payload.metrics.hotThreads,
          helper: "Conversas com maior chance de avanço.",
          icon: <Flame className="h-5 w-5" />
        },
        {
          label: "Pagamento em aberto",
          value: payload.metrics.paymentPendingThreads,
          helper: "Decisões comerciais ainda não concluídas.",
          icon: <CircleDollarSign className="h-5 w-5" />
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#ddd2bf] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(243,236,224,0.97))] px-6 py-6 shadow-[0_18px_50px_rgba(16,38,29,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6a3d]">
              Inbox premium | central de relacionamento
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#10261d]">
              Conversas, handoff e próxima ação com leitura executiva
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5e6e65]">
              Esta central organiza conversa, responsável, follow-up e contexto comercial sem
              perder o histórico operacional nem competir com o CRM de conversão.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInbox()}
            className="inline-flex items-center gap-2 rounded-full border border-[#d6ccba] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#bca57f]"
          >
            <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} />
            Atualizar leitura
          </button>
        </div>

        {executive ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="rounded-[1.8rem] border border-[rgba(142,106,59,0.14)] bg-[#fffdf9] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">
                    Cabeçalho executivo
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#10261d]">
                    {executive.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61716a]">
                    {executive.recommendation}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SignalBadge label={executive.stage} tone="gold" />
                  <SignalBadge
                    label={executive.temperature}
                    tone={selectedThread?.thread.hot ? "rose" : toneForOpportunity(selectedThread?.context.commercial.opportunityState)}
                  />
                  <SignalBadge label={executive.priority} tone={toneForPriority(selectedThread?.thread.priority || "low")} />
                  <SignalBadge label={executive.source} tone={toneForChannel(selectedThread?.thread.channel || "portal")} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoPair label="Responsável comercial" value={executive.owner} valueClassName="font-semibold text-[#10261d]" />
                <InfoPair label="Prontidão para consulta" value={executive.readiness} />
                <InfoPair label="Risco dominante" value={executive.risk} />
                <InfoPair label="Janela de oportunidade" value={executive.opportunity} />
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[rgba(19,37,31,0.1)] bg-[#13251f] p-5 text-white shadow-[0_16px_44px_rgba(16,38,29,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8bc87]">
                Barra de decisão
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                {executive.officialNextAction}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#d4ddd7]">{executive.officialNextActionDetail}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[rgba(216,188,135,0.18)] bg-[rgba(255,255,255,0.04)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d8bc87]">
                    Follow-up oficial
                  </p>
                  <p className="mt-2 text-sm text-white">{executive.followUpLabel}</p>
                </div>
                <div className="rounded-[1.4rem] border border-[rgba(216,188,135,0.18)] bg-[rgba(255,255,255,0.04)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d8bc87]">
                    Macrostatus
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {presentToken(selectedThread?.thread.threadStatus, "Em leitura")} •{" "}
                    {presentToken(selectedThread?.thread.waitingFor, "Sem fila")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {executiveMetrics.map((item) => (
          <MetricTile key={item.label} {...item} />
        ))}
      </section>

      {executive ? (
        <section className="grid gap-4 xl:grid-cols-4">
          <DecisionTile
            label="Próxima ação"
            title={executive.officialNextAction}
            description={executive.officialNextActionDetail}
            tone="gold"
          />
          <DecisionTile
            label="Follow-up real"
            title={presentToken(selectedThread?.context.commercial.followUpState || selectedThread?.context.operational.followUpStatus, "Sem follow-up")}
            description={executive.followUpLabel}
            tone={toneForFollowUp(selectedThread?.context.operational.followUpStatus || "none")}
          />
          <DecisionTile
            label="Consulta e avanço"
            title={presentToken(selectedThread?.context.commercial.consultationRecommendationState, "Manter em preparo")}
            description={
              selectedThread?.context.commercial.consultationRecommendationReason ||
              "A leitura comercial ainda não encontrou uma recomendação de avanço adicional."
            }
            tone="green"
          />
          <DecisionTile
            label="Risco e objeção"
            title={executive.risk}
            description={
              selectedThread?.context.commercial.objectionHint ||
              selectedThread?.context.commercial.advancementReason ||
              "Sem objeção dominante registrada nesta conversa."
            }
            tone={toneForRisk(executive.hasRisk)}
          />
        </section>
      ) : null}

      {error ? (
        <PremiumStatePanel
          tone="error"
          eyebrow="Falha controlada"
          title="A central de atendimento nao conseguiu concluir esta leitura."
          description={error}
        />
      ) : null}

      <PanelCard
        eyebrow="Recorte estratégico"
        title="Filtros da central de relacionamento"
        description="Refine a fila por estágio, responsável, canal, prioridade e situação de pagamento sem poluir a leitura principal."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Buscar nome, contexto ou motivo"
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none transition focus:border-[#b49767]"
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todos os macrostatus</option>
            <option value="waiting_human">Aguardando atuação humana</option>
            <option value="waiting_client">Aguardando retorno do cliente</option>
            <option value="handoff">Em transição</option>
            <option value="ai_active">IA conduzindo</option>
          </select>
          <select
            value={filters.channel}
            onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todos os canais</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="site">Site</option>
            <option value="telegram">Telegram</option>
          </select>
          <select
            value={filters.waitingFor}
            onChange={(event) => setFilters((current) => ({ ...current, waitingFor: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todas as filas</option>
            <option value="human">Fila humana</option>
            <option value="client">Fila cliente</option>
            <option value="ai">Fila da IA</option>
          </select>
          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todas as prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Moderada</option>
            <option value="low">Baixa</option>
          </select>
          <select
            value={filters.inboxMode}
            onChange={(event) => setFilters((current) => ({ ...current, inboxMode: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Visão completa</option>
            <option value="needs_human">Precisa de atuação humana</option>
            <option value="customer_turn">Esperando cliente</option>
            <option value="ai_control">IA no comando</option>
            <option value="hot">Somente quentes</option>
            <option value="follow_up_due">Follow-up do dia</option>
            <option value="follow_up_overdue">Follow-up vencido</option>
          </select>
          <select
            value={filters.founderScope}
            onChange={(event) => setFilters((current) => ({ ...current, founderScope: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Fundadora e lista de espera</option>
            <option value="founder">Somente fundadora</option>
            <option value="waitlist">Somente lista de espera</option>
          </select>
          <select
            value={filters.paymentState}
            onChange={(event) => setFilters((current) => ({ ...current, paymentState: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Estado de pagamento</option>
            <option value="pending">Pagamento pendente</option>
            <option value="approved">Pagamento aprovado</option>
          </select>
        </div>
      </PanelCard>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.28fr_0.84fr]">
        <PanelCard
          eyebrow="Lista de conversas"
          title="Fila viva"
          description="A coluna lateral agora funciona como inbox premium: nome, última mensagem, tempo, sinais sutis de prioridade e leitura rápida do que pede atenção."
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.3rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Pedem humano</p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">{payload?.metrics.waitingHumanCount || 0}</p>
            </div>
            <div className="rounded-[1.3rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Quentes</p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">{payload?.metrics.hotThreads || 0}</p>
            </div>
            <div className="rounded-[1.3rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Retomada pendente</p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">{payload?.metrics.followUpPendingCount || 0}</p>
            </div>
          </div>
          <div className="max-h-[980px] overflow-y-auto pr-1">
            {loading && !payload?.threads.length ? (
              <PremiumStatePanel
                tone="neutral"
                eyebrow="Fila viva"
                title="Estamos organizando as conversas."
                description="A fila de relacionamento esta sendo preparada com prioridade, handoff e contexto comercial."
              />
            ) : payload?.threads.length ? (
              <div className="space-y-3">
                {payload.threads.map((thread) => (
                  <InboxThreadListItem
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    active={selectedThreadId === thread.id}
                    unreadLabel={thread.unreadCount > 0 ? `${thread.unreadCount} não lidas` : null}
                    name={thread.displayName}
                    subtitle={thread.contactLabel}
                    preview={thread.preview}
                    meta={thread.idleMinutes ? `${thread.idleMinutes} min` : formatDateTime(thread.lastMessageAt)}
                    badges={
                      <>
                        <SignalBadge label={thread.channelLabel} tone={toneForChannel(thread.channel)} />
                        <SignalBadge label={presentToken(thread.priority)} tone={toneForPriority(thread.priority)} />
                        {thread.hot ? <SignalBadge label="Quente" tone="rose" /> : null}
                      </>
                    }
                  />
                ))}
              </div>
            ) : (
              <PremiumStatePanel
                tone="neutral"
                eyebrow="Fila viva"
                title="Nenhuma conversa apareceu neste recorte."
                description={buildEmptyStateMessage(filters)}
              />
            )}
          </div>
        </PanelCard>

        <div className="space-y-5">
          <PanelCard
            eyebrow="Thread ativa"
            title={selectedThread ? "Conversa em andamento" : "Fluxo da conversa"}
            description={
              selectedThread
                ? "A thread vira o centro da experiência: histórico, resposta e próxima ação aparecem em fluxo, com menos ruído operacional."
                : "Selecione uma conversa para abrir o histórico vivo, responder com fluidez e decidir a próxima ação."
            }
            actions={
              selectedThread ? (
                <>
                  <SignalBadge label={presentToken(selectedThread.thread.threadStatus)} tone="slate" />
                  <SignalBadge label={presentToken(selectedThread.thread.waitingFor)} tone="neutral" />
                </>
              ) : null
            }
          >
            {selectedThread ? (
              <>
                <ActionToolbar>
                  <button
                    type="button"
                    onClick={() => void markThreadRead()}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Assumir thread
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void updateThreadState({
                        ownerMode: "human",
                        waitingFor: "human",
                        threadStatus: "waiting_human",
                        handoffState: "active"
                      })
                    }
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Colocar sob cuidado humano
                  </button>
                  <details className="rounded-[1.25rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3 text-xs leading-6 text-[#6f7f77]">
                    <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">
                      Acoes operacionais avancadas
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void updateThreadState({
                        ownerMode: "ai",
                        waitingFor: "ai",
                        threadStatus: "ai_active",
                        handoffState: "resolved",
                        aiEnabled: true
                      })
                    }
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Devolver para IA
                  </button>
                  <button
                    type="button"
                    onClick={() => void scheduleFollowUp("due")}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Programar retomada
                  </button>
                  <button
                    type="button"
                    onClick={() => void scheduleFollowUp("overdue")}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Marcar vencimento de hoje
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void updateThreadState({
                        threadStatus: "closed",
                        waitingFor: "none",
                        followUpStatus: "resolved"
                      })
                    }
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Encerrar conversa
                  </button>
                    </div>
                  </details>
                  <div className="rounded-[1.25rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3 text-xs leading-6 text-[#6f7f77]">
                    Responsável, fila, retomada e handoff continuam rastreados aqui, mas o foco principal da decisão fica concentrado no cabeçalho executivo e na barra de decisão.
                  </div>
                </ActionToolbar>

                <div className="mt-5 max-h-[560px] space-y-4 overflow-y-auto rounded-[1.9rem] border border-[#ece2d3] bg-[linear-gradient(180deg,#fffefa,#faf4ea)] p-4 pr-3">
                  {selectedThread.messages.map((message) => (
                    <ConversationBubble
                      key={message.id}
                      direction={message.direction === "outbound" ? "outgoing" : "incoming"}
                      emphasized={message.senderType === "human"}
                      header={
                        <>
                          <span>{senderLabel(message.senderType)}</span>
                          <span>{messageSurfaceLabel(message.surface)}</span>
                          <span>{messageStatusLabel(message.sendStatus)}</span>
                          <span>{formatDateTime(message.createdAt)}</span>
                        </>
                      }
                      footer={
                        <>
                          {message.socialOrigin ? (
                            <span>Origem {presentChannelOrigin(message.socialOrigin)}</span>
                          ) : null}
                          {message.errorMessage ? (
                            <span className="block text-[#ffd1c2]">{message.errorMessage}</span>
                          ) : null}
                        </>
                      }
                    >
                      {message.content}
                    </ConversationBubble>
                  ))}
                </div>

                <ComposerPanel
                  eyebrow="Responder conversa"
                  textarea={
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                        placeholder="Escreva uma resposta clara, humana e premium, preservando contexto, tom institucional e o próximo passo."
                      rows={4}
                      className="w-full resize-none rounded-[1.5rem] border border-[#d8cfbf] bg-white px-4 py-4 text-sm text-[#10261d] outline-none transition focus:border-[#b28b54]"
                    />
                  }
                  helper="O histórico do canal, o responsável e o handoff continuam preservados enquanto você responde com continuidade e tom premium."
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => void scheduleFollowUp("due")}
                        disabled={sending}
                        className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                      >
                        Agendar retomada
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendHumanReply()}
                        disabled={sending || !composer.trim()}
                        className="inline-flex items-center gap-2 rounded-full bg-[#10261d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18362a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        Enviar resposta
                      </button>
                    </>
                  }
                />
              </>
            ) : (
              <div className="py-10 text-sm text-[#6b7b72]">
                Selecione uma conversa para abrir o histórico real e conduzir o relacionamento.
              </div>
            )}
          </PanelCard>

          <PanelCard
            eyebrow="Memória comercial"
            title="Notas internas"
            description="Registre contexto, próxima ação e observações sensíveis sem disputar atenção com a leitura principal."
          >
            {selectedThread ? (
              <>
                <div className="flex gap-2">
                  <select
                    value={noteKind}
                    onChange={(event) => setNoteKind(event.target.value)}
                    className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-3 py-2 text-sm text-[#10261d] outline-none"
                  >
                    <option value="operational">Nota operacional</option>
                    <option value="next_action">Próxima ação</option>
                    <option value="context">Contexto</option>
                    <option value="sensitive">Sensível</option>
                  </select>
                </div>
                <textarea
                  value={noteComposer}
                  onChange={(event) => setNoteComposer(event.target.value)}
                  placeholder="Registrar memória comercial, travas, contexto ou recomendação executiva."
                  rows={4}
                  className="mt-3 w-full rounded-[1.4rem] border border-[#d8cfbf] bg-[#fcfaf6] px-4 py-3 text-sm text-[#10261d] outline-none transition focus:border-[#b28b54]"
                />
                <button
                  type="button"
                  onClick={() => void addThreadNote()}
                  disabled={sending || !noteComposer.trim()}
                  className="mt-3 rounded-full bg-[#10261d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18362a] disabled:opacity-60"
                >
                  Salvar nota interna
                </button>
                <div className="mt-4 space-y-3">
                  {selectedThread.notes.length ? (
                    selectedThread.notes.map((note) => (
                      <div key={note.id} className="rounded-[1.4rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#8a6a3d]">
                          <span>{noteKindLabel(note.kind)}</span>
                          {note.isSensitive ? <span>Sensível</span> : null}
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#20342b]">{note.body}</p>
                        <p className="mt-2 text-xs text-[#6f7f77]">{note.authorName || "Equipe interna"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#6b7b72]">Ainda não existem notas internas registradas nesta conversa.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#6b7b72]">
                As notas internas preservam a memória comercial e a intenção da equipe.
              </p>
            )}
          </PanelCard>
        </div>

        <div className="space-y-5">
          <PanelCard
            eyebrow="Leitura executiva"
            title="Leitura executiva da oportunidade"
            description="A lateral agora separa o que é decisão comercial, o que é apoio e o que é metadado técnico."
          >
            {selectedThread ? (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <InfoPair label="Pessoa" value={selectedThread.context.person.name} valueClassName="font-semibold text-[#10261d]" />
                  <InfoPair
                    label="Leitura comercial"
                    value={
                      <div className="flex flex-wrap gap-2">
                        <SignalBadge label={presentToken(selectedThread.context.commercial.conversionStage, "Sem estágio")} tone="gold" />
                        <SignalBadge label={presentToken(selectedThread.context.commercial.consultationReadiness, "Sem leitura")} tone="green" />
                        <SignalBadge label={presentToken(selectedThread.context.commercial.opportunityState, "Monitorar")} tone={toneForOpportunity(selectedThread.context.commercial.opportunityState)} />
                      </div>
                    }
                  />
                </div>

                <details open className="rounded-[1.5rem] border border-[#e7dece] bg-[#fcfaf6] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Camada de decisão comercial</summary>
                  <div className="mt-4 space-y-3">
                    <InfoPair label="Próxima ação oficial" value={executive?.officialNextAction || "Revisão manual"} />
                    <InfoPair
                      label="Detalhe da condução"
                      value={executive?.officialNextActionDetail || "Sem detalhamento adicional"}
                    />
                    <InfoPair
                      label="Follow-up real"
                      value={`${presentToken(selectedThread.context.commercial.followUpState || selectedThread.context.operational.followUpStatus, "Sem follow-up")} • ${executive?.followUpLabel || "Sem janela"}`}
                    />
                    <InfoPair
                      label="Bloqueio e objeção"
                      value={
                        selectedThread.context.commercial.objectionHint ||
                        presentToken(selectedThread.context.commercial.blockingReason, "Sem trava dominante")
                      }
                    />
                    <InfoPair
                      label="Recomendação de consulta"
                      value={
                        selectedThread.context.commercial.consultationRecommendationReason ||
                        presentToken(selectedThread.context.commercial.consultationRecommendationState, "Manter em preparo")
                      }
                    />
                  </div>
                </details>

                <details className="rounded-[1.5rem] border border-[#e7dece] bg-[#fcfaf6] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Fechamento, agenda e pagamento</summary>
                  <div className="mt-4 grid gap-3">
                    <InfoPair
                      label="Fechamento premium"
                      value={
                        <DetailList
                          items={[
                            { label: "Estado", value: presentToken(selectedThread.context.commercial.closingState, "Em aberto") },
                            { label: "Proposta", value: presentToken(selectedThread.context.commercial.consultationOfferState, "Proposta ainda não apresentada") },
                            { label: "Agenda", value: presentToken(selectedThread.context.commercial.schedulingState, "Ainda não iniciado") },
                            { label: "Pagamento", value: presentToken(selectedThread.context.commercial.paymentState, "Ainda não iniciado") }
                          ]}
                        />
                      }
                    />
                    <InfoPair
                      label="Pagamento e appointment"
                      value={
                        <DetailList
                          items={[
                            { label: "Pagamentos pendentes", value: selectedThread.context.payment.pendingCount },
                            { label: "Valor mais recente", value: formatCurrency(selectedThread.context.payment.latestAmount) },
                            { label: "Status mais recente", value: presentToken(selectedThread.context.payment.latestStatus, "Sem pagamento") },
                            { label: "Appointment", value: presentToken(selectedThread.context.commercial.appointmentState, "Ainda não criado") },
                            { label: "Próximo compromisso", value: formatDateTime(selectedThread.context.agenda.nextAppointmentAt) }
                          ]}
                        />
                      }
                    />
                  </div>
                </details>

                <details className="rounded-[1.5rem] border border-[#e7dece] bg-[#fcfaf6] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Origem, navegação e ecossistema</summary>
                  <div className="mt-4 grid gap-3">
                    <InfoPair
                      label="Origem"
                      value={
                        <DetailList
                          items={[
                            {
                              label: "Canal de entrada",
                              value: presentChannelOrigin(
                                selectedThread.context.origin.sourceLabel ||
                                  selectedThread.context.social.sourceLabel ||
                                  selectedThread.context.lead.sourceChannel
                              )
                            },
                            { label: "Página", value: selectedThread.context.origin.pagePath || "Não identificada" },
                            { label: "Artigo ou conteúdo", value: selectedThread.context.origin.articleTitle || selectedThread.context.social.contentLabel || "Não identificado" },
                            { label: "CTA", value: selectedThread.context.origin.ctaLabel || "Não identificado" },
                            { label: "Campanha", value: selectedThread.context.origin.campaignLabel || selectedThread.context.social.campaignLabel || "Orgânico" }
                          ]}
                        />
                      }
                    />
                    <InfoPair
                      label="Fundadora e comunidade"
                      value={
                        <DetailList
                          items={[
                            { label: "Fundadora", value: presentBoolean(selectedThread.context.founder.isFounder) },
                            { label: "Lista de espera", value: presentBoolean(selectedThread.context.founder.isWaitlist) },
                            { label: "Comunidade", value: selectedThread.context.founder.communityStatus || "Sem vínculo" },
                            { label: "Acesso", value: selectedThread.context.founder.accessStatus || "Sem leitura" }
                          ]}
                        />
                      }
                    />
                    {selectedThread.thread.channel === "telegram" ? (
                      <InfoPair
                        label="Telegram"
                        value={
                          <DetailList
                            items={[
                              { label: "Superfície", value: presentToken(selectedThread.context.telegram.surface, "Não classificada") },
                              { label: "Grupo", value: selectedThread.context.telegram.groupTitle || "Não aplicável" },
                              { label: "Usuário", value: selectedThread.context.telegram.username || "Não identificado" },
                              { label: "Mover para privado", value: presentBoolean(selectedThread.context.telegram.shouldMoveToPrivate) }
                            ]}
                          />
                        }
                      />
                    ) : null}
                  </div>
                </details>

                <details className="rounded-[1.5rem] border border-[#e7dece] bg-[#fcfaf6] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Metadados e vínculos técnicos</summary>
                  <div className="mt-4">
                    <DetailList
                      items={[
                        { label: "Cliente", value: presentMaybeId(selectedThread.context.commercial.clientId, "Conversa ainda sem cliente vinculado") },
                        { label: "Pipeline", value: presentMaybeId(selectedThread.context.commercial.pipelineId, "Ainda não materializado") },
                        { label: "Canal vinculado", value: presentMaybeId(selectedThread.context.commercial.clientChannelId, "Sem vínculo materializado") },
                        { label: "Caso formal", value: presentMaybeId(selectedThread.context.commercial.consultationCaseId, "Sem caso formal") },
                        { label: "Appointment", value: presentMaybeId(selectedThread.context.commercial.consultationAppointmentId, "Ainda não criado") },
                        { label: "Sessão", value: presentMaybeId(selectedThread.context.origin.sessionId, "Não identificada") }
                      ]}
                    />
                  </div>
                </details>
              </div>
            ) : (
              <p className="text-sm text-[#6b7b72]">
                A lateral executiva concentra decisão comercial, fechamento e origem da oportunidade.
              </p>
            )}
          </PanelCard>

          <PanelCard
            eyebrow="Rastro"
            title="Histórico relevante"
            description="Eventos de handoff, leitura e operação aparecem com menor peso visual, mas continuam acessíveis."
          >
            {selectedThread?.events.length ? (
              <div className="space-y-3">
                {selectedThread.events.map((event) => (
                  <div key={event.id} className="rounded-[1.4rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#8a6a3d]">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{presentToken(event.actorType, "Operação")}</span>
                      <span>{formatDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#20342b]">{event.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6b7b72]">
                Eventos de handoff, leitura e resposta humana ficam visíveis aqui quando existirem.
              </p>
            )}
          </PanelCard>

          <PanelCard
            eyebrow="Pulso da operação"
            title="Pulso consolidado"
            description="Os números continuam disponíveis, mas agora entram em grupos executivos e breakdowns recolhíveis."
          >
            <div className="space-y-3">
              <InfoPair
                label="Leitura executiva"
                value={
                  <DetailList
                    items={[
                      { label: "IA conduzindo", value: payload?.metrics.aiControlledThreads || 0 },
                      { label: "Condução humana", value: payload?.metrics.humanControlledThreads || 0 },
                      { label: "Fundadora e lista de espera", value: payload?.metrics.founderOrWaitlistThreads || 0 },
                      { label: "Primeira resposta média", value: payload?.metrics.firstResponseTimeMinutes ? `${payload.metrics.firstResponseTimeMinutes} min` : "n/d" },
                      { label: "Resposta humana média", value: payload?.metrics.humanResponseTimeMinutes ? `${payload.metrics.humanResponseTimeMinutes} min` : "n/d" },
                      { label: "Mensagens falhadas", value: payload?.metrics.failedMessagesCount || 0 }
                    ]}
                  />
                }
              />
              <details className="rounded-[1.4rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Breakdown por canal</summary>
                <div className="mt-4">
                  <DetailList
                    items={[
                      { label: "WhatsApp", value: payload?.metrics.whatsappVolume || 0 },
                      { label: "Instagram", value: payload?.metrics.instagramVolume || 0 },
                      { label: "YouTube", value: payload?.metrics.youtubeVolume || 0 },
                      { label: "Site", value: payload?.metrics.siteVolume || 0 },
                      { label: "Telegram", value: payload?.metrics.telegramVolume || 0 },
                      { label: "YouTube sinais / quentes", value: `${payload?.metrics.youtubeCommentSignals || 0} / ${payload?.metrics.youtubeHotThreads || 0}` },
                      { label: "Instagram DM / comentário", value: `${payload?.metrics.instagramDmVolume || 0} / ${payload?.metrics.instagramCommentSignals || 0}` },
                      { label: "Telegram privado / grupo", value: `${payload?.metrics.telegramPrivateVolume || 0} / ${payload?.metrics.telegramGroupSignals || 0}` }
                    ]}
                  />
                </div>
              </details>
              <details className="rounded-[1.4rem] border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#10261d]">Breakdown de fila e follow-up</summary>
                <div className="mt-4">
                  <DetailList
                    items={[
                      { label: "Aguardando humano no site", value: payload?.metrics.siteWaitingHumanCount || 0 },
                      { label: "Handoff no site", value: payload?.metrics.siteHandoffCount || 0 },
                      { label: "Site quente / qualificado", value: `${payload?.metrics.siteHotThreads || 0} / ${payload?.metrics.siteQualifiedThreads || 0}` },
                      { label: "Follow-up do site", value: payload?.metrics.siteFollowUpPendingCount || 0 },
                      { label: "Aguardando humano no Instagram", value: payload?.metrics.instagramWaitingHumanCount || 0 },
                      { label: "Handoff no Instagram", value: payload?.metrics.instagramHandoffCount || 0 },
                      { label: "Follow-up social", value: payload?.metrics.instagramFollowUpPendingCount || 0 },
                      { label: "Aguardando humano no Telegram", value: payload?.metrics.telegramWaitingHumanCount || 0 },
                      { label: "Handoff no Telegram", value: payload?.metrics.telegramHandoffCount || 0 },
                      { label: "Follow-up no Telegram", value: payload?.metrics.telegramFollowUpPendingCount || 0 }
                    ]}
                  />
                </div>
              </details>
            </div>
          </PanelCard>
        </div>
      </section>
    </div>
  );
}
