import "server-only";

import type { PortalProfile } from "@/lib/auth/guards";
import { askNoemiaSchema, caseAreaLabels } from "@/lib/domain/portal";
import { getServerEnv } from "@/lib/config/env";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatRateValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "sem base";
  }

  return `${value.toFixed(1)}%`;
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const contentParts =
    payload?.output?.flatMap((item: any) =>
      (item?.content || []).flatMap((content: any) => {
        if (typeof content?.text === "string") {
          return [content.text];
        }

        if (typeof content?.text?.value === "string") {
          return [content.text.value];
        }

        return [];
      })
    ) || [];

  return compactText(contentParts.join("\n\n"));
}

function buildPublicContext() {
  return [
    "Contexto institucional:",
    "- O escritorio atua com atendimento juridico organizado e portal seguro.",
    "- A jornada principal e: site institucional -> triagem -> analise interna -> cadastro interno -> convite -> portal do cliente.",
    "- Areas principais: Direito Previdenciario, Consumidor Bancario, Familia e Civil.",
    "- O portal do cliente concentra status do caso, documentos, agenda e atualizacoes.",
    "- O acesso ao portal nao e aberto publicamente; ele e liberado pela equipe depois do cadastro do atendimento.",
    "- Se a pergunta exigir analise do caso, oriente a pessoa a preencher a triagem inicial.",
    "- Nao invente prazos, promessas de resultado ou estrategia juridica personalizada sem contexto do escritorio."
  ].join("\n");
}

async function buildClientContext(profile: PortalProfile) {
  try {
    const workspace = await getClientWorkspace(profile);
    const mainCase = workspace.cases[0] || null;
    const openRequests = workspace.documentRequests.filter((item) => item.status === "pending");
    const upcomingAppointments = workspace.appointments
      .filter(
        (appointment) =>
          new Date(appointment.starts_at) >= new Date() &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed"
      )
      .slice(0, 4);
    const latestEvents = workspace.events.slice(0, 5);

    return [
      `Cliente autenticado: ${profile.full_name} (${profile.email}).`,
      `Status do cadastro: ${workspace.clientRecord.status}.`,
      mainCase
        ? `Caso principal: ${mainCase.title} | area: ${
            caseAreaLabels[mainCase.area as keyof typeof caseAreaLabels] || mainCase.area
          } | status: ${mainCase.statusLabel}.`
        : "Ainda nao ha caso principal visivel no portal.",
      `Documentos disponiveis: ${
        workspace.documents.filter((item) => item.status === "recebido" || item.status === "revisado")
          .length
      }.`,
      `Documentos pendentes: ${
        workspace.documents.filter((item) => item.status === "pendente" || item.status === "solicitado")
          .length
      }.`,
      `Solicitacoes documentais abertas: ${openRequests.length}.`,
      upcomingAppointments.length
        ? `Proximos compromissos: ${upcomingAppointments
            .map((item) => `${item.title} em ${item.starts_at} (${item.statusLabel})`)
            .join("; ")}.`
        : "Nao ha compromissos futuros visiveis no momento.",
      latestEvents.length
        ? `Ultimas atualizacoes visiveis: ${latestEvents
            .map((item) => `${item.title}: ${item.public_summary || item.eventLabel}`)
            .join("; ")}.`
        : "Ainda nao ha atualizacoes visiveis registradas no portal."
    ].join("\n");
  } catch (error) {
    console.warn("[NoemIA] Erro ao buscar contexto do cliente, usando fallback:", error);

    const { getClientWorkspace: getClientWorkspaceFallback } = await import("./dashboard-fallback");
    const workspace = await getClientWorkspaceFallback(profile);

    return [
      `Cliente autenticado: ${profile.full_name} (${profile.email}).`,
      `Status do cadastro: ${workspace.clientRecord.status}.`,
      `Caso principal: ${workspace.cases[0]?.title || "Ainda nao ha caso principal visivel no portal."}`,
      `Documentos disponiveis: ${workspace.documents.filter((d: any) => d.status === "recebido").length}.`,
      `Documentos pendentes: ${workspace.documents.filter((d: any) => d.status === "pendente").length}.`,
      `Solicitacoes documentais abertas: ${workspace.documentRequests.length}.`,
      `Proximos compromissos: ${workspace.appointments.length}.`,
      `Ultimas atualizacoes: ${workspace.events.length}.`
    ].join("\n");
  }
}

async function buildStaffContext(profile: PortalProfile) {
  try {
    const [overview, intelligence] = await Promise.all([
      getStaffOverview(),
      getBusinessIntelligenceOverview(30)
    ]);

    const topToday = overview.operationalCenter.queues.today.slice(0, 5);
    const topAwaitingClient = overview.operationalCenter.queues.awaitingClient.slice(0, 4);
    const topAwaitingTeam = overview.operationalCenter.queues.awaitingTeam.slice(0, 4);
    const recentCompleted = overview.operationalCenter.queues.recentlyCompleted.slice(0, 4);
    const caseHighlights = overview.latestCases.slice(0, 4);

    return [
      `Perfil interno autenticado: ${profile.full_name} (${profile.email}).`,
      `Resumo operacional atual: ${overview.operationalCenter.summary.criticalCount} item(ns) critico(s), ${overview.operationalCenter.summary.todayCount} para hoje, ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente, ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
      `Leitura de BI dos ultimos 30 dias: abandono de triagem ${formatRateValue(intelligence.summary.triageAbandonmentRate)}, triagem para cliente ${formatRateValue(intelligence.summary.triageToClientRate)}, ativacao no portal ${formatRateValue(intelligence.summary.portalActivationRate)}.`,
      `Sinais operacionais extras: ${overview.operationalCenter.summary.agedPendingDocumentsCount} pendencia(s) documental(is) envelhecida(s), ${overview.operationalCenter.summary.inviteStalledCount} convite(s) travado(s) e ${overview.operationalCenter.summary.staleCasesCount} caso(s) sem atualizacao recente.`,
      topToday.length
        ? `Fila fazer hoje: ${topToday
            .map((item) => `${item.kindLabel} ${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Fila fazer hoje sem itens abertos no momento.",
      topAwaitingClient.length
        ? `Fila aguardando cliente: ${topAwaitingClient
            .map((item) => `${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Nao ha fila aguardando cliente com destaque agora.",
      topAwaitingTeam.length
        ? `Fila aguardando equipe: ${topAwaitingTeam
            .map((item) => `${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Nao ha fila aguardando equipe com destaque agora.",
      caseHighlights.length
        ? `Casos recentes: ${caseHighlights
            .map(
              (item) =>
                `${item.title} | cliente ${item.clientName} | status ${item.statusLabel} | prioridade ${item.priorityLabel}`
            )
            .join("; ")}.`
        : "Nao ha casos recentes visiveis para resumir.",
      recentCompleted.length
        ? `Concluidos recentemente: ${recentCompleted
            .map((item) => `${item.kindLabel} ${item.title}`)
            .join("; ")}.`
        : "Nao ha itens concluidos recentemente em destaque."
    ].join("\n");
  } catch (error) {
    console.warn("[NoemIA] Erro ao buscar contexto do staff, usando fallback:", error);

    try {
      const { getStaffOverview: getStaffOverviewFallback } = await import("./dashboard-fallback");
      const { getBusinessIntelligenceOverview: getBusinessIntelligenceOverviewFallback } =
        await import("./intelligence-fallback");

      const [overview, intelligence] = await Promise.all([
        getStaffOverviewFallback(),
        getBusinessIntelligenceOverviewFallback(30)
      ]);

      return [
        `Perfil interno autenticado: ${profile.full_name} (${profile.email}).`,
        `Resumo operacional atual: ${overview.operationalCenter.summary.criticalCount} item(ns) critico(s), ${overview.operationalCenter.summary.todayCount} para hoje, ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente, ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
        `Leitura de BI dos ultimos 30 dias: abandono de triagem ${formatRateValue(intelligence.summary.triageAbandonmentRate)}, triagem para cliente ${formatRateValue(intelligence.summary.triageToClientRate)}, ativacao no portal ${formatRateValue(intelligence.summary.portalActivationRate)}.`,
        `Fila fazer hoje: ${overview.operationalCenter.queues.today
          .map((item) => `${item.kindLabel} ${item.title}`)
          .join("; ")}.`,
        `Casos recentes: ${overview.latestCases
          .map((item) => `${item.title} | ${item.clientName}`)
          .join("; ")}.`
      ].join("\n");
    } catch (fallbackError) {
      console.error("[NoemIA] Erro ate no fallback do staff:", fallbackError);
      return `Perfil interno autenticado: ${profile.full_name} (${profile.email}). Sistema operacional em modo limitado. Use o painel principal para operacao completa.`;
    }
  }
}

function buildSystemInstructions(mode: "visitor" | "client" | "staff", contextText: string) {
  return [
    "Voce e Noemia, assistente do portal juridico.",
    "Responda em portugues do Brasil, com tom claro, humano e objetivo.",
    "Nao invente fatos, prazos, movimentacoes, documentos ou acessos que nao estejam no contexto recebido.",
    "Explique o status e o funcionamento do portal com linguagem simples.",
    "Se a pergunta exigir analise juridica profunda, estrategia, probabilidade de ganho ou decisao tecnica do caso, reconheca o limite e oriente falar com a equipe responsavel.",
    mode === "staff"
      ? "Para a advogada, priorize utilidade operacional: resuma sinais, destaque urgencia, sugira proximo passo interno e, se pedido, rascunhe um texto-base curto para retorno ao cliente."
      : "",
    mode === "client"
      ? "Voce pode usar apenas o contexto do proprio cliente autenticado. Nunca fale de outros clientes."
      : mode === "staff"
        ? "Voce pode usar o contexto operacional interno do escritorio para ajudar na rotina da equipe, sem expor dados fora do que ja esta no contexto."
        : "Para visitantes, responda apenas sobre o fluxo de atendimento, triagem, portal e duvidas iniciais.",
    mode === "staff"
      ? "Quando a pergunta pedir priorizacao, organize a resposta em: o que tratar primeiro, por que isso importa e proximo passo sugerido."
      : "",
    mode === "staff"
      ? "Quando a pergunta pedir mensagem ao cliente, deixe claro que e um rascunho base e nao um envio automatico."
      : "",
    "Sempre que fizer sentido, indique o proximo passo mais pratico.",
    "",
    "Contexto disponivel:",
    contextText
  ]
    .filter(Boolean)
    .join("\n");
}

export async function answerNoemia(rawInput: unknown, profile: PortalProfile | null) {
  const env = getServerEnv();
  const input = askNoemiaSchema.parse(rawInput);
  const requestedAudience = input.audience;

  let effectiveAudience =
    requestedAudience === "staff" && profile && profile.role !== "cliente"
      ? "staff"
      : requestedAudience === "client" && profile?.role === "cliente"
        ? "client"
        : "visitor";

  if (requestedAudience === "client" && (!profile || profile.role !== "cliente")) {
    console.log("[noemia] Cliente nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  if (requestedAudience === "staff" && (!profile || profile.role === "cliente")) {
    console.log("[noemia] Staff nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  if (!env.OPENAI_API_KEY) {
    console.error("[noemia] OPENAI_API_KEY nao encontrada no ambiente");

    return {
      audience: effectiveAudience,
      answer: "Olá! Sou a NoemIA. No momento estou operando em modo de configuração. Como posso te ajudar hoje?"
    };
  }

  const contextText =
    effectiveAudience === "staff" && profile
      ? await buildStaffContext(profile)
      : effectiveAudience === "client" && profile
        ? await buildClientContext(profile)
        : buildPublicContext();

  const systemInstructions = buildSystemInstructions(effectiveAudience, contextText);

  const conversationHistory = input.history.slice(-8).map((message) => ({
    role: message.role,
    content: [
      {
        type: "input_text",
        text: message.content
      }
    ]
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemInstructions
            }
          ]
        },
        ...conversationHistory,
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: input.message
            }
          ]
        }
      ],
      max_output_tokens: effectiveAudience === "staff" ? 900 : 600
    })
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[noemia] Erro na chamada OpenAI:", details);

    return {
      audience: effectiveAudience,
      answer: "Olá! Sou a NoemIA. No momento estou operando em modo de configuração. Como posso te ajudar hoje?"
    };
  }

  const payload = await response.json();
  const answer = extractResponseText(payload);

  if (!answer) {
    console.error("[noemia] Resposta vazia da OpenAI");

    return {
      audience: effectiveAudience,
      answer: "Olá! Sou a NoemIA. No momento estou operando em modo de configuração. Como posso te ajudar hoje?"
    };
  }

  return {
    audience: effectiveAudience,
    answer
  };
}