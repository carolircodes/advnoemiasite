import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { getCurrentProfile } from "../../lib/auth/guards";
import { appendEntryContextToPath, getEntryContextPayload, readEntryContext } from "../../lib/entry-context";

export const metadata: Metadata = {
  title: "Noemia",
  description:
    "Assistente premium do escritorio para orientar clientes autenticados e apoiar a operacao interna com mais clareza.",
  robots: {
    index: false,
    follow: false
  },
  alternates: {
    canonical: "/"
  }
};

function buildHomeRedirect(
  searchParams: Record<string, string | string[] | undefined>,
  hash: string
) {
  const url = new URL("/", "https://app.local");

  for (const [key, rawValue] of Object.entries(searchParams)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
}

export default async function NoemiaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const entryContext = readEntryContext(resolvedSearchParams);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const profile = await getCurrentProfile();
  const isStaffMode =
    !!profile && profile.is_active && (profile.role === "advogada" || profile.role === "admin");
  const isClientMode =
    profile?.role === "cliente" && profile.is_active && !!profile.first_login_completed_at;

  if (!isStaffMode && !isClientMode) {
    permanentRedirect(buildHomeRedirect(resolvedSearchParams, "atendimento"));
  }

  const activeProfile = profile!;
  const audience = isStaffMode ? "staff" : "client";
  const navigation = isStaffMode
    ? [
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/noemia", label: "Noemia", active: true }
      ]
    : [
        { href: "/cliente", label: "Meu painel" },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" },
        { href: "/noemia", label: "Noemia", active: true }
      ];
  const suggestedPrompts = isStaffMode
    ? [
        "Resuma as prioridades de hoje e diga o que devo tratar primeiro.",
        "Quais casos estao esfriando e qual acao humana faz mais sentido agora?",
        "Monte um texto-base curto para cobrar o cliente sobre documentos pendentes sem soar burocratico.",
        "Qual triagem mais urgente tem maior chance de virar consulta agora?",
        "Analise a carga desta semana e sugira a melhor sequencia operacional."
      ]
    : [
        "Explique o status atual do meu caso em linguagem simples.",
        "Quais documentos estao pendentes no meu portal?",
        "Qual e a proxima data importante do meu acompanhamento?",
        "O que eu preciso fazer para seguir com meu caso?",
        "Resuma o que aconteceu recentemente no meu acompanhamento."
      ];

  return (
    <>
      <ProductEventBeacon
        eventKey="noemia_opened"
        eventGroup="ai"
        payload={{ audience, surface: "dedicated_authenticated_noemia", ...entryContextPayload }}
      />
      <AppFrame
        eyebrow="Noemia"
        title={
          isStaffMode
            ? "Uma camada de decisao para transformar sinais operacionais em acao rapida."
            : "Uma assistente para traduzir seu acompanhamento com clareza e calma."
        }
        description={
          isStaffMode
            ? "NoemIA cruza filas internas, triagens, pendencias, agenda e sinais comerciais para resumir prioridades, sugerir proximo passo e acelerar a rotina da equipe."
            : "NoemIA usa apenas o contexto do seu proprio portal para explicar status, agenda, documentos e proximos passos sem gerar ruido."
        }
        utilityContent={
          <PortalSessionBanner
            role={activeProfile.role}
            fullName={activeProfile.full_name}
            email={activeProfile.email}
            workspaceLabel={isStaffMode ? "Noemia interna" : "Portal autenticado"}
            workspaceHint={
              isStaffMode
                ? "Sessao interna ativa para usar a assistente com contexto operacional."
                : "Sessao ativa para usar a assistente com contexto do proprio portal."
            }
          />
        }
        navigation={navigation}
        highlights={[
          {
            label: "Modo",
            value: isStaffMode ? "Operacao interna" : "Cliente autenticado"
          },
          {
            label: "Base",
            value: isStaffMode ? "Filas, BI e operacao" : "Contexto do seu portal"
          },
          {
            label: "Melhor uso",
            value: isStaffMode ? "Prioridade, risco e proximo passo" : "Orientacao clara e proximo movimento"
          },
          {
            label: "Limite",
            value: isStaffMode ? "Nao substitui decisao juridica final" : "Sem estrategia juridica final"
          }
        ]}
        actions={[
          isStaffMode
            ? {
                href: "/internal/advogada",
                label: "Voltar ao painel",
                tone: "secondary" as const
              }
            : { href: "/cliente", label: "Voltar ao meu painel", tone: "secondary" as const }
        ]}
      >
        <div className="grid two">
          <SectionCard
            title={
              isStaffMode
                ? "Conversa com contexto operacional do escritorio"
                : "Conversa com contexto do seu caso"
            }
            description={
              isStaffMode
                ? "Use a assistente para resumir triagens, enxergar prioridades, identificar oportunidade comercial e rascunhar retornos com mais velocidade."
                : "Pergunte de forma direta. A assistente responde com base no que esta visivel no seu proprio portal."
            }
          >
            <NoemiaAssistant
              audience={audience}
              displayName={activeProfile.full_name || "Voce"}
              suggestedPrompts={suggestedPrompts}
              currentPath="/noemia"
            />
          </SectionCard>

          <div className="stack">
            {isStaffMode ? (
              <SectionCard
                title="Onde a Noemia entra no fluxo oficial"
                description="A assistente sobe de nivel quando fica ancorada nas mesmas superficies que organizam triagem, operacao humana e acompanhamento por caso."
              >
                <div className="grid two">
                  <Link className="route-card" href="/internal/advogada#triagens-recebidas">
                    <span className="shortcut-kicker">Entrada</span>
                    <strong>Triagens recebidas</strong>
                    <span>Use a fila principal quando a Noemia apontar que uma triagem precisa de leitura humana imediata.</span>
                  </Link>
                  <Link className="route-card" href="/internal/advogada/operacional">
                    <span className="shortcut-kicker">Continuidade</span>
                    <strong>Painel operacional</strong>
                    <span>Quando o caso pedir follow-up, consulta ou contato humano, a conducao oficial segue no operacional.</span>
                  </Link>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="O que a Noemia faz bem agora"
              description="A camada atual foi desenhada para ser util de verdade, com limites claros e continuidade entre orientacao, operacao e acompanhamento."
            >
              <ul className="timeline">
                {isStaffMode ? (
                  <>
                    <li>1. Resume triagens, filas e pendencias com linguagem mais acionavel.</li>
                    <li>2. Sugere prioridade inicial, risco operacional e proximo passo com base no contexto atual.</li>
                    <li>3. Ajuda a transformar leitura operacional em texto-base de retorno ao cliente.</li>
                    <li>4. Mantem limites claros quando a pergunta exigir criterio juridico final da equipe.</li>
                  </>
                ) : (
                  <>
                    <li>1. Explica o status atual do caso em linguagem menos tecnica.</li>
                    <li>2. Resume o que ha de documentos, pendencias e proximas datas visiveis.</li>
                    <li>3. Orienta o proximo passo pratico dentro do portal.</li>
                    <li>4. Mantem limites claros quando a pergunta exigir estrategia juridica da equipe.</li>
                  </>
                )}
              </ul>
            </SectionCard>
          </div>
        </div>
      </AppFrame>
    </>
  );
}
