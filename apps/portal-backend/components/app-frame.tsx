import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
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
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={item.active ? "workspace-link active" : "workspace-link"}
                >
                  {item.label}
                </Link>
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
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={action.tone === "secondary" ? "button secondary" : "button"}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </header>
      <main className="page-grid">{children}</main>
    </div>
  );
}
