import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { getCurrentProfile } from "@/lib/auth/guards";

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

export default async function NoemiaPage() {
  const profile = await getCurrentProfile();
  const isClientMode =
    profile?.role === "cliente" && profile.is_active && !!profile.first_login_completed_at;
  const audience = isClientMode ? "client" : "visitor";
  const navigation = isClientMode
    ? [
        { href: "/cliente", label: "Meu painel" },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" },
        { href: "/noemia", label: "Noemia", active: true }
      ]
    : [
        { href: "/", label: "Inicio" },
        { href: "/triagem", label: "Triagem" },
        { href: "/noemia", label: "Noemia", active: true },
        { href: "/auth/login", label: "Area do cliente" }
      ];
  const suggestedPrompts = isClientMode
    ? [
        "Explique o status atual do meu caso em linguagem simples.",
        "Quais documentos estao pendentes no meu portal?",
        "Qual e a proxima data importante do meu acompanhamento?"
      ]
    : [
        "Como funciona a triagem inicial do atendimento?",
        "Quando eu recebo acesso ao portal do cliente?",
        "O que eu consigo acompanhar dentro do portal?"
      ];

  return (
    <>
      <ProductEventBeacon eventKey="noemia_opened" eventGroup="ai" />
      <AppFrame
        eyebrow="Noemia"
        title={
          isClientMode
            ? "Uma assistente para traduzir o seu portal em linguagem mais simples."
            : "Uma assistente inicial para orientar a jornada antes e depois da triagem."
        }
        description={
          isClientMode
            ? "Noemia usa apenas o contexto do seu proprio portal para explicar status, agenda, documentos e proximos passos com mais clareza."
            : "Noemia ajuda visitantes a entender triagem, atendimento, convite e funcionamento do portal sem substituir o retorno tecnico da equipe."
        }
        navigation={navigation}
        highlights={[
          { label: "Modo", value: isClientMode ? "Cliente autenticado" : "Visitante" },
          { label: "Base", value: isClientMode ? "Contexto do seu portal" : "Fluxo institucional" },
          { label: "Melhor uso", value: "Duvidas simples e orientacao" },
          { label: "Limite", value: "Sem estrategia juridica final" }
        ]}
        actions={[
          isClientMode
            ? { href: "/cliente", label: "Voltar ao meu painel", tone: "secondary" as const }
            : { href: "/triagem", label: "Iniciar triagem", tone: "secondary" as const }
        ]}
      >
        <div className="grid two">
          <SectionCard
            title={isClientMode ? "Conversa com contexto do seu caso" : "Orientacao inicial com contexto do escritorio"}
            description={
              isClientMode
                ? "Pergunte de forma direta. A assistente responde com base no que esta visivel no seu proprio portal."
                : "Use a assistente para tirar duvidas antes da triagem ou entender como o portal funciona."
            }
          >
            <NoemiaAssistant
              audience={audience}
              displayName={profile?.full_name || "Voce"}
              suggestedPrompts={suggestedPrompts}
            />
          </SectionCard>

          <div className="stack">
            <SectionCard
              title="O que a Noemia faz bem agora"
              description="Esta primeira camada ja foi pensada para ser util desde o primeiro dia, sem prometer mais do que deve."
            >
              <ul className="timeline">
                {isClientMode ? (
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
                    {isClientMode
                      ? "A assistente usa apenas o contexto do seu proprio portal autenticado."
                      : "A assistente usa apenas o fluxo publico e institucional do escritorio."}
                  </strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Escopo</span>
                  <strong>Ela explica, resume e orienta; nao substitui decisao tecnica individual do caso.</strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Proximo passo</span>
                  <strong>
                    {isClientMode
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
