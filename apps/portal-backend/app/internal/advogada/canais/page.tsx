import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import {
  InstitutionalStatCard,
  StrategicPanel
} from "@/components/portal/module-primitives";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";

const channelSignals = [
  {
    eyebrow: "Canal prioritário",
    title: "WhatsApp como eixo de continuidade",
    description:
      "Reúne o volume mais sensível da operação 1:1, então deve puxar handoff, resposta humana e próxima ação com o menor atrito possível.",
    meta: "Conversas diretas",
    tone: "success" as const
  },
  {
    eyebrow: "Origem editorial",
    title: "Instagram como porta de contexto e intenção",
    description:
      "O direct entra como leitura de relacionamento e descoberta, com filtro próprio para separar conversa viva de ruído social.",
    meta: "Leitura comercial",
    tone: "accent" as const
  },
  {
    eyebrow: "Decisão humana",
    title: "Fila prioritária de handoff",
    description:
      "Mostra apenas o que já pede atuação humana real, sem misturar broadcast, navegação editorial ou metadados secundários.",
    meta: "Agir agora",
    tone: "warning" as const
  }
];

const orchestrationRoutes = [
  {
    kicker: "Inbox oficial",
    title: "Atendimento multicanal",
    description:
      "Abra a central principal quando a prioridade for conversa, handoff, resposta humana, memória operacional e follow-up.",
    href: "/internal/advogada/atendimento",
    action: "Abrir inbox"
  },
  {
    kicker: "Camada comercial",
    title: "CRM comercial",
    description:
      "Use o CRM quando a leitura principal for conversão, prontidão, objeção, consulta, fechamento e pagamento.",
    href: "/internal/advogada/operacional",
    action: "Abrir CRM"
  },
  {
    kicker: "Canal filtrado",
    title: "WhatsApp em foco",
    description:
      "Recorte as threads vindas do WhatsApp para agir na fila com mais velocidade e menos ruído lateral.",
    href: "/internal/advogada/atendimento?channel=whatsapp",
    action: "Ver WhatsApp"
  },
  {
    kicker: "Canal filtrado",
    title: "Instagram em foco",
    description:
      "Separe directs e sinais do Instagram para leitura operacional sem confundir relacionamento com broadcast.",
    href: "/internal/advogada/atendimento?channel=instagram",
    action: "Ver Instagram"
  }
];

const structuralRules = [
  {
    title: "Inbox não é distribuição editorial",
    body:
      "A leitura de conversa fica concentrada em Atendimento. Broadcast e rotas editoriais não devem competir com resposta humana dentro da mesma tela."
  },
  {
    title: "Origem, contexto e ação precisam aparecer em camadas",
    body:
      "Primeiro vem a origem do contato, depois o contexto comercial e só então a ação operacional, para reduzir a sensação de painel bruto."
  },
  {
    title: "Telegram segue como camada própria de distribuição",
    body:
      "A operação editorial permanece disponível, mas fora do contrato central da inbox 1:1, preservando foco e governança."
  }
];

export default async function InternalLawyerChannelsPage() {
  const profile = await requireProfile(["advogada", "admin"]);

  return (
    <AppFrame
      eyebrow="Distribuição e canais"
      title="Orquestração institucional entre origem, conversa e operação."
      description="Esta área organiza de onde a demanda nasce, onde ela é atendida e qual módulo deve conduzir a próxima decisão sem confundir Inbox, CRM e distribuição editorial."
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/atendimento", label: "Inbox" },
        { href: "/internal/advogada/canais", label: "Distribuição", active: true }
      ]}
      highlights={[
        { label: "Canais críticos", value: "3 frentes" },
        { label: "Inbox oficial", value: "Atendimento" },
        { label: "Leitura comercial", value: "CRM" },
        { label: "Editorial", value: "Telegram" }
      ]}
      actions={[
        { href: "/internal/advogada/atendimento?inboxMode=needs_human&waitingFor=human", label: "Abrir fila humana" },
        { href: "/internal/advogada/atendimento", label: "Abrir inbox", tone: "secondary" },
        { href: "/internal/advogada/operacional", label: "Abrir CRM", tone: "secondary" }
      ]}
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Distribuição operacional protegida"
          workspaceHint="Sessão interna para decidir canal, responsável e continuidade sem duplicar leitura entre módulos."
        />
      }
    >
      <SectionCard
        title="Leitura executiva da distribuição"
        description="A distribuição agora funciona como módulo de orquestração: mostra o canal certo, a camada certa e a fila certa antes de qualquer clique operacional."
      >
        <div className="grid three">
          {channelSignals.map((item) => (
            <InstitutionalStatCard
              key={item.title}
              eyebrow={item.eyebrow}
              title={item.title}
              description={item.description}
              meta={item.meta}
              tone={item.tone}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Rotas principais da operação"
          description="Cada rota abaixo resolve uma camada diferente da jornada. A ideia é diminuir dúvida operacional e evitar que o mesmo problema seja lido em telas erradas."
        >
          <div className="grid two">
            {orchestrationRoutes.map((route) => (
              <Link key={route.title} className="route-card" href={route.href}>
                <span className="shortcut-kicker">{route.kicker}</span>
                <strong>{route.title}</strong>
                <span>{route.description}</span>
                <span>{route.action}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Política estrutural desta camada"
          description="Estas regras deixam explícito o papel da distribuição dentro do portal e evitam que a operação volte a se fragmentar entre páginas parecidas."
        >
          <StrategicPanel
            eyebrow="Governança de superfície"
            title="Separação clara entre origem, conversa e editorial"
            description="A plataforma fica mais madura quando cada módulo assume seu contrato e deixa de disputar o mesmo contexto."
          >
            <ul className="update-feed compact">
              {structuralRules.map((rule) => (
                <li key={rule.title} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{rule.title}</strong>
                      <span className="item-meta">Disciplina operacional</span>
                    </div>
                    <span className="pill muted">Obrigatório</span>
                  </div>
                  <p className="update-body">{rule.body}</p>
                </li>
              ))}
            </ul>
          </StrategicPanel>
        </SectionCard>
      </div>

      <SectionCard
        title="Mapa de ação por canal"
        description='A pergunta deixa de ser apenas "de onde veio" e passa a ser "qual operação assume isso agora".'
      >
        <div className="grid three">
          <StrategicPanel
            eyebrow="WhatsApp"
            title="Conversa ativa e continuidade direta"
            description="Priorize quando houver retorno pendente, urgência ou necessidade de atuação humana com histórico recente."
          >
            <div className="pill-row">
              <span className="pill success">Contato ativo</span>
              <span className="pill muted">Handoff humano</span>
            </div>
            <Link className="button secondary" href="/internal/advogada/atendimento?channel=whatsapp">
              Abrir threads do WhatsApp
            </Link>
          </StrategicPanel>

          <StrategicPanel
            eyebrow="Instagram"
            title="Contexto, intenção e relacionamento"
            description="Use quando o movimento exigir leitura de origem, aquecimento comercial ou classificação antes da resposta final."
          >
            <div className="pill-row">
              <span className="pill warning">Origem de interesse</span>
              <span className="pill muted">Leitura comercial</span>
            </div>
            <Link className="button secondary" href="/internal/advogada/atendimento?channel=instagram">
              Abrir directs do Instagram
            </Link>
          </StrategicPanel>

          <StrategicPanel
            eyebrow="Telegram"
            title="Distribuição editorial com contrato próprio"
            description="A ponte editorial continua disponível, mas fora da inbox conversacional principal, preservando foco e leitura premium."
          >
            <div className="pill-row">
              <span className="pill muted">Editorial</span>
              <span className="pill muted">Broadcast</span>
            </div>
            <Link className="button secondary" href="/api/internal/telegram/distribution">
              Abrir distribuição do Telegram
            </Link>
          </StrategicPanel>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
