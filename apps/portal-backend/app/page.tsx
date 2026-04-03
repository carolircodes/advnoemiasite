import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";

export default function HomePage() {
  return (
    <AppFrame
      eyebrow="Base real do portal"
      title="Arquitetura pronta para autenticação, cadastro interno e notificações."
      description="Esta aplicação concentra a fundação técnica do portal real, sem interromper o site estático já publicado."
      actions={[
        { href: "/auth/login", label: "Login do cliente" },
        { href: "/internal/advogada", label: "Painel da advogada", tone: "secondary" }
      ]}
    >
      <div className="grid two">
        <SectionCard
          title="Fluxo preservado"
          description="O site público continua direcionando novos clientes para a triagem e clientes já cadastrados para a área do cliente."
        >
          <div className="tag-row">
            <span className="tag">Triagem para novos clientes</span>
            <span className="tag soft">Convite por e-mail</span>
            <span className="tag soft">Login com e-mail + senha</span>
          </div>
        </SectionCard>
        <SectionCard
          title="Módulos desta etapa"
          description="A fundação cobre autenticação, cadastro interno, registro de eventos, fila de notificações e áreas protegidas."
        >
          <ul className="list">
            <li>Perfis separados para advogada/admin e cliente.</li>
            <li>Cadastro interno com convite de primeiro acesso.</li>
            <li>Reset de senha e callback seguro por e-mail.</li>
            <li>Eventos do portal já preparados para notificação futura.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Rotas principais"
        description="Essas são as entradas centrais da nova aplicação."
      >
        <div className="grid two">
          <div className="subtle-panel stack">
            <strong className="card-title">Autenticação</strong>
            <Link href="/auth/login" className="button">
              Abrir login do cliente
            </Link>
            <Link href="/auth/esqueci-senha" className="button secondary">
              Recuperar acesso
            </Link>
          </div>
          <div className="subtle-panel stack">
            <strong className="card-title">Operação interna</strong>
            <Link href="/internal/advogada" className="button">
              Abrir painel da advogada
            </Link>
            <span className="muted">
              O cadastro do cliente e o convite de acesso já ficam concentrados ali.
            </span>
          </div>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
