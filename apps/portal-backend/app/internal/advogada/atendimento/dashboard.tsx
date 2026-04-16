"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Bot,
  Clock3,
  Flame,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound
} from "lucide-react";

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
  channel: "instagram" | "whatsapp" | "site" | "portal" | "telegram";
  channelLabel: string;
  threadOriginType:
    | "dm"
    | "comment"
    | "comment_to_dm"
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

function toneForPriority(priority: string) {
  if (priority === "high") {
    return "border-[#f3c4b6] bg-[#fff3ee] text-[#8a3e1f]";
  }

  if (priority === "medium") {
    return "border-[#e9d9a9] bg-[#fff9ea] text-[#8b6611]";
  }

  return "border-[#d9e2db] bg-[#f5f8f4] text-[#446054]";
}

function toneForOwner(mode: string) {
  if (mode === "human") {
    return "border-[#d6d1ef] bg-[#f5f2ff] text-[#5a4aa0]";
  }

  if (mode === "hybrid") {
    return "border-[#d9d2c5] bg-[#f7f3ec] text-[#6f5d47]";
  }

  return "border-[#cde0f4] bg-[#eef6ff] text-[#22588e]";
}

function toneForChannel(channel: string) {
  if (channel === "instagram") {
    return "border-[#f0c7db] bg-[#fff2f7] text-[#8d3f66]";
  }

  if (channel === "whatsapp") {
    return "border-[#cfe5d3] bg-[#effaf1] text-[#2f6c45]";
  }

  if (channel === "telegram") {
    return "border-[#cfe0ef] bg-[#eef6ff] text-[#2f5e85]";
  }

  if (channel === "site") {
    return "border-[#d9d0be] bg-[#f8f3ea] text-[#6b5a3d]";
  }

  return "border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]";
}

function toneForSurface(surface: string) {
  if (surface === "public_comment") {
    return "border-[#ead8a8] bg-[#fff9eb] text-[#8a6914]";
  }

  if (surface === "telegram_group") {
    return "border-[#d4deee] bg-[#f2f7ff] text-[#31597d]";
  }

  if (surface === "telegram_private") {
    return "border-[#cfe6ef] bg-[#edf9fb] text-[#22606f]";
  }

  if (surface === "site_chat") {
    return "border-[#ddd4c3] bg-[#faf6ef] text-[#6a5840]";
  }

  if (surface === "direct_message") {
    return "border-[#d5deef] bg-[#f1f6ff] text-[#36598a]";
  }

  return "border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]";
}

function toneForFollowUp(status: string) {
  if (status === "overdue") {
    return "border-[#f3c4b6] bg-[#fff3ee] text-[#8a3e1f]";
  }

  if (status === "due" || status === "pending") {
    return "border-[#ead8a8] bg-[#fff9eb] text-[#8a6914]";
  }

  if (status === "resolved" || status === "converted") {
    return "border-[#d9e2db] bg-[#f5f8f4] text-[#446054]";
  }

  return "border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]";
}

function toneForIdentity(status: string) {
  if (status === "pending") {
    return "border-[#ead8a8] bg-[#fff9eb] text-[#8a6914]";
  }

  if (status === "provisional") {
    return "border-[#d7d1ef] bg-[#f5f2ff] text-[#5a4aa0]";
  }

  return "border-[#d9e2db] bg-[#f5f8f4] text-[#446054]";
}

function MetricCard({
  label,
  value,
  icon
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#66756c]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#10261d]">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#7b6034]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function formatMissingSchemaEntries(missing: ApiErrorPayload["missing"]) {
  if (!missing?.length) {
    return "Sem detalhes adicionais do drift.";
  }

  return missing
    .map((entry) => `${entry.table}(${entry.columns.join(", ")})`)
    .join("; ");
}

function buildInboxLoadError(payload: ApiErrorPayload) {
  if (payload.code === "schema_incompatible") {
    return (
      "Inbox em saneamento estrutural: o ambiente atual ainda nao concluiu o schema " +
      `${payload.schemaVersion || "phase 13"} exigido pela fila conversacional. ` +
      `Itens ausentes: ${formatMissingSchemaEntries(payload.missing)}.`
    );
  }

  return payload.error || "Falha ao carregar a inbox.";
}

function buildEmptyStateMessage(filters: Filters) {
  if (filters.channel === "whatsapp") {
    return "Nenhuma thread de WhatsApp corresponde aos filtros atuais.";
  }

  if (filters.channel === "instagram") {
    return "Nenhuma thread de Instagram corresponde aos filtros atuais.";
  }

  if (filters.channel === "telegram") {
    return "Nenhuma thread conversacional de Telegram corresponde aos filtros atuais.";
  }

  if (filters.channel === "site") {
    return "Nenhuma thread de Site Chat corresponde aos filtros atuais.";
  }

  if (filters.inboxMode === "needs_human") {
    return "Nenhuma thread precisa de atendimento humano com os filtros atuais.";
  }

  return "Nenhuma conversa encontrada para os filtros atuais.";
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
    if (search) {
      nextFilters.search = search;
    }

    const status = searchParams.get("status");
    if (status && allowedStatus.has(status)) {
      nextFilters.status = status;
    }

    const channel = searchParams.get("channel");
    if (channel && allowedChannels.has(channel)) {
      nextFilters.channel = channel;
    }

    const waitingFor = searchParams.get("waitingFor");
    if (waitingFor && allowedWaitingFor.has(waitingFor)) {
      nextFilters.waitingFor = waitingFor;
    }

    const priority = searchParams.get("priority");
    if (priority && allowedPriority.has(priority)) {
      nextFilters.priority = priority;
    }

    const inboxMode = searchParams.get("inboxMode");
    if (inboxMode && allowedInboxMode.has(inboxMode)) {
      nextFilters.inboxMode = inboxMode;
    }

    const founderScope = searchParams.get("founderScope");
    if (founderScope && allowedFounderScope.has(founderScope)) {
      nextFilters.founderScope = founderScope;
    }

    const paymentState = searchParams.get("paymentState");
    if (paymentState && allowedPaymentState.has(paymentState)) {
      nextFilters.paymentState = paymentState;
    }

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
    if (!selectedThreadId) {
      return;
    }

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

      if (!response.ok) {
        throw new Error(json.error || "Falha ao atualizar a thread.");
      }

      await loadInbox();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Falha ao atualizar a thread.");
    } finally {
      setSending(false);
    }
  }

  async function updateThreadState(payload: Record<string, unknown>) {
    if (!selectedThreadId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/internal/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateThreadState",
          threadId: selectedThreadId,
          ...payload
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Falha ao atualizar ownership da thread.");
      }

      await loadInbox();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Falha ao atualizar a thread.");
    } finally {
      setSending(false);
    }
  }

async function sendHumanReply() {
    if (!selectedThreadId || !composer.trim()) {
      return;
    }

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

      if (!response.ok) {
        throw new Error(json.error || "Falha ao enviar resposta humana.");
      }

      setComposer("");
      await loadInbox();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Falha ao enviar resposta.");
    } finally {
      setSending(false);
    }
  }

  async function scheduleFollowUp(status: "due" | "overdue" | "resolved") {
    if (!selectedThreadId) {
      return;
    }

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
          ? "Follow-up tratado. Agora a thread aguarda retorno do cliente."
          : status === "overdue"
            ? "Follow-up vencido. Priorizar contato humano ainda hoje."
            : "Follow-up marcado para a fila do dia."
    });
  }

  async function addThreadNote() {
    if (!selectedThreadId || !noteComposer.trim()) {
      return;
    }

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
      if (!response.ok) {
        throw new Error(json.error || "Falha ao registrar nota interna.");
      }

      setNoteComposer("");
      await loadInbox();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Falha ao salvar nota.");
    } finally {
      setSending(false);
    }
  }

  const selectedThread = payload?.selectedThread || null;
  const hasThreadList = Boolean(payload?.threads.length);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#ddd2bf] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(243,236,224,0.96))] px-6 py-6 shadow-[0_18px_50px_rgba(16,38,29,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6a3d]">
              Fase 13 | Inbox conversacional
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#10261d]">
              Central conversacional da NoemIA
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5e6e65]">
              Esta superficie opera apenas a fila viva de conversas. Telegram editorial e
              distribuicao ficaram fora do contrato central da inbox nesta fase de saneamento.
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Threads abertas" value={payload?.metrics.totalOpenThreads || 0} icon={<MessageSquareText className="h-5 w-5" />} />
        <MetricCard label="Aguardando humano" value={payload?.metrics.waitingHumanCount || 0} icon={<UserRound className="h-5 w-5" />} />
        <MetricCard label="Handoffs ativos" value={payload?.metrics.handoffCount || 0} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="Threads quentes" value={payload?.metrics.hotThreads || 0} icon={<Flame className="h-5 w-5" />} />
      </section>

      {error ? (
        <div className="rounded-2xl border border-[#f1c7bd] bg-[#fff3ef] px-4 py-3 text-sm leading-6 text-[#8a3e1f]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, inboxMode: "needs_human", waitingFor: "human" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Fila do dia</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Aguardando humano</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.waitingHumanCount || 0} threads pedindo comando manual.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, inboxMode: "hot" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Prioridade</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Quentes</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.hotThreads || 0} conversas com maior peso operacional.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, paymentState: "pending" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Receita</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Pagamento pendente</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.paymentPendingThreads || 0} threads com decisao comercial em aberto.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, channel: "instagram" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Instagram</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">DMs e sinais sociais</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.instagramVolume || 0} threads Instagram na central.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, channel: "site" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Site Chat</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Leads em tempo real</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.siteVolume || 0} threads do site na central.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, channel: "telegram" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Telegram</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Somente threads conversacionais</p>
          <p className="mt-1 text-sm text-[#67786f]">
            {payload?.metrics.telegramVolume || 0} threads privadas ou de grupo dentro da fila viva.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, founderScope: "founder" }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Ecossistema</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Founder e waitlist</p>
          <p className="mt-1 text-sm text-[#67786f]">{payload?.metrics.founderOrWaitlistThreads || 0} conversas ligadas ao circulo premium.</p>
        </button>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...initialFilters }))}
          className="rounded-3xl border border-[#ddd5c7] bg-white px-5 py-4 text-left shadow-[0_8px_22px_rgba(16,38,29,0.05)] transition hover:border-[#b28b54]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Reset</p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">Visao completa</p>
          <p className="mt-1 text-sm text-[#67786f]">Volta para a leitura integral da central operacional.</p>
        </button>
      </section>

      <section className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
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
            <option value="all">Todos os status</option>
            <option value="waiting_human">Aguardando humano</option>
            <option value="waiting_client">Aguardando cliente</option>
            <option value="handoff">Em handoff</option>
            <option value="ai_active">IA ativa</option>
          </select>
          <select
            value={filters.channel}
            onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todos os canais</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="site">Site Chat</option>
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
            <option value="ai">Fila IA</option>
          </select>
          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Todas as prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
          </select>
          <select
            value={filters.inboxMode}
            onChange={(event) => setFilters((current) => ({ ...current, inboxMode: event.target.value }))}
            className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-4 py-3 text-sm text-[#10261d] outline-none"
          >
            <option value="all">Modo completo</option>
            <option value="needs_human">Precisa de humano</option>
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
            <option value="all">Founder e waitlist</option>
            <option value="founder">Somente founder</option>
            <option value="waitlist">Somente waitlist</option>
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr_0.95fr]">
        <div className="rounded-3xl border border-[#ddd5c7] bg-white shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
          <div className="border-b border-[#ece3d4] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#10261d]">Fila viva</h2>
            <p className="mt-1 text-sm text-[#6b7b72]">
              Conversas reais, priorizadas por densidade, handoff e continuidade.
            </p>
          </div>
          <div className="max-h-[760px] overflow-y-auto px-3 py-3">
            {loading && !hasThreadList ? (
              <div className="px-3 py-10 text-sm text-[#6b7b72]">Carregando threads...</div>
            ) : payload?.threads.length ? (
              payload.threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={cx(
                    "mb-2 w-full rounded-3xl border px-4 py-4 text-left transition",
                    selectedThreadId === thread.id
                      ? "border-[#b28b54] bg-[#fbf6ed] shadow-[0_10px_20px_rgba(178,139,84,0.12)]"
                      : "border-[#ece3d4] bg-[#fffdfa] hover:border-[#d4c0a0]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#10261d]">{thread.displayName}</p>
                        {thread.identityStatus !== "resolved" ? (
                          <Chip className={toneForIdentity(thread.identityStatus)}>
                            {thread.identityStatusLabel}
                          </Chip>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[#6c7b73]">{thread.contactLabel}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8a6a3d]">
                        {thread.identitySourceLabel}
                      </p>
                    </div>
                    {thread.unreadCount > 0 ? (
                      <span className="rounded-full bg-[#10261d] px-2.5 py-1 text-xs font-semibold text-white">
                        {thread.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4b5d55]">{thread.preview}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip className={toneForChannel(thread.channel)}>{thread.channelLabel}</Chip>
                    <Chip
                      className={toneForSurface(
                        thread.threadOriginType === "comment"
                          ? "public_comment"
                          : thread.threadOriginType === "site_chat"
                            ? "site_chat"
                            : "direct_message"
                      )}
                    >
                      {thread.threadOriginLabel}
                    </Chip>
                    <Chip className={toneForPriority(thread.priority)}>{thread.priority}</Chip>
                    <Chip className={toneForOwner(thread.ownerMode)}>{thread.ownerMode}</Chip>
                    {thread.followUpStatus !== "none" ? (
                      <Chip className={toneForFollowUp(thread.followUpStatus)}>
                        follow-up {thread.followUpStatus}
                      </Chip>
                    ) : null}
                    {thread.hot ? <Chip className="border-[#f3c4b6] bg-[#fff2ec] text-[#8a3e1f]">quente</Chip> : null}
                    {thread.hasFounderContext ? <Chip className="border-[#d7cbee] bg-[#f7f3ff] text-[#5b4c99]">founder</Chip> : null}
                    {thread.hasPaymentPending ? <Chip className="border-[#ead8a8] bg-[#fff9eb] text-[#8a6914]">pagamento</Chip> : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#76857d]">
                    <span>{thread.idleMinutes ? `${thread.idleMinutes} min parada • ` : ""}{thread.nextAction}</span>
                    <span>{formatDateTime(thread.lastMessageAt)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-10 text-sm text-[#6b7b72]">
                {buildEmptyStateMessage(filters)}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#ddd5c7] bg-white shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
          <div className="border-b border-[#ece3d4] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#10261d]">Thread operacional</h2>
              {selectedThread ? (
                <>
                  <Chip className={toneForPriority(selectedThread.thread.priority)}>
                    prioridade {selectedThread.thread.priority}
                  </Chip>
                  <Chip className={toneForChannel(selectedThread.thread.channel)}>
                    {selectedThread.thread.channelLabel}
                  </Chip>
                  <Chip
                    className={toneForSurface(
                      selectedThread.thread.threadOriginType === "comment"
                        ? "public_comment"
                        : selectedThread.thread.threadOriginType === "site_chat"
                          ? "site_chat"
                          : "direct_message"
                    )}
                  >
                    {selectedThread.thread.threadOriginLabel}
                  </Chip>
                  <Chip className={toneForOwner(selectedThread.thread.ownerMode)}>
                    ownership {selectedThread.thread.ownerMode}
                  </Chip>
                  <Chip className="border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]">
                    fila {selectedThread.thread.waitingFor}
                  </Chip>
                  <Chip className="border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]">
                    thread {selectedThread.thread.threadStatus}
                  </Chip>
                </>
              ) : null}
            </div>
            {selectedThread ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#4e6057]">
                <span className="font-semibold text-[#10261d]">{selectedThread.context.person.name}</span>
                <Chip className={toneForIdentity(selectedThread.context.person.identityStatus)}>
                  {selectedThread.context.person.identityStatusLabel}
                </Chip>
                <span>{selectedThread.thread.contactLabel}</span>
              </div>
            ) : null}
          </div>

          {selectedThread ? (
            <>
              <div className="max-h-[520px] space-y-4 overflow-y-auto px-5 py-5">
                {selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cx(
                      "max-w-[88%] rounded-[1.6rem] px-4 py-3 text-sm leading-6 shadow-sm",
                      message.direction === "outbound"
                        ? "ml-auto bg-[#10261d] text-white"
                        : "bg-[#f7f2e8] text-[#24372f]"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] opacity-75">
                      <span>{message.senderType}</span>
                      <span>
                        {message.surface === "public_comment"
                          ? "comentario"
                          : message.surface === "direct_message"
                            ? "dm"
                            : message.surface === "telegram_private"
                              ? "telegram privado"
                              : message.surface === "telegram_group"
                                ? "telegram grupo"
                                : message.surface === "site_chat"
                                  ? "site"
                                  : "sistema"}
                      </span>
                      <span>{message.sendStatus}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.socialOrigin ? (
                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] opacity-70">
                        origem {message.socialOrigin}
                      </p>
                    ) : null}
                    {message.errorMessage ? (
                      <p className="mt-2 text-xs text-[#ffd1c2]">{message.errorMessage}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="border-t border-[#ece3d4] bg-[#fcfaf6] px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void markThreadRead()}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Marcar como lida e assumir fila
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadState({ ownerMode: "human", waitingFor: "human", threadStatus: "waiting_human", handoffState: "active" })}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Assumir como humano
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadState({ ownerMode: "ai", waitingFor: "ai", threadStatus: "ai_active", handoffState: "resolved", aiEnabled: true })}
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
                    Marcar follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => void scheduleFollowUp("overdue")}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Venceu hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadState({ threadStatus: "closed", waitingFor: "none", followUpStatus: "resolved" })}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadState({ threadStatus: "waiting_human", waitingFor: "human" })}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Reabrir
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadState({ threadStatus: "archived", waitingFor: "none" })}
                    disabled={sending}
                    className="rounded-full border border-[#d3c5ac] bg-white px-4 py-2 text-sm font-medium text-[#10261d] transition hover:border-[#b28b54] disabled:opacity-60"
                  >
                    Arquivar
                  </button>
                </div>
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder="Responder manualmente pelo painel com continuidade premium no canal certo."
                  rows={5}
                  className="w-full rounded-[1.6rem] border border-[#d8cfbf] bg-white px-4 py-4 text-sm text-[#10261d] outline-none transition focus:border-[#b28b54]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#718179]">
                    WhatsApp, Instagram, Site Chat e Telegram operam com historico interno, ownership e handoff preservados nesta central.
                  </p>
                  <button
                    type="button"
                    onClick={() => void sendHumanReply()}
                    disabled={sending || !composer.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#10261d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18362a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Responder
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-10 text-sm text-[#6b7b72]">
              Selecione uma thread para abrir o historico real e operar o handoff.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
            <h2 className="text-lg font-semibold text-[#10261d]">Contexto lateral</h2>
            {selectedThread ? (
              <div className="mt-4 space-y-4 text-sm text-[#4e6057]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Pessoa</p>
                  <p className="mt-2 font-medium text-[#10261d]">{selectedThread.context.person.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip className={toneForIdentity(selectedThread.context.person.identityStatus)}>
                      {selectedThread.context.person.identityStatusLabel}
                    </Chip>
                    <Chip className="border-[#d8d2c4] bg-[#f7f3eb] text-[#4a5a52]">
                      {selectedThread.context.person.identitySourceLabel}
                    </Chip>
                  </div>
                  <p>{selectedThread.context.person.phone || "Telefone nao identificado"}</p>
                  <p>{selectedThread.context.person.email || "Email nao identificado"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Lead e consulta</p>
                  <p>Stage: {selectedThread.context.lead.stage || "Nao classificado"}</p>
                  <p>Temperatura: {selectedThread.context.lead.temperature || "Nao lida"}</p>
                  <p>Consulta: {selectedThread.context.operational.consultationStage || "Nao sinalizada"}</p>
                  <p>Intento atual: {selectedThread.context.lead.currentIntent || "Sem leitura"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">CRM comercial conectado</p>
                  <p>Cliente: {selectedThread.context.commercial.clientId || "thread ainda sem cliente vinculado"}</p>
                  <p>Pipeline: {selectedThread.context.commercial.pipelineId || "nao materializado"}</p>
                  <p>Owner: {selectedThread.thread.assignedTo.name || "sem owner comercial"}</p>
                  <p>Follow-up: {selectedThread.context.commercial.followUpState || "none"}</p>
                  <p>Motivo: {selectedThread.context.commercial.followUpReason || "sem motivo registrado"}</p>
                  <p>Prontidao: {selectedThread.context.commercial.consultationReadiness || "sem leitura"}</p>
                  <p>Estagio de conversao: {selectedThread.context.commercial.conversionStage || "sem estagio"}</p>
                  <p>Acao recomendada: {selectedThread.context.commercial.recommendedActionLabel || "sem recomendacao"}</p>
                  <p>Bloqueio: {selectedThread.context.commercial.blockingReason || "sem trava dominante"}</p>
                  <p>Oportunidade: {selectedThread.context.commercial.opportunityState || "monitor"}</p>
                  <p>Proximo passo: {selectedThread.context.commercial.nextStep || "nao definido"}</p>
                  <p>Aguardando: {selectedThread.context.commercial.waitingOn || "nenhum bloqueio explicito"}</p>
                  <p>Canal vinculado: {selectedThread.context.commercial.clientChannelId || "sem client_channel materializado"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Fechamento premium</p>
                  <p>Estado: {selectedThread.context.commercial.closingState || "open"}</p>
                  <p>Proposta: {selectedThread.context.commercial.consultationOfferState || "not_offered"}</p>
                  <p>Agenda: {selectedThread.context.commercial.schedulingState || "not_started"}</p>
                  <p>Pagamento: {selectedThread.context.commercial.paymentState || "not_started"}</p>
                  <p>Acao de fechamento: {selectedThread.context.commercial.closingRecommendedActionLabel || "sem acao"}</p>
                  <p>Bloqueio de fechamento: {selectedThread.context.commercial.closingBlockReason || "sem bloqueio dominante"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Origem e navegacao</p>
                  <p>Canal de entrada: {selectedThread.context.origin.sourceLabel || selectedThread.context.social.sourceLabel || "sem leitura"}</p>
                  <p>Pagina: {selectedThread.context.origin.pagePath || "nao identificada"}</p>
                  <p>Artigo: {selectedThread.context.origin.articleTitle || selectedThread.context.social.contentLabel || "nao identificado"}</p>
                  <p>CTA: {selectedThread.context.origin.ctaLabel || "nao identificado"}</p>
                  <p>Campanha: {selectedThread.context.origin.campaignLabel || selectedThread.context.social.campaignLabel || "organico"}</p>
                  <p>Topico: {selectedThread.context.origin.topicLabel || selectedThread.context.social.topicLabel || "geral"}</p>
                  <p>Visitor stage: {selectedThread.context.origin.visitorStage || "anonimo"}</p>
                </div>
                {selectedThread.thread.channel === "telegram" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Telegram</p>
                    <p>Superficie: {selectedThread.context.telegram.surface || "unknown"}</p>
                    <p>Grupo: {selectedThread.context.telegram.groupTitle || "nao aplicavel"}</p>
                    <p>Username: {selectedThread.context.telegram.username || "nao identificado"}</p>
                    <p>Relevancia: {selectedThread.context.telegram.relevance || "operacao privada"}</p>
                    <p>
                      Movimento para privado:{" "}
                      {selectedThread.context.telegram.shouldMoveToPrivate ? "sim" : "nao"}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Founder e comunidade</p>
                  <p>Founder: {selectedThread.context.founder.isFounder ? "sim" : "nao"}</p>
                  <p>Waitlist: {selectedThread.context.founder.isWaitlist ? "sim" : "nao"}</p>
                  <p>Comunidade: {selectedThread.context.founder.communityStatus || "sem vinculo"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Pagamento e agenda</p>
                  <p>Pagamentos pendentes: {selectedThread.context.payment.pendingCount}</p>
                  <p>Status mais recente: {selectedThread.context.payment.latestStatus || "sem pagamento"}</p>
                  <p>Proximo compromisso: {formatDateTime(selectedThread.context.agenda.nextAppointmentAt)}</p>
                  <p>Pagamento comercial: {selectedThread.context.commercial.paymentState || "not_started"}</p>
                  <p>Horario comercial: {selectedThread.context.commercial.schedulingSuggestedAt ? formatDateTime(selectedThread.context.commercial.schedulingSuggestedAt) : "sem horario sugerido"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Follow-up e risco</p>
                  <p>Estado: {selectedThread.context.operational.followUpStatus || "none"}</p>
                  <p>Prazo: {formatDateTime(selectedThread.context.operational.followUpDueAt)}</p>
                  <p>Leitura comercial: {selectedThread.context.commercial.followUpState || "none"}</p>
                  <p>Thread parada: {selectedThread.thread.idleMinutes ? `${selectedThread.thread.idleMinutes} min` : "sem leitura"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Proxima acao</p>
                  <p className="font-medium text-[#10261d]">
                    {selectedThread.context.commercial.closingRecommendedActionLabel ||
                      selectedThread.context.commercial.recommendedActionLabel ||
                      selectedThread.context.operational.nextSuggestedAction ||
                      "Revisar manualmente"}
                  </p>
                  <p>
                    {selectedThread.context.commercial.closingRecommendedActionDetail ||
                      selectedThread.context.commercial.recommendedActionDetail ||
                      selectedThread.context.commercial.closingNextStep ||
                      selectedThread.context.commercial.nextStep ||
                      selectedThread.context.operational.nextSuggestedActionDetail ||
                      selectedThread.thread.nextAction}
                  </p>
                </div>
                {selectedThread.context.commercial.consultationRecommendationReason ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Consulta</p>
                    <p className="font-medium text-[#10261d]">
                      {selectedThread.context.commercial.consultationRecommendationState || "hold"}
                    </p>
                    <p>{selectedThread.context.commercial.consultationRecommendationReason}</p>
                  </div>
                ) : null}
                {selectedThread.context.commercial.latestNoteBody ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Ultima nota comercial</p>
                    <p className="font-medium text-[#10261d]">{selectedThread.context.commercial.latestNoteBody}</p>
                    <p>{formatDateTime(selectedThread.context.commercial.latestNoteAt)}</p>
                  </div>
                ) : null}
                {selectedThread.context.commercial.consultationSuggestedCopy ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Copy sugerida</p>
                    <p className="font-medium text-[#10261d]">
                      {selectedThread.context.commercial.consultationSuggestedCopy}
                    </p>
                    <p>
                      Follow-up sugerido: {selectedThread.context.commercial.recommendedFollowUpWindow || "sem janela"}
                    </p>
                  </div>
                ) : null}
                {selectedThread.context.commercial.closingCopySuggestion ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Copy de fechamento</p>
                    <p className="font-medium text-[#10261d]">
                      {selectedThread.context.commercial.closingCopySuggestion}
                    </p>
                    <p>
                      Proximo passo: {selectedThread.context.commercial.closingNextStep || "sem proximo passo definido"}
                    </p>
                  </div>
                ) : null}
                {selectedThread.context.social.commentText ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Comentario de origem</p>
                    <p className="font-medium text-[#10261d]">{selectedThread.context.social.commentText}</p>
                    <p>
                      Decisao: {selectedThread.context.social.publicCommentDecision || "sem politica"} •
                      transicao {selectedThread.context.social.directTransitionStatus || "n/a"}
                    </p>
                  </div>
                ) : null}
                {selectedThread.context.origin.referrer || selectedThread.context.origin.utmSource ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">Aquisicao</p>
                    <p>Referrer: {selectedThread.context.origin.referrer || "direto"}</p>
                    <p>
                      UTM: {selectedThread.context.origin.utmSource || "n/a"} /{" "}
                      {selectedThread.context.origin.utmMedium || "n/a"} /{" "}
                      {selectedThread.context.origin.utmCampaign || "n/a"}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#6b7b72]">
                A lateral da thread mostra lead, origem social, pagamento, founder, agenda e proxima acao.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
            <h2 className="text-lg font-semibold text-[#10261d]">Memoria operacional</h2>
            {selectedThread ? (
              <>
                <div className="mt-4 flex gap-2">
                  <select
                    value={noteKind}
                    onChange={(event) => setNoteKind(event.target.value)}
                    className="rounded-2xl border border-[#d9d0c2] bg-[#fbf8f2] px-3 py-2 text-sm text-[#10261d] outline-none"
                  >
                    <option value="operational">Nota operacional</option>
                    <option value="next_action">Proxima acao</option>
                    <option value="context">Contexto</option>
                    <option value="sensitive">Sensivel</option>
                  </select>
                </div>
                <textarea
                  value={noteComposer}
                  onChange={(event) => setNoteComposer(event.target.value)}
                  placeholder="Registrar observacao interna, contexto ou proxima acao."
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
                      <div key={note.id} className="rounded-2xl border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8a6a3d]">
                          <span>{note.kind}</span>
                          {note.isSensitive ? <span>sensivel</span> : null}
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#20342b]">{note.body}</p>
                        <p className="mt-2 text-xs text-[#6f7f77]">{note.authorName || "Equipe interna"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#6b7b72]">Ainda nao existem notas internas registradas nesta thread.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-[#6b7b72]">
                As notas internas guardam memoria operacional, proxima acao e contexto sensivel.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
            <h2 className="text-lg font-semibold text-[#10261d]">Rastro operacional</h2>
            {selectedThread?.events.length ? (
              <div className="mt-4 space-y-3">
                {selectedThread.events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-[#ece3d4] bg-[#fcfaf6] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8a6a3d]">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{event.actorType}</span>
                      <span>{formatDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#20342b]">{event.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#6b7b72]">
                Eventos de handoff, leitura e resposta humana passam a ficar visiveis aqui.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#ddd5c7] bg-white p-5 shadow-[0_10px_26px_rgba(16,38,29,0.06)]">
            <h2 className="text-lg font-semibold text-[#10261d]">Leitura executiva</h2>
            <div className="mt-4 space-y-3 text-sm text-[#4e6057]">
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> Threads com IA</span>
                <strong>{payload?.metrics.aiControlledThreads || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" /> Founder e waitlist</span>
                <strong>{payload?.metrics.founderOrWaitlistThreads || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Pagamento pendente</span>
                <strong>{payload?.metrics.paymentPendingThreads || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> Threads humanas</span>
                <strong>{payload?.metrics.humanControlledThreads || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> 1a resposta media</span>
                <strong>{payload?.metrics.firstResponseTimeMinutes ? `${payload.metrics.firstResponseTimeMinutes} min` : "n/d"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> Resposta humana media</span>
                <strong>{payload?.metrics.humanResponseTimeMinutes ? `${payload.metrics.humanResponseTimeMinutes} min` : "n/d"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Volume WhatsApp</span>
                <strong>{payload?.metrics.whatsappVolume || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Volume Instagram</span>
                <strong>{payload?.metrics.instagramVolume || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Volume Site</span>
                <strong>{payload?.metrics.siteVolume || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Volume Telegram</span>
                <strong>{payload?.metrics.telegramVolume || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" /> DMs / comentarios</span>
                <strong>{`${payload?.metrics.instagramDmVolume || 0} / ${payload?.metrics.instagramCommentSignals || 0}`}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" /> Telegram privado / grupo</span>
                <strong>{`${payload?.metrics.telegramPrivateVolume || 0} / ${payload?.metrics.telegramGroupSignals || 0}`}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> Waiting human Site</span>
                <strong>{payload?.metrics.siteWaitingHumanCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Handoff Site</span>
                <strong>{payload?.metrics.siteHandoffCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" /> Site quente / qualificado</span>
                <strong>{`${payload?.metrics.siteHotThreads || 0} / ${payload?.metrics.siteQualifiedThreads || 0}`}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> Follow-up Site</span>
                <strong>{payload?.metrics.siteFollowUpPendingCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> Waiting human IG</span>
                <strong>{payload?.metrics.instagramWaitingHumanCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Handoff IG</span>
                <strong>{payload?.metrics.instagramHandoffCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> Follow-up social</span>
                <strong>{payload?.metrics.instagramFollowUpPendingCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> Waiting human Telegram</span>
                <strong>{payload?.metrics.telegramWaitingHumanCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Handoff Telegram</span>
                <strong>{payload?.metrics.telegramHandoffCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> Follow-up Telegram</span>
                <strong>{payload?.metrics.telegramFollowUpPendingCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Mensagens falhadas</span>
                <strong>{payload?.metrics.failedMessagesCount || 0}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f7f2e8] px-4 py-3">
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" /> Entregues / lidas</span>
                <strong>{`${payload?.metrics.deliveredMessagesCount || 0} / ${payload?.metrics.readMessagesCount || 0}`}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
