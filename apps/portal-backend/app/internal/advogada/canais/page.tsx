import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";

export default async function InternalLawyerChannelsPage() {
  await requireProfile(["advogada", "admin"]);

  return (
    <AppFrame
      eyebrow="Distribuição e canais"
      title="Distribuição por canal com leitura clara entre origem, inbox e operação."
      description="Esta camada existe como apoio operacional para abrir a Inbox oficial no recorte certo e deixar claro que distribuição editorial não é a mesma coisa que conversas 1:1."
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/atendimento", label: "Inbox" },
        { href: "/internal/advogada/canais", label: "Distribuição", active: true }
      ]}
      utilityContent={
        <PortalSessionBanner
          role="advogada"
          fullName="Advogada Noemia"
          email="noemia@advnoemia.com.br"
        />
      }
    >
      <SectionCard
        title="Inbox oficial"
        description="A operação real de threads, handoff, notas internas e resposta humana vive em Atendimento. Esta página não é uma inbox paralela."
      >
        <div className="grid two">
          <Link className="route-card" href="/internal/advogada/atendimento">
            <span className="shortcut-kicker">Inbox</span>
            <strong>Abrir atendimento multicanal</strong>
            <span>Visão geral com fila, contexto, mensagens, follow-up e memória operacional.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/operacional">
            <span className="shortcut-kicker">CRM</span>
            <strong>Abrir CRM comercial</strong>
            <span>Retome follow-up, conversão, consulta em vista e travas comerciais fora da inbox.</span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Caminhos por canal"
        description="Esses atalhos deixam explícito o fluxo para abrir conversas reais por origem."
      >
        <div className="grid three">
          <Link className="route-card" href="/internal/advogada/atendimento?channel=whatsapp">
            <span className="shortcut-kicker">WhatsApp</span>
            <strong>Threads do WhatsApp</strong>
            <span>Abra apenas as conversas vindas do WhatsApp com handoff, follow-up e resposta humana.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/atendimento?channel=instagram">
            <span className="shortcut-kicker">Instagram</span>
            <strong>Threads do Instagram</strong>
            <span>Filtre directs e sinais do Instagram para leitura operacional sem perder contexto.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/atendimento?inboxMode=needs_human&waitingFor=human">
            <span className="shortcut-kicker">Handoff</span>
            <strong>Fila humana prioritária</strong>
            <span>Abra diretamente a fila que pede atendimento humano e continuidade manual.</span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Separação estrutural desta fase"
        description="A inbox conversacional deixou de carregar a distribuição editorial do Telegram como parte obrigatória da leitura."
      >
        <div className="grid two">
          <article className="route-card">
            <span className="shortcut-kicker">Inbox conversacional</span>
            <strong>/internal/advogada/atendimento</strong>
            <span>Agora fica restrita ao contrato de threads, mensagens, contexto, handoff e notas internas.</span>
          </article>
          <article className="route-card">
            <span className="shortcut-kicker">Distribuição Telegram</span>
            <strong>/api/internal/telegram/distribution</strong>
            <span>A camada editorial e broadcast continua existindo, mas fora do contrato central da inbox multicanal.</span>
          </article>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
