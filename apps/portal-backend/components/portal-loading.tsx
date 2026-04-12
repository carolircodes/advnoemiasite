type PortalLoadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  navigation: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
};

function SkeletonParagraph({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={`${lines}-${index}`}
          className={`skeleton-line ${index === lines - 1 ? "short" : ""}`}
        />
      ))}
    </div>
  );
}

export function PortalLoadingPage({
  eyebrow,
  title,
  description,
  navigation
}: PortalLoadingProps) {
  return (
    <div className="portal-root" aria-busy="true" aria-live="polite">
      <header className="hero-shell">
        <div className="hero-main">
          {navigation.length ? (
            <nav className="workspace-nav" aria-label="Navegacao do portal">
              {navigation.map((item) => (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={item.active ? "workspace-link active" : "workspace-link"}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="hero-highlights">
            {[
              { label: "Carregando", value: "..." },
              { label: "Sincronizando", value: "..." },
              { label: "Organizando", value: "..." },
              { label: "Preparando", value: "..." }
            ].map((highlight) => (
              <div
                key={`${highlight.label}-${highlight.value}`}
                className="highlight-chip"
              >
                <span>{highlight.label}</span>
                <strong>{highlight.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="page-grid">
        <div className="metric-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="metric-card skeleton-card" aria-hidden="true">
              <span className="skeleton-line short" />
              <strong className="skeleton-line" />
            </div>
          ))}
        </div>

        <div className="grid two">
          <section className="panel">
            <div className="section-head">
              <h2>Carregando painel</h2>
            </div>
            <SkeletonParagraph lines={4} />
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Carregando itens importantes</h2>
            </div>
            <SkeletonParagraph lines={4} />
          </section>
        </div>

        <div className="grid two">
          <section className="panel">
            <div className="section-head">
              <h2>Carregando lista principal</h2>
            </div>
            <div className="skeleton-feed">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="update-card skeleton-card" aria-hidden="true">
                  <SkeletonParagraph lines={3} />
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Carregando detalhes</h2>
            </div>
            <div className="skeleton-feed">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="update-card skeleton-card" aria-hidden="true">
                  <SkeletonParagraph lines={3} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
