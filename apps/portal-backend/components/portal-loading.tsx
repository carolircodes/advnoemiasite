import { PremiumFeatureCard, PremiumSection } from "@/components/portal/premium-experience";

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
          <PremiumSection
            title="Carregando painel"
            description="Estamos organizando a leitura principal antes de liberar a experiencia completa."
          >
            <SkeletonParagraph lines={4} />
          </PremiumSection>
          <PremiumSection
            title="Carregando itens importantes"
            description="Os blocos com maior prioridade entram primeiro para manter a leitura util."
          >
            <SkeletonParagraph lines={4} />
          </PremiumSection>
        </div>

        <div className="grid two">
          <PremiumSection
            title="Carregando lista principal"
            description="A timeline principal esta sendo preparada com ordem e contexto."
          >
            <div className="skeleton-feed">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="update-card skeleton-card" aria-hidden="true">
                  <SkeletonParagraph lines={3} />
                </div>
              ))}
            </div>
          </PremiumSection>
          <PremiumSection
            title="Carregando detalhes"
            description="O contexto complementar chega em seguida para manter o portal consistente."
          >
            <div className="skeleton-feed">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="update-card skeleton-card" aria-hidden="true">
                  <SkeletonParagraph lines={3} />
                </div>
              ))}
            </div>
          </PremiumSection>
        </div>

        <div className="grid three">
          <PremiumFeatureCard
            eyebrow="Ritmo"
            title="Prioridade no que destrava"
            description="Os primeiros blocos carregam contexto e acao antes de detalhes secundarios."
          />
          <PremiumFeatureCard
            eyebrow="Continuidade"
            title="Leitura sem quebras bruscas"
            description="Estados de espera mantem a estrutura do portal e evitam transicoes confusas."
          />
          <PremiumFeatureCard
            eyebrow="Confianca"
            title="Experiencia segura"
            description="Quando algo demora, o portal continua honesto sobre o que esta preparando."
          />
        </div>
      </main>
    </div>
  );
}
