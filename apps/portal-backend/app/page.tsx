import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";

export default function HomePage() {
  return (
    <AppFrame
      eyebrow="Base real do portal"
      title="Arquitetura pronta para autenticacao, cadastro interno e notificacoes."
      description="Esta aplicacao concentra a fundacao tecnica do portal real, sem interromper o site estatico ja publicado."
      actions={[{ href: "/auth/login", label: "Entrar no portal" }]}
    >
      <div className="grid two">
        <SectionCard
          title="Fluxo preservado"
          description="O site publico continua direcionando novos clientes para a triagem e clientes ja cadastrados para a area segura do portal."
        >
          <div className="tag-row">
            <span className="tag">Triagem para novos clientes</span>
            <span className="tag soft">Convite por e-mail</span>
            <span className="tag soft">Login com e-mail + senha</span>
          </div>
        </SectionCard>
        <SectionCard
          title="Modulos desta etapa"
          description="A fundacao cobre autenticacao, cadastro interno, registro de eventos, fila de notificacoes e areas protegidas."
        >
          <ul className="list">
            <li>Perfis separados para advogada/admin e cliente.</li>
            <li>Cadastro interno com convite de primeiro acesso.</li>
            <li>Reset de senha e callback seguro por e-mail.</li>
            <li>Eventos do portal ja preparados para notificacao futura.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Rotas principais"
        description="Estas sao as entradas centrais da nova aplicacao."
      >
        <div className="grid two">
          <div className="subtle-panel stack">
            <strong className="card-title">Autenticacao</strong>
            <Link href="/auth/login" className="button">
              Abrir login do portal
            </Link>
            <Link href="/auth/esqueci-senha" className="button secondary">
              Recuperar acesso
            </Link>
          </div>
          <div className="subtle-panel stack">
            <strong className="card-title">Operacao interna</strong>
            <span className="muted">
              A area interna da equipe fica disponivel somente apos autenticacao com perfil autorizado.
            </span>
            <span className="muted">
              O cadastro do cliente e o convite de acesso continuam centralizados no mesmo login seguro.
            </span>
          </div>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
