import type { ReactNode } from "react";
import Link from "next/link";

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
  console.log("[AppFrame] Renderizando com:", { eyebrow, title, hasActions: actions.length > 0, hasNavigation: navigation.length > 0, hasHighlights: highlights.length > 0, hasUtilityContent: !!utilityContent });

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
    </div>
  );
}
