import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import {
  getArticlesByTopic,
  getEditorialTopicSummary,
  getNextBestArticles
} from "@/lib/site/article-content";
import {
  getEditorialServicePageBySlug,
  getEditorialServicePages
} from "@/lib/site/editorial-taxonomy";
import { buildPublicCanonicalUrl, buildPublicMetadata } from "@/lib/site/seo";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getEditorialServicePages().map((page) => ({
    slug: page.slug
  }));
}

export async function generateMetadata({
  params
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getEditorialServicePageBySlug(slug);

  if (!page) {
    return {};
  }

  return buildPublicMetadata({
    title: page.title,
    description: page.description,
    path: page.href
  });
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const servicePage = getEditorialServicePageBySlug(slug);

  if (!servicePage) {
    notFound();
  }

  const topicSummary = getEditorialTopicSummary(servicePage.topic);
  const clusterArticles = getArticlesByTopic(servicePage.topic);
  const nextReads =
    clusterArticles.length > 0 ? getNextBestArticles(clusterArticles[0], 2) : [];
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: servicePage.title,
    description: servicePage.description,
    areaServed: "Brasil",
    url: buildPublicCanonicalUrl(servicePage.href),
    serviceType: servicePage.title,
    knowsAbout: servicePage.subtopics
  };

  return (
    <>
      <ProductEventBeacon
        eventKey="strategic_content_viewed"
        eventGroup="content"
        payload={{
          entryPoint: "service_page",
          topic: servicePage.topic,
          contentId: servicePage.slug,
          contentStage: "decision"
        }}
        oncePerSession
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <AppFrame
        eyebrow="Pagina de entrada"
        title={servicePage.title}
        description={servicePage.longDescription}
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/atuacao", label: "Atuacao" },
          { href: servicePage.href, label: topicSummary?.label || "Area", active: true }
        ]}
        highlights={[
          { label: "Tema", value: topicSummary?.label || servicePage.topic },
          { label: "Artigos no cluster", value: String(clusterArticles.length) },
          { label: "Busca principal", value: servicePage.primaryIntent },
          { label: "Conversao", value: "Triagem orientada" }
        ]}
        actions={[
          {
            href: servicePage.triageHref,
            label: servicePage.conversionCtaLabel,
            trackingEventKey: "cta_start_triage_clicked",
            trackingPayload: {
              location: "service_page_hero",
              topic: servicePage.topic,
              contentId: servicePage.slug
            }
          },
          {
            href: servicePage.hubHref,
            label: "Ver hub editorial",
            tone: "secondary",
            trackingEventKey: "article_hub_cta_clicked",
            trackingPayload: {
              location: "service_page_hero",
              topic: servicePage.topic,
              contentId: servicePage.slug
            }
          }
        ]}
      >
        <div className="grid two">
          <SectionCard
            title="Quando esta pagina faz sentido"
            description="A entrada foi desenhada para responder busca com mais intencao, sem depender de artigo isolado para converter."
          >
            <div className="summary-grid">
              <div className="summary-card">
                <span>Busca principal</span>
                <strong>{servicePage.primaryIntent}</strong>
                <p>{servicePage.description}</p>
              </div>
              <div className="summary-card">
                <span>Busca assistida</span>
                <strong>{servicePage.secondaryIntent}</strong>
                <p>Essa pagina liga leitura investigativa e decisao sem obrigar o visitante a passar por um funil artesanal.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Sinais de autoridade"
            description="Os subtemas e artigos do cluster deixam claro o recorte editorial e reduzem dispersao semantica."
          >
            <ul className="priority-list">
              {servicePage.authoritySignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard
          title="Subtemas que estruturam este cluster"
          description="A taxonomia passa a ditar como crescer a area sem virar catalogo manual de paginas soltas."
        >
          <div className="article-index-grid">
            {servicePage.subtopics.map((subtopic) => (
              <article key={subtopic} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{topicSummary?.label || servicePage.topic}</span>
                  <span className="tag soft">subtema</span>
                </div>
                <strong>{subtopic}</strong>
                <p>
                  Use este subtema como criterio para novos artigos, reforcos de interlinking e novas entradas editoriais desta area.
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="grid two">
          <SectionCard
            title="Artigos do cluster"
            description="O hub editorial deixa de ser uma ilha: esta pagina aponta para os artigos que ajudam a aprofundar o tema."
          >
            <div className="article-related-list">
              {clusterArticles.map((article) => (
                <TrackedLink
                  key={article.slug}
                  href={`/artigos/${article.slug}`}
                  className="route-card"
                  eventKey="strategic_content_cta_clicked"
                  trackingPayload={{
                    location: "service_page_cluster",
                    topic: article.topic,
                    contentId: article.slug
                  }}
                >
                  <span className="shortcut-kicker">{article.categoryLabel}</span>
                  <strong>{article.title}</strong>
                  <span>{article.excerpt}</span>
                </TrackedLink>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Proximo passo"
            description="A conversao aqui e elegante: ou o visitante aprofunda pelo hub, ou organiza o caso na triagem."
          >
            <div className="cta-strip">
              <strong>Use esta pagina como ponto de entrada e o hub como aprofundamento.</strong>
              <p>Assim a jornada fica coerente entre busca, leitura e captura, sem competir com a home nem criar CTA agressivo demais.</p>
              <div className="form-actions">
                <TrackedLink
                  href={servicePage.triageHref}
                  className="button"
                  eventKey="cta_start_triage_clicked"
                  trackingPayload={{
                    location: "service_page_footer",
                    topic: servicePage.topic,
                    contentId: servicePage.slug
                  }}
                >
                  {servicePage.conversionCtaLabel}
                </TrackedLink>
                <TrackedLink
                  href={servicePage.hubHref}
                  className="button secondary"
                  eventKey="article_hub_cta_clicked"
                  trackingPayload={{
                    location: "service_page_footer",
                    topic: servicePage.topic,
                    contentId: servicePage.slug
                  }}
                >
                  Ir para o hub
                </TrackedLink>
              </div>
            </div>
          </SectionCard>
        </div>

        {nextReads.length ? (
          <SectionCard
            title="Leituras recomendadas"
            description="Proximas leituras para empurrar o tema do interesse inicial para um caso mais bem qualificado."
          >
            <div className="article-related-list">
              {nextReads.map((article) => (
                <TrackedLink
                  key={article.slug}
                  href={`/artigos/${article.slug}`}
                  className="route-card"
                  eventKey="strategic_content_cta_clicked"
                  trackingPayload={{
                    location: "service_page_next_reads",
                    topic: article.topic,
                    contentId: article.slug
                  }}
                >
                  <span className="shortcut-kicker">{article.categoryLabel}</span>
                  <strong>{article.title}</strong>
                  <span>{article.excerpt}</span>
                </TrackedLink>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <ContextualConversionPanel
          surface="article_hub"
          topic={servicePage.topic}
          contentId={servicePage.slug}
          contentStage="decision"
          primaryHref={servicePage.triageHref}
          secondaryHref="/#atendimento"
          location="service_page_contextual_footer"
        />
      </AppFrame>
    </>
  );
}
