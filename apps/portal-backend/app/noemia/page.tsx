import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { getCurrentProfile } from "../../lib/auth/guards";
import { CLIENT_LOGIN_PATH } from "../../lib/auth/access-control";
import {
  appendEntryContextToPath,
  getEntryContextPayload,
  readEntryContext
} from "../../lib/entry-context";

export const metadata: Metadata = {
  title: "Noemia",
  description:
    "Assistente inicial do portal para orientar visitantes e ajudar clientes a entender o proprio acompanhamento.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/noemia"
  }
};

export default async function NoemiaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const entryContext = readEntryContext(await searchParams);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const homeHref = appendEntryContextToPath("/", entryContext);
  const triageHref = appendEntryContextToPath("/triagem", entryContext);
  const noemiaHref = appendEntryContextToPath("/noemia", entryContext);
  const clientLoginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const profile = await getCurrentProfile();
  const isStaffMode =
    !!profile && profile.is_active && (profile.role === "advogada" || profile.role === "admin");
  const isClientMode =
    profile?.role === "cliente" && profile.is_active && !!profile.first_login_completed_at;
  const audience = isStaffMode ? "staff" : isClientMode ? "client" : "visitor";
  const navigation = isStaffMode
    ? [
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/noemia", label: "Noemia", active: true }
      ]
    : isClientMode
    ? [
        { href: "/cliente", label: "Meu painel" },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" },
        { href: "/noemia", label: "Noemia", active: true }
      ]
    : [
        { href: homeHref, label: "Inicio" },
        { href: triageHref, label: "Triagem" },
        { href: noemiaHref, label: "Noemia", active: true },
        { href: clientLoginHref, label: "Area do cliente" }
      ];
  const suggestedPrompts = isStaffMode
    ? [
        "Resuma as prioridades de hoje e diga o que devo tratar primeiro.",
        "Quais casos estao sem atualizacao ha mais tempo e qual proximo passo interno faz sentido?",
        "Monte um texto-base curto para cobrar o cliente sobre documentos pendentes.",
        "Qual triagem mais urgente precisa de minha atencao agora?",
        "Analise a carga de trabalho desta semana e sugira como organizar melhor."
      ]
    : isClientMode
    ? [
        "Explique o status atual do meu caso em linguagem simples.",
        "Quais documentos estao pendentes no meu portal?",
        "Qual e a proxima data importante do meu acompanhamento?",
        "O que eu preciso fazer para seguir com meu caso?",
        "Resuma o que aconteceu recentemente no meu acompanhamento."
      ]
    : [
        "Como funciona a triagem inicial do atendimento?",
        "Quando eu recebo acesso ao portal do cliente?",
        "O que eu consigo acompanhar dentro do portal?",
        "Quais areas juridicas sao atendidas pelo escritorio?",
        "Como funciona o processo de acompanhamento de caso?"
      ];
  const utilityContent =
    profile && profile.is_active ? (
      <PortalSessionBanner
        role={profile.role}
        fullName={profile.full_name}
        email={profile.email}
        workspaceLabel={isStaffMode ? "Noemia interna" : "Portal autenticado"}
        workspaceHint={
          isStaffMode
            ? "Sessao interna ativa para usar a assistente com contexto operacional."
            : "Sessao ativa para usar a assistente com contexto do proprio portal."
        }
      />
    ) : null;

  return (
    <>
      <ProductEventBeacon
        eventKey="noemia_opened"
        eventGroup="ai"
        payload={{ audience, ...entryContextPayload }}
      />
      <AppFrame
        eyebrow="Noemia"
        title={
          isStaffMode
            ? "Uma assistente operacional para transformar sinais do painel em acao pratica."
            : isClientMode
            ? "Uma assistente para traduzir o seu portal em linguagem mais simples."
            : "Uma assistente inicial para orientar a jornada antes e depois da triagem."
        }
        description={
          isStaffMode
            ? "Noemia cruza filas internas, triagens, pendencias, agenda e BI para resumir prioridades, sugerir proximo passo e apoiar a rotina da advogada."
            : isClientMode
            ? "Noemia usa apenas o contexto do seu proprio portal para explicar status, agenda, documentos e proximos passos com mais clareza."
            : "Noemia ajuda visitantes a entender triagem, atendimento, convite e funcionamento do portal sem substituir o retorno tecnico da equipe."
        }
        utilityContent={utilityContent}
        navigation={navigation}
        highlights={[
          {
            label: "Modo",
            value: isStaffMode
              ? "Operacao interna"
              : isClientMode
                ? "Cliente autenticado"
                : "Visitante"
          },
          {
            label: "Base",
            value: isStaffMode
              ? "Filas, BI e operacao"
              : isClientMode
                ? "Contexto do seu portal"
                : "Fluxo institucional"
          },
          {
            label: "Melhor uso",
            value: isStaffMode ? "Prioridade e proximo passo" : "Duvidas simples e orientacao"
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
            : isClientMode
            ? { href: "/cliente", label: "Voltar ao meu painel", tone: "secondary" as const }
            : { href: triageHref, label: "Iniciar triagem", tone: "secondary" as const }
        ]}
      >
        <div className="grid two">
          <SectionCard
            title={
              isStaffMode
                ? "Conversa com contexto operacional do escritorio"
                : isClientMode
                  ? "Conversa com contexto do seu caso"
                  : "Orientacao inicial com contexto do escritorio"
            }
            description={
              isStaffMode
                ? "Use a assistente para resumir triagens, enxergar prioridades, montar proximos passos e rascunhar retornos com mais velocidade."
                : isClientMode
                ? "Pergunte de forma direta. A assistente responde com base no que esta visivel no seu proprio portal."
                : "Use a assistente para tirar duvidas antes da triagem ou entender como o portal funciona."
            }
          >
            <NoemiaAssistant
              audience={audience}
              displayName={profile?.full_name || "Voce"}
              suggestedPrompts={suggestedPrompts}
              currentPath={noemiaHref}
            />
          </SectionCard>

          <div className="stack">
            <SectionCard
              title="O que a Noemia faz bem agora"
              description="Esta primeira camada ja foi pensada para ser util desde o primeiro dia, sem prometer mais do que deve."
            >
              <ul className="timeline">
                {isStaffMode ? (
                  <>
                    <li>1. Resume triagens, filas e pendencias com linguagem mais acionavel.</li>
                    <li>2. Sugere prioridade inicial e proximo passo interno com base no contexto atual.</li>
                    <li>3. Ajuda a transformar leitura operacional em texto-base de retorno ao cliente.</li>
                    <li>4. Mantem limites claros quando a pergunta exigir criterio juridico final da equipe.</li>
                  </>
                ) : isClientMode ? (
                  <>
                    <li>1. Explica o status atual do caso em linguagem menos tecnica.</li>
                    <li>2. Resume o que ha de documentos, pendencias e proximas datas visiveis.</li>
                    <li>3. Orienta o proximo passo pratico dentro do portal.</li>
                    <li>4. Mantem limites claros quando a pergunta exigir estrategia juridica da equipe.</li>
                  </>
                ) : (
                  <>
                    <li>1. Explica como funciona a triagem e o retorno inicial.</li>
                    <li>2. Mostra quando o portal entra na jornada do cliente.</li>
                    <li>3. Ajuda a reduzir duvidas antes do envio da triagem.</li>
                    <li>4. Encaminha para a triagem quando a pergunta depender do contexto do caso.</li>
                  </>
                )}
              </ul>
            </SectionCard>

            <SectionCard
              title="Limites importantes"
              description="A ideia aqui e ampliar clareza e velocidade, sem trocar o criterio tecnico da equipe."
            >
              <div className="support-panel">
                <div className="support-row">
                  <span className="support-label">Seguranca</span>
                  <strong>
                    {isStaffMode
                      ? "A assistente usa o contexto interno do escritorio apenas para apoiar a operacao da equipe."
                      : isClientMode
                      ? "A assistente usa apenas o contexto do seu proprio portal autenticado."
                      : "A assistente usa apenas o fluxo publico e institucional do escritorio."}
                  </strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Escopo</span>
                  <strong>
                    {isStaffMode
                      ? "Ela resume, organiza e sugere; nao substitui o criterio tecnico e estrategico da advogada."
                      : "Ela explica, resume e orienta; nao substitui decisao tecnica individual do caso."}
                  </strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Proximo passo</span>
                  <strong>
                    {isStaffMode
                      ? "Use a resposta como apoio para agir mais rapido no painel, nao como decisao final automatica."
                      : isClientMode
                      ? "Se a duvida exigir analise juridica do caso, a melhor saida continua sendo falar com a equipe."
                      : "Se a pergunta depender do seu caso concreto, o caminho certo continua sendo preencher a triagem."}
                  </strong>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </AppFrame>
    </>
  );
}
