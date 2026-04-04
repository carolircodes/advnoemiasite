import "server-only";

import type { PortalProfile } from "@/lib/auth/guards";
import { askNoemiaSchema, caseAreaLabels } from "@/lib/domain/portal";
import { getServerEnv } from "@/lib/config/env";
import { getClientWorkspace } from "@/lib/services/dashboard";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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
}

function buildSystemInstructions(mode: "visitor" | "client", contextText: string) {
  return [
    "Voce e Noemia, assistente do portal juridico.",
    "Responda em portugues do Brasil, com tom claro, humano e objetivo.",
    "Nao invente fatos, prazos, movimentacoes, documentos ou acessos que nao estejam no contexto recebido.",
    "Explique o status e o funcionamento do portal com linguagem simples.",
    "Se a pergunta exigir analise juridica profunda, estrategia, probabilidade de ganho ou decisao tecnica do caso, reconheca o limite e oriente falar com a equipe responsavel.",
    mode === "client"
      ? "Voce pode usar apenas o contexto do proprio cliente autenticado. Nunca fale de outros clientes."
      : "Para visitantes, responda apenas sobre o fluxo de atendimento, triagem, portal e duvidas iniciais.",
    "Sempre que fizer sentido, indique o proximo passo mais pratico.",
    "",
    "Contexto disponivel:",
    contextText
  ].join("\n");
}

export async function answerNoemia(rawInput: unknown, profile: PortalProfile | null) {
  const env = getServerEnv();
  const input = askNoemiaSchema.parse(rawInput);
  const requestedAudience = input.audience;
  const effectiveAudience =
    requestedAudience === "client" && profile?.role === "cliente" ? "client" : "visitor";

  if (requestedAudience === "client" && (!profile || profile.role !== "cliente")) {
    throw new Error("Faca login como cliente para receber respostas baseadas no seu portal.");
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "A Noemia ainda nao foi configurada neste ambiente. Defina OPENAI_API_KEY e OPENAI_MODEL no .env.local."
    );
  }

  const contextText =
    effectiveAudience === "client" && profile
      ? await buildClientContext(profile)
      : buildPublicContext();
  const systemInstructions = buildSystemInstructions(effectiveAudience, contextText);
  const conversationHistory = input.history
    .slice(-8)
    .map((message) => ({
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
      max_output_tokens: 600
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Nao foi possivel consultar a Noemia agora: ${details}`);
  }

  const payload = await response.json();
  const answer = extractResponseText(payload);

  if (!answer) {
    throw new Error("A Noemia nao retornou uma resposta valida nesta tentativa.");
  }

  return {
    audience: effectiveAudience,
    answer
  };
}
