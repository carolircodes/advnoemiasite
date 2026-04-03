import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type AppFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: Action[];
  children: ReactNode;
};

export function AppFrame({
  eyebrow,
  title,
  description,
  actions = [],
  children
}: AppFrameProps) {
  return (
    <div className="portal-root">
      <header className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
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

