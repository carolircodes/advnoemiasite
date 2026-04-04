import type { ReactNode } from "react";

import { TrackedLink } from "@/components/tracked-link";

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
  children: ReactNode;
};

export function AppFrame({
  eyebrow,
  title,
  description,
  actions = [],
  navigation = [],
  highlights = [],
  children
}: AppFrameProps) {
  return (
    <div className="portal-root">
      <header className="hero-shell">
        <div className="hero-main">
          {navigation.length ? (
            <nav className="workspace-nav" aria-label="Navegacao do portal">
              {navigation.map((item) => (
                <TrackedLink
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={item.active ? "workspace-link active" : "workspace-link"}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </TrackedLink>
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
            {actions.map((action) => (
              <TrackedLink
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={action.tone === "secondary" ? "button secondary" : "button"}
                eventKey={action.trackingEventKey}
                eventGroup={action.trackingEventGroup}
                trackingPayload={action.trackingPayload}
              >
                {action.label}
              </TrackedLink>
            ))}
          </div>
        ) : null}
      </header>
      <main className="page-grid">{children}</main>
    </div>
  );
}
