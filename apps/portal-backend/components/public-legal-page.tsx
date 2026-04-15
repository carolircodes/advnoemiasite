import type { ReactNode } from "react";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { CLIENT_LOGIN_PATH } from "@/lib/auth/access-control";
import { LEGAL_CONTACT_EMAIL } from "@/lib/public-site";

type LegalSection = {
  title: string;
  description?: string;
  content: ReactNode;
};

type PublicLegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  currentPath: string;
  highlights: Array<{ label: string; value: string }>;
  sections: LegalSection[];
  aside?: ReactNode;
};

const baseNavigation = [
  { href: "/", label: "Inicio" },
  { href: "/#atendimento", label: "Atendimento" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: CLIENT_LOGIN_PATH, label: "Area do cliente" }
];

export function PublicLegalPage({
  eyebrow,
  title,
  description,
  currentPath,
  highlights,
  sections,
  aside
}: PublicLegalPageProps) {
  const navigation = [
    ...baseNavigation,
    { href: "/politica-de-privacidade", label: "Privacidade" },
    { href: "/exclusao-de-dados", label: "Exclusao de Dados" },
    { href: "/termos-de-uso", label: "Termos" }
  ].map((item) => ({ ...item, active: item.href === currentPath }));

  return (
    <AppFrame
      eyebrow={eyebrow}
      title={title}
      description={description}
      navigation={navigation}
      highlights={highlights}
      actions={[
        {
          href: "/#atendimento",
          label: "Iniciar atendimento",
          tone: "primary"
        },
        {
          href: `mailto:${LEGAL_CONTACT_EMAIL}`,
          label: "Falar com o escritorio",
          tone: "secondary"
        }
      ]}
    >
      <div className="grid legal-grid">
        <div className="stack">
          {sections.map((section) => (
            <SectionCard
              key={section.title}
              title={section.title}
              description={section.description}
            >
              <div className="legal-copy">{section.content}</div>
            </SectionCard>
          ))}
        </div>
        <div className="stack">
          <SectionCard
            title="Canal institucional"
            description="Solicitacoes relacionadas a privacidade, exclusao de dados e uso do site podem ser encaminhadas por este contato."
          >
            <div className="legal-contact-card">
              <span className="site-footer-eyebrow">E-mail oficial</span>
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="site-footer-link">
                {LEGAL_CONTACT_EMAIL}
              </a>
              <p>
                Ao entrar em contato, informe o contexto do atendimento para facilitar a
                localizacao segura dos registros correspondentes.
              </p>
            </div>
          </SectionCard>
          {aside ? (
            <SectionCard
              title="Orientacoes complementares"
              description="Diretrizes praticas para um atendimento mais rapido e objetivo."
            >
              <div className="legal-copy">{aside}</div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </AppFrame>
  );
}
