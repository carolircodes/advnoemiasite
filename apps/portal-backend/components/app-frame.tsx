import type { ReactNode } from "react";
import Link from "next/link";

import { TrackedLink } from "@/components/tracked-link";
import { LEGAL_CONTACT_EMAIL, PUBLIC_SITE_LEGAL_LINKS } from "@/lib/public-site";

type Action = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
  trackingEventKey?: string;
  trackingEventGroup?: string;
  trackingPayload?: Record<string, unknown>;
};

type NavigationItem = {
  href: string;
  label: string;
  active?: boolean;
};

type Highlight = {
  label: string;
  value: string;
};

type AppFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: Action[];
  navigation?: NavigationItem[];
  highlights?: Highlight[];
  utilityContent?: ReactNode;
  children: ReactNode;
};

export function AppFrame({
  eyebrow,
  title,
  description,
  actions = [],
  navigation = [],
  highlights = [],
  utilityContent,
  children
}: AppFrameProps) {
  function renderFrameLink({
    href,
    label,
    className,
    active,
    eventKey,
    eventGroup,
    trackingPayload
  }: {
    href: string;
    label: string;
    className: string;
    active?: boolean;
    eventKey?: string;
    eventGroup?: string;
    trackingPayload?: Record<string, unknown>;
  }) {
    if (eventKey) {
      return (
        <TrackedLink
          href={href}
          className={className}
          aria-current={active ? "page" : undefined}
          eventKey={eventKey}
          eventGroup={eventGroup}
          trackingPayload={trackingPayload}
        >
          {label}
        </TrackedLink>
      );
    }

    return (
      <Link href={href} className={className} aria-current={active ? "page" : undefined}>
        {label}
      </Link>
    );
  }

  return (
    <div className="portal-root">
      <header className="hero-shell">
        <div className="hero-main">
          {utilityContent ? <div className="frame-utility">{utilityContent}</div> : null}
          {navigation.length ? (
            <nav className="workspace-nav" aria-label="Navegacao do portal">
              {navigation.map((item) => (
                <div key={`${item.href}-${item.label}`}>
                  {renderFrameLink({
                    href: item.href,
                    label: item.label,
                    className: item.active ? "workspace-link active" : "workspace-link",
                    active: item.active
                  })}
                </div>
              ))}
            </nav>
          ) : null}
          <div className="hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {highlights.length ? (
            <div className="hero-highlights">
              {highlights.map((highlight) => (
                <div key={`${highlight.label}-${highlight.value}`} className="highlight-chip">
                  <span>{highlight.label}</span>
                  <strong>{highlight.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {actions.length ? (
          <div className="hero-actions">
            <div className="rounded-[28px] border border-[rgba(142,106,59,0.14)] bg-[rgba(255,251,245,0.74)] p-4 text-sm leading-7 text-[#52615b] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              Navegacao executiva com linguagem unificada, superficies editoriais e prioridade mais clara entre acao, contexto e leitura.
            </div>
            {actions.map((action) => (
              <div key={`${action.href}-${action.label}`}>
                {renderFrameLink({
                  href: action.href,
                  label: action.label,
                  className: action.tone === "secondary" ? "button secondary" : "button",
                  eventKey: action.trackingEventKey,
                  eventGroup: action.trackingEventGroup,
                  trackingPayload: action.trackingPayload
                })}
              </div>
            ))}
          </div>
        ) : null}
      </header>
      <main className="page-grid">{children}</main>
      <footer className="site-footer" aria-label="Rodape institucional">
        <div className="site-footer-copy">
          <span className="site-footer-eyebrow">Informacoes institucionais</span>
          <strong>Noemia Paixao Advocacia</strong>
          <p>
            Atendimento juridico com comunicacao clara, fluxos organizados e canais
            oficiais integrados ao ecossistema digital do escritorio.
          </p>
        </div>
        <div className="site-footer-links">
          {PUBLIC_SITE_LEGAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="site-footer-link">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="site-footer-contact">
          <span className="site-footer-eyebrow">Contato institucional</span>
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="site-footer-link">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
